const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { syncRental } = require('../controllers/rentalController');

// Sync rental state based on on-chain data (requires auth to limit abuse)
router.post('/sync', protect, syncRental);

module.exports = router;
