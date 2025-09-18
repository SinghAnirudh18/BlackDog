const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  // Basic information
  nft: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NFT',
    required: true
  },
  owner: {
    type: String, // Wallet address
    required: true,
    lowercase: true
  },
  
  // Listing type and status
  type: {
    type: String,
    enum: ['sale', 'rental'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'sold', 'rented'],
    default: 'active'
  },
  
  // Pricing information
  price: {
    type: String, // In wei
    required: true
  },
  currency: {
    type: String,
    default: 'ETH'
  },
  
  // Rental-specific fields
  rental: {
    minDuration: { // in seconds
      type: Number,
      required: function() { return this.type === 'rental'; }
    },
    maxDuration: { // in seconds
      type: Number,
      required: function() { return this.type === 'rental'; }
    },
    pricePerDay: String, // For display purposes
    securityDeposit: String, // Optional security deposit
    instantRental: {
      type: Boolean,
      default: false
    }
  },
  
  // Sale-specific fields
  sale: {
    auction: {
      type: Boolean,
      default: false
    },
    auctionEnd: Date,
    minimumBid: String,
    buyNowPrice: String
  },
  
  // Listing details
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 2000
  },
  tags: [String],
  category: {
    type: String,
    enum: ['art', 'gaming', 'collectibles', 'utility', 'virtual-land', 'other'],
    default: 'other'
  },
  
  // Visibility and preferences
  featured: {
    type: Boolean,
    default: false
  },
  promoted: {
    type: Boolean,
    default: false
  },
  showOwner: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  offers: [{
    user: String,
    price: String,
    duration: Number, // For rentals
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date // Optional auto-expiry
});

// Indexes for better performance
ListingSchema.index({ owner: 1 });
ListingSchema.index({ type: 1, status: 1 });
ListingSchema.index({ category: 1 });
ListingSchema.index({ createdAt: -1 });
ListingSchema.index({ price: 1 });
ListingSchema.index({ 'rental.minDuration': 1 });

// Pre-save middleware
ListingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to check if listing is active
ListingSchema.methods.isActive = function() {
  return this.status === 'active' && (!this.expiresAt || this.expiresAt > new Date());
};

// Method to increment views
ListingSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Listing', ListingSchema);