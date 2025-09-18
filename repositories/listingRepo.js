const store = require('../services/datastore');

const COLLECTION = 'listings';

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

function deleteById(id) {
  return store.deleteById(COLLECTION, id);
}

function find(filter = {}, options = {}) {
  return store.find(COLLECTION, filter, options);
}

function countDocuments(filter = {}) {
  return store.countDocuments(COLLECTION, filter);
}

module.exports = {
  findById,
  findOne,
  create,
  updateById,
  deleteById,
  find,
  countDocuments,
};
