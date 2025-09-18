const listingRepo = require('../repositories/listingRepo');
const nftRepo = require('../repositories/nftRepo');
const userRepo = require('../repositories/userRepo');

// Get user's NFTs that are available for listing (not already listed)
const getUserNFTsForListing = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Load the user's owned NFTs and filter those without active listings
    const owned = Array.isArray(user.ownedNFTs) ? user.ownedNFTs : [];
    const ownedNfts = await Promise.all(owned.map((id) => nftRepo.findById(id))).then(arr => arr.filter(Boolean));
    const availableNFTs = [];
    for (const nft of ownedNfts) {
      const existingListing = await listingRepo.findOne({ nft: nft._id, status: 'active' });
      if (!existingListing) {
        availableNFTs.push({
          _id: nft._id,
          tokenId: nft.tokenId,
          contractAddress: nft.contractAddress,
          metadata: nft.metadata,
          contract: nft.contract, // may be undefined; frontend should handle
        });
      }
    }

    res.json({
      success: true,
      data: {
        availableNFTs,
        totalAvailable: availableNFTs.length,
        totalOwned: user.ownedNFTs.length
      }
    });

  } catch (error) {
    console.error('Get available NFTs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Create listing with comprehensive options
const createListing = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userRepo.findById(userId);

    const {
      nftId,
      listingType, // 'sale' or 'rental'
      price, // in ETH or wei
      currency = 'ETH',

      // Sale options
      isAuction = false,
      auctionEndDate,
      reservePrice,
      buyNowPrice,

      // Rental options
      minRentalDays = 1,
      maxRentalDays = 30,
      securityDeposit,
      instantBooking = true,

      // Listing details
      title,
      description,
      category = 'other',
      tags = []
    } = req.body;

    // Validate required fields
    if (!nftId || !listingType || !price) {
      return res.status(400).json({
        success: false,
        message: 'NFT ID, listing type, and price are required'
      });
    }

    // Verify NFT ownership
    const nft = await nftRepo.findById(nftId);

    if (!nft || nft.owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'You do not own this NFT'
      });
    }

    // Check if NFT is already listed
    const existingListing = await listingRepo.findOne({ nft: nftId, status: 'active' });

    if (existingListing) {
      return res.status(400).json({
        success: false,
        message: 'This NFT is already listed'
      });
    }

    // Validate rental-specific fields
    if (listingType === 'rental') {
      if (!minRentalDays || !maxRentalDays) {
        return res.status(400).json({
          success: false,
          message: 'Minimum and maximum rental days are required for rentals'
        });
      }
      if (minRentalDays > maxRentalDays) {
        return res.status(400).json({
          success: false,
          message: 'Minimum rental days cannot be greater than maximum rental days'
        });
      }
      if (minRentalDays < 1) {
        return res.status(400).json({
          success: false,
          message: 'Minimum rental days must be at least 1'
        });
      }
    }

    // Validate auction-specific fields
    if (listingType === 'sale' && isAuction) {
      if (!auctionEndDate) {
        return res.status(400).json({
          success: false,
          message: 'Auction end date is required for auction listings'
        });
      }
      if (new Date(auctionEndDate) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Auction end date must be in the future'
        });
      }
    }

    // Prepare listing data
    const listingData = {
      nft: nftId,
      owner: user.walletAddress,
      type: listingType,
      price: price.toString(),
      currency,
      title: title || nft.metadata.name,
      description: description || nft.metadata.description || '',
      category,
      tags: Array.isArray(tags) ? tags : []
    };

    // Add rental-specific data
    if (listingType === 'rental') {
      listingData.rental = {
        minDuration: minRentalDays * 86400,
        maxDuration: maxRentalDays * 86400,
        pricePerDay: (parseFloat(price) / 30).toFixed(6),
        securityDeposit: securityDeposit || '0',
        instantRental: instantBooking
      };
    }

    // Add sale-specific data
    if (listingType === 'sale') {
      listingData.sale = {
        auction: isAuction,
        auctionEnd: isAuction ? new Date(auctionEndDate) : null,
        minimumBid: isAuction ? (reservePrice || price).toString() : null,
        buyNowPrice: isAuction ? (buyNowPrice || price).toString() : price.toString()
      };

      // Set expiration for auctions
      if (isAuction) {
        listingData.expiresAt = new Date(auctionEndDate);
      }
    }

    // Create listing
    const listing = await listingRepo.create(listingData);

    // Update NFT status
    const rentalUpdate = listingType === 'rental' ? {
      rental: {
        ...(nft.rental || {}),
        minDuration: minRentalDays * 86400,
        maxDuration: maxRentalDays * 86400,
        rentalPrice: price.toString(),
      }
    } : {};
    await nftRepo.updateById(nft._id, {
      isListed: true,
      listingType: listingType,
      listingPrice: price.toString(),
      ...rentalUpdate,
    });

    // Update user stats
    if (!user.nftStats) user.nftStats = { totalOwned: 0, totalListed: 0, totalRented: 0, totalRentedOut: 0, portfolioValue: 0, totalEarnings: 0, totalSpent: 0 };
    user.nftStats.totalListed += 1;
    await userRepo.save(user);

    // Populate the listing for response
    const populatedListingNft = await nftRepo.findById(listing._id ? listing.nft : nftId);
    const populatedListing = {
      ...listing,
      nft: populatedListingNft,
    };

    res.status(201).json({
      success: true,
      message: `NFT listed for ${listingType} successfully`,
      data: { listing: populatedListing }
    });

  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all listings with filters
