const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Simple JSON-file-backed datastore to replace MongoDB for demo purposes
// Collections: users, nfts, listings, nftcontracts
// NOTE: This is not production-grade. It is single-writer and in-memory with periodic flush.

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'datastore.json');

const state = {
  loaded: false,
  data: {
    users: [],
    nfts: [],
    listings: [],
    nftcontracts: [],
  },
};

function ensureLoaded() {
  if (state.loaded) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    try {
      const parsed = JSON.parse(raw);
      state.data = Object.assign(state.data, parsed);
    } catch (e) {
      console.warn('datastore: failed to parse existing file, starting fresh');
    }
  }
  state.loaded = true;
}

function flush() {
  ensureLoaded();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state.data, null, 2), 'utf8');
}

function getCollection(name) {
  ensureLoaded();
  if (!state.data[name]) state.data[name] = [];
  return state.data[name];
}

function match(obj, filter = {}) {
  // Very simple filter matcher; supports equality, nested fields (a.b),
  // $regex, $in, and range on strings via $gte/$lte (used in code for price strings)
  return Object.entries(filter).every(([key, val]) => {
    if (key === '$or' && Array.isArray(val)) {
      return val.some((sub) => match(obj, sub));
    }
    const actual = getByPath(obj, key);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if ('$regex' in val) {
        const re = val.$regex instanceof RegExp ? val.$regex : new RegExp(val.$regex, val.$options || '');
        return typeof actual === 'string' && re.test(actual);
      }
      if ('$in' in val) {
        return val.$in.includes(actual);
      }
      if ('$gte' in val || '$lte' in val) {
        const a = actual;
        if ('$gte' in val && !(a >= val.$gte)) return false;
        if ('$lte' in val && !(a <= val.$lte)) return false;
        return true;
      }
      // nested object compare
      return Object.entries(val).every(([k2, v2]) => match(actual || {}, { [k2]: v2 }));
    }
    if (Array.isArray(actual)) {
      // For tags: { tags: { $in: [regex] } } is handled above; also allow direct includes
      return actual.includes(val);
    }
    return actual === val;
  });
}

function getByPath(obj, pathStr) {
  return pathStr.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}

function create(collection, doc) {
  const coll = getCollection(collection);
  const now = new Date();
  const toInsert = { _id: randomUUID(), createdAt: now, updatedAt: now, ...doc };
  coll.push(toInsert);
  flush();
  return toInsert;
}

function updateById(collection, id, updates) {
  const coll = getCollection(collection);
  const idx = coll.findIndex((d) => d._id === id);
  if (idx === -1) return null;
  coll[idx] = { ...coll[idx], ...updates, updatedAt: new Date() };
  flush();
  return coll[idx];
}

function deleteById(collection, id) {
  const coll = getCollection(collection);
  const idx = coll.findIndex((d) => d._id === id);
  if (idx === -1) return false;
  coll.splice(idx, 1);
  flush();
  return true;
}

function findById(collection, id) {
  const coll = getCollection(collection);
  return coll.find((d) => d._id === id) || null;
}

function findOne(collection, filter) {
  const coll = getCollection(collection);
  return coll.find((d) => match(d, filter)) || null;
}

function find(collection, filter = {}, options = {}) {
  const coll = getCollection(collection);
  let results = coll.filter((d) => match(d, filter));
  // sort
  if (options.sort) {
    const [[field, order]] = Object.entries(options.sort);
    results = results.sort((a, b) => {
      const av = getByPath(a, field);
      const bv = getByPath(b, field);
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (order === -1 ? -1 : 1);
    });
  }
  // pagination
  const skip = options.skip || 0;
  const limit = options.limit || results.length;
  return results.slice(skip, skip + limit);
}

function countDocuments(collection, filter = {}) {
  const coll = getCollection(collection);
  return coll.filter((d) => match(d, filter)).length;
}

module.exports = {
  create,
  updateById,
  deleteById,
  findById,
  findOne,
  find,
  countDocuments,
  flush,
};
