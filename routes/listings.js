const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getUserNFTsForListing,
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getUserListings
} = require('../controllers/listingController');

// Get user's NFTs that can be listed (not already listed)
router.get('/my-nfts', protect, getUserNFTsForListing);

// Create new listing (sell or rent)
router.post('/', protect, createListing);

// Get all listings with filters
router.get('/', getListings);

// Get user's listings
router.get('/user/my-listings', protect, getUserListings);

// Update listing
router.put('/:id', protect, updateListing);

// Delete listing
router.delete('/:id', protect, deleteListing);

// Get specific listing (place after more specific routes)
router.get('/:id', getListing);

module.exports = router;