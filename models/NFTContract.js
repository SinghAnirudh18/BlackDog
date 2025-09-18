const mongoose = require('mongoose');

const NFTContractSchema = new mongoose.Schema({
  // Contract address
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // Contract details
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  
  // Contract standards
  type: {
    type: String,
    enum: ['ERC721', 'ERC1155', 'ERC4907'],
    default: 'ERC721'
  },
  supportsERC4907: {
    type: Boolean,
    default: false
  },
  
  // Contract metadata
  description: String,
  image: String,
  external_url: String,
  banner_image: String,
  
  // Social links
  socials: {
    website: String,
    twitter: String,
    discord: String,
    telegram: String,
    instagram: String
  },
  
  // Verification status
  verified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  
  // Statistics
  totalSupply: Number,
  numOwners: Number,
  floorPrice: Number,
  volumeTraded: Number,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Indexes for better performance
  indexedAt: Date
});

// Pre-save middleware to update timestamps
NFTContractSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
NFTContractSchema.index({ address: 1 });
NFTContractSchema.index({ verified: 1 });
NFTContractSchema.index({ type: 1 });

module.exports = mongoose.model('NFTContract', NFTContractSchema);