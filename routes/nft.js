const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getOwnedNFTs,
  getRentedNFTs,
  getNFTDetails,
  addNFTToCollection
} = require('../controllers/nftController');

// Protected routes
router.get('/owned', protect, getOwnedNFTs);
router.get('/rented', protect, getRentedNFTs);
router.get('/:id', protect, getNFTDetails);
router.post('/add', protect, addNFTToCollection);

module.exports = router;