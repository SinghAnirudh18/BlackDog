const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nftRoutes = require('./routes/nft');
const listingRoutes = require('./routes/listings');
const rentalRoutes = require('./routes/rentals');
const nftRepo = require('./repositories/nftRepo');
const { syncRentalFor } = require('./controllers/rentalController');

require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');

// MongoDB connection removed (using IPFS + JSON datastore)

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Auth routes already registered above
app.use('/api/nft', nftRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/rentals', rentalRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// 404 handler


// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Optional periodic rental sync (keeps user lists in sync after expiry)
// Disable by setting ENABLE_RENTAL_SYNC=false
const enableSync = (process.env.ENABLE_RENTAL_SYNC || 'true') !== 'false';
const syncInterval = parseInt(process.env.RENTAL_SYNC_INTERVAL_MS || '60000', 10);

if (enableSync) {
  setInterval(async () => {
    try {
      const nfts = await nftRepo.find({}, {});
      for (const nft of nfts) {
        if (!nft || !nft.contractAddress || !nft.tokenId) continue;
        await syncRentalFor(nft.contractAddress, nft.tokenId);
      }
    } catch (e) {
      console.warn('Periodic rental sync error:', e?.message || e);
    }
  }, syncInterval);
  console.log(`[rental-sync] enabled every ${syncInterval}ms`);
}

//ipfs pinata toolkit