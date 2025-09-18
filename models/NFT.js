const mongoose = require('mongoose');

const NFTSchema = new mongoose.Schema({
  // Basic identification
  tokenId: {
    type: String,
    required: true
  },
  contractAddress: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  
  // Reference to contract
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NFTContract',
    required: true
  },
  
  // Ownership information
  owner: {
    type: String, // Wallet address
    required: true,
    lowercase: true,
    trim: true
  },
  creator: {
    type: String, // Wallet address
    lowercase: true,
    trim: true
  },
  
  // NFT metadata (from tokenURI)
  metadata: {
    name: {
      type: String,
      required: true
    },
    description: String,
    image: String,
    image_url: String,
    animation_url: String,
    external_url: String,
    background_color: String,
    
    // Attributes/traits
    attributes: [{
      trait_type: String,
      value: mongoose.Schema.Types.Mixed, // Can be string, number, etc.
      display_type: String // Can be 'number', 'boost_percentage', 'boost_number', etc.
    }],
    
    // Properties for different standards
    properties: mongoose.Schema.Types.Mixed,
    levels: [{
      name: String,
      value: Number,
      max_value: Number
    }],
    stats: [{
      name: String,
      value: Number,
      max_value: Number
    }],
    
    // Royalty information
    royalties: [{
      recipient: String,
      value: Number // Percentage (e.g., 10 for 10%)
    }],
    
    // Locked content (if any)
    encrypted: Boolean,
    encrypted_data: String
  },
  
  // Marketplace status
  isListed: {
    type: Boolean,
    default: false
  },
  listingType: {
    type: String,
    enum: ['sale', 'rental', 'auction', null],
    default: null
  },
  listingPrice: String, // In wei or native token
  
  // Rental specific fields
  rental: {
    isRented: {
      type: Boolean,
      default: false
    },
    currentRenter: String, // Wallet address
    rentalStart: Date,
    rentalEnd: Date,
    rentalPrice: String, // Price per day/week in wei
    minDuration: Number, // Minimum rental duration in seconds
    maxDuration: Number  // Maximum rental duration in seconds
  },
  
  // Transaction history
  lastSale: {
    price: String,
    from: String,
    to: String,
    date: Date,
    txHash: String
  },
  
  // Provenance and history
  creationDate: Date,
  mintTransaction: String,
  mintPrice: String,
  
  // Media information
  media: {
    type: {
      type: String,
      enum: ['image', 'video', 'audio', '3d', 'html', 'other'],
      default: 'image'
    },
    format: String,
    size: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    duration: Number // For video/audio
  },
  
  // Verification and validation
  metadataVerified: {
    type: Boolean,
    default: false
  },
  authenticityScore: Number,
  reported: {
    type: Boolean,
    default: false
  },
  
  // Social and engagement
  likes: [{
    user: String, // Wallet address
    date: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  favorites: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: Date,
  
  // Index for better query performance
  indexedAt: Date
});

// Pre-save middleware to update timestamps
NFTSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastUpdated = new Date();
  next();
});

// Compound indexes for better query performance
NFTSchema.index({ contractAddress: 1, tokenId: 1 }, { unique: true });
NFTSchema.index({ owner: 1 });
NFTSchema.index({ contractAddress: 1 });
NFTSchema.index({ 'rental.isRented': 1 });
NFTSchema.index({ isListed: 1, listingType: 1 });
NFTSchema.index({ 'metadata.name': 'text', 'metadata.description': 'text' });

// Virtual for unique identifier
NFTSchema.virtual('identifier').get(function() {
  return `${this.contractAddress}:${this.tokenId}`;
});

// Method to check if NFT is available for rent
NFTSchema.methods.isAvailableForRent = function() {
  return this.isListed && 
         this.listingType === 'rental' && 
         !this.rental.isRented;
};

// Method to check if user owns this NFT
NFTSchema.methods.isOwnedBy = function(walletAddress) {
  return this.owner.toLowerCase() === walletAddress.toLowerCase();
};

// Method to get rental status
NFTSchema.methods.getRentalStatus = function() {
  if (!this.rental.isRented) return 'available';
  if (this.rental.rentalEnd < new Date()) return 'expired';
  return 'rented';
};

module.exports = mongoose.model('NFT', NFTSchema);