const getListings = async (req, res) => {
  try {
    const {
      type,
      category,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      search,
      owner
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (owner) filter.owner = owner.toLowerCase();

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice).toString();
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice).toString();
    }

    // Search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Pagination
    const skip = (page - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    // Fetch, sort, and paginate via repository
    const listingsRaw = await listingRepo.find(filter, { sort: sortOptions });
    const total = await listingRepo.countDocuments(filter);
    const listingsPage = listingsRaw.slice(skip, skip + parseInt(limit));
    // Attach NFT records
    const listings = await Promise.all(listingsPage.map(async (l) => ({
      ...l,
      nft: await nftRepo.findById(l.nft),
    })));

    res.json({
      success: true,
      data: {
        listings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          type,
          category,
          minPrice,
          maxPrice,
          search
        }
      }
    });

  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get listing by ID
const getListing = async (req, res) => {
  try {
    const { id } = req.params;

    const listing = await listingRepo.findById(id);
    const nft = listing ? await nftRepo.findById(listing.nft) : null;

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Increment views
    await listingRepo.updateById(id, { views: (listing.views || 0) + 1 });

    res.json({
      success: true,
      data: { listing }
    });

  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update listing
const updateListing = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updates = req.body;

    const listing = await listingRepo.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Verify ownership
    const user = await userRepo.findById(userId);
    if (listing.owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing'
      });
    }

    // Prevent updating certain fields
    const allowedUpdates = [
      'price', 'title', 'description', 'category', 'tags',
      'rental.minDuration', 'rental.maxDuration', 'rental.securityDeposit',
      'rental.instantRental', 'sale.auctionEnd', 'sale.minimumBid',
      'sale.buyNowPrice', 'status'
    ];

    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Update listing
    await listingRepo.updateById(id, filteredUpdates);
    const updated = await listingRepo.findById(id);
    const updatedListing = { ...updated, nft: await nftRepo.findById(updated.nft) };

    // Update NFT if price changed
    if (updates.price && updatedListing.nft) {
      await nftRepo.updateById(updatedListing.nft._id, { listingPrice: updates.price.toString() });
    }

    res.json({
      success: true,
      message: 'Listing updated successfully',
      data: { listing: updatedListing }
    });

  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete listing
const deleteListing = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const listing = await listingRepo.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Verify ownership
    const user = await userRepo.findById(userId);
    if (listing.owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    // Update NFT status
    const nft = await nftRepo.findById(listing.nft);
    if (nft) {
      const rentalReset = listing.type === 'rental' ? {
        rental: {
          ...(nft.rental || {}),
          minDuration: null,
          maxDuration: null,
          rentalPrice: null,
        }
      } : {};
      await nftRepo.updateById(nft._id, {
        isListed: false,
        listingType: null,
        listingPrice: null,
        ...rentalReset,
      });
    }

    // Delete listing
    await listingRepo.deleteById(id);

    // Update user stats
    if (!user.nftStats) user.nftStats = { totalOwned: 0, totalListed: 0, totalRented: 0, totalRentedOut: 0, portfolioValue: 0, totalEarnings: 0, totalSpent: 0 };
    user.nftStats.totalListed = Math.max(0, user.nftStats.totalListed - 1);
    await userRepo.save(user);

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's listings
const getUserListings = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userRepo.findById(userId);

    const { status, type, page = 1, limit = 20 } = req.query;

    const filter = { owner: user.walletAddress.toLowerCase() };
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (page - 1) * parseInt(limit);

    const all = await listingRepo.find(filter, { sort: { createdAt: -1 } });
    const total = all.length;
    const listings = all.slice(skip, skip + parseInt(limit));
    const stats = {
      total: await listingRepo.countDocuments({ owner: user.walletAddress.toLowerCase() }),
      active: await listingRepo.countDocuments({ owner: user.walletAddress.toLowerCase(), status: 'active' }),
      sold: await listingRepo.countDocuments({ owner: user.walletAddress.toLowerCase(), status: 'sold' }),
      rented: await listingRepo.countDocuments({ owner: user.walletAddress.toLowerCase(), status: 'rented' }),
      inactive: await listingRepo.countDocuments({ owner: user.walletAddress.toLowerCase(), status: 'inactive' })
    };

    res.json({
      success: true,
      data: {
        listings,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Toggle listing status (active/inactive)
const toggleListingStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const listing = await listingRepo.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Verify ownership
    const user = await userRepo.findById(userId);
    if (listing.owner.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this listing'
      });
    }

    const newStatus = listing.status === 'active' ? 'inactive' : 'active';
    await listingRepo.updateById(id, { status: newStatus });
    const updated = await listingRepo.findById(id);
    const updatedListing = { ...updated, nft: await nftRepo.findById(updated.nft) };

    // Update NFT status
    await nftRepo.updateById(listing.nft, { isListed: newStatus === 'active' });

    res.json({
      success: true,
      message: `Listing ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: { listing: updatedListing }
    });

  } catch (error) {
    console.error('Toggle listing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getUserNFTsForListing,
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getUserListings,
  toggleListingStatus
};