const bcrypt = require('bcrypt');
const store = require('../services/datastore');

const COLLECTION = 'users';

function sanitize(user) {
  if (!user) return null;
  const { password, verificationToken, resetPasswordToken, resetPasswordExpires, ...rest } = user;
  return rest;
}

async function createUser({ email, password, username, walletAddress, profile = {} }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = store.create(COLLECTION, {
    email: email.toLowerCase(),
    password: passwordHash,
    username,
    walletAddress,
    profile,
    emailVerified: false,
    ownedNFTs: [],
    rentedNFTs: [],
    nftStats: {
      totalOwned: 0,
      totalListed: 0,
      totalRented: 0,
      totalRentedOut: 0,
      portfolioValue: 0,
      totalEarnings: 0,
      totalSpent: 0,
    },
    collections: [],
    favoriteNFTs: [],
    favoriteCollections: [],
    watchlist: [],
  });
  return user;
}

function findById(id) {
  return store.findById(COLLECTION, id);
}

function findOne(filter) {
  return store.findOne(COLLECTION, filter);
}

async function comparePassword(user, candidatePassword) {
  return bcrypt.compare(candidatePassword, user.password);
}

function save(user) {
  return store.updateById(COLLECTION, user._id, user);
}

module.exports = {
  createUser,
  findById,
  findOne,
  comparePassword,
  save,
  sanitize,
};
