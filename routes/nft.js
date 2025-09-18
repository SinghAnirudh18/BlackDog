const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  verifyNFT,
  getNFTByContract,
  getUserNFTs,
  quickVerify,
  getOwnedNFTs,
  getRentedNFTs,
  getNFTDetails,
  addNFTToCollection
} = require('../controllers/nftController');

// Verify NFT ownership and fetch details (requires auth)
router.post('/verify', protect, verifyNFT);

// Quick verify (no auth required - for public checking)
router.post('/verify-quick', quickVerify);

// Get NFT by contract address and token ID
router.get('/contract/:contractAddress/:tokenId', protect, getNFTByContract);

// Get user's NFTs with filtering
router.get('/user', protect, getUserNFTs);
router.get('/user/:filter', protect, getUserNFTs);

// Existing routes
router.get('/owned', protect, getOwnedNFTs);
router.get('/rented', protect, getRentedNFTs);
router.get('/:id', protect, getNFTDetails);
router.post('/add', protect, addNFTToCollection);

module.exports = router;