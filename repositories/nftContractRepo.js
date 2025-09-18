const store = require('../services/datastore');

const COLLECTION = 'nftcontracts';

function findOne(filter) {
  return store.findOne(COLLECTION, filter);
}

function create(doc) {
  return store.create(COLLECTION, doc);
}

function updateById(id, updates) {
  return store.updateById(COLLECTION, id, updates);
}

module.exports = {
  findOne,
  create,
  updateById,
};
