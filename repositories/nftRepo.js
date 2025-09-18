const store = require('../services/datastore');

const COLLECTION = 'nfts';

function findById(id) {
  return store.findById(COLLECTION, id);
}

function findOne(filter) {
  return store.findOne(COLLECTION, filter);
}

function create(doc) {
  return store.create(COLLECTION, doc);
}

function updateById(id, updates) {
  return store.updateById(COLLECTION, id, updates);
}

function find(filter = {}, options = {}) {
  return store.find(COLLECTION, filter, options);
}

module.exports = {
  findById,
  findOne,
  create,
  updateById,
  find,
};
