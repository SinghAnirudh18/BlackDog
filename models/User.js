const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  // Authentication fields
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  walletAddress: {
    type: String,
    sparse: true // Allows null values while maintaining uniqueness
  },
  
  // Profile information
  profile: {
    firstName: {
      type: String,
      trim: true
    },
    lastName: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      maxlength: 500
    },
    avatar: {
      type: String,
      default: ''
    },
    socialLinks: {
      twitter: String,
      website: String,
      discord: String
    }
  },
  
  // Verification fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  ownedNFTs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NFT'
  }],
  
  rentedNFTs: [{
    nft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NFT'
    },
    rentalStart: Date,
    rentalEnd: Date,
    rentalPrice: String,
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active'
    },
    txHash: String
  }],
  
  // NFT Statistics
  nftStats: {
    totalOwned: {
      type: Number,
      default: 0
    },
    totalListed: {
      type: Number,
      default: 0
    },
    totalRented: {
      type: Number,
      default: 0
    },
    totalRentedOut: {
      type: Number,
      default: 0
    },
    portfolioValue: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  },
  
  // Collections owned/created
  collections: [{
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NFTContract'
    },
    role: {
      type: String,
      enum: ['creator', 'owner', 'collaborator'],
      default: 'owner'
    }
  }],
  
  // Favorites
  favoriteNFTs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NFT'
  }],
  
  favoriteCollections: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NFTContract'
  }],
  
  // Watchlist for specific NFTs
  watchlist: [{
    nft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NFT'
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    priceAlert: Number // Alert when price drops below this
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }

});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.verificationToken;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  return user;
};
UserSchema.methods.addOwnedNFT = function(nftId) {
  if (!this.ownedNFTs.includes(nftId)) {
    this.ownedNFTs.push(nftId);
    this.nftStats.totalOwned += 1;
  }
};

// Method to remove NFT from owned collection
UserSchema.methods.removeOwnedNFT = function(nftId) {
  const index = this.ownedNFTs.indexOf(nftId);
  if (index > -1) {
    this.ownedNFTs.splice(index, 1);
    this.nftStats.totalOwned = Math.max(0, this.nftStats.totalOwned - 1);
  }
};

// Method to add rental
UserSchema.methods.addRental = function(rentalData) {
  this.rentedNFTs.push(rentalData);
  this.nftStats.totalRented += 1;
};

// Method to update rental status
UserSchema.methods.updateRentalStatus = function(rentalIndex, status) {
  if (this.rentedNFTs[rentalIndex]) {
    this.rentedNFTs[rentalIndex].status = status;
    if (status === 'completed') {
      this.nftStats.totalRented = Math.max(0, this.nftStats.totalRented - 1);
    }
  }
};

// Method to check if user owns an NFT
UserSchema.methods.ownsNFT = function(nftId) {
  return this.ownedNFTs.includes(nftId);
};

// Method to check if user is renting an NFT
UserSchema.methods.isRentingNFT = function(nftId) {
  return this.rentedNFTs.some(rental => 
    rental.nft.equals(nftId) && rental.status === 'active'
  );
};
module.exports = mongoose.model('User', UserSchema);