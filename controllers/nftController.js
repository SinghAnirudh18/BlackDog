const userRepo = require('../repositories/userRepo');
const nftRepo = require('../repositories/nftRepo');
const nftContractRepo = require('../repositories/nftContractRepo');
const nftVerificationService = require('../services/nftVerification');

// Verify NFT ownership and get details
const verifyNFT = async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.body;
    const userId = req.userId;

    if (!contractAddress || !tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Contract address and token ID are required',
        code: 'MISSING_PARAMS'
      });
    }

    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const result = await nftVerificationService.verifyAndFetchNFT(
      contractAddress,
      tokenId,
      user.walletAddress
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        currentOwner: result.currentOwner
      });
    }

    // Add NFT to user's owned NFTs if not already there
    if (!Array.isArray(user.ownedNFTs)) user.ownedNFTs = [];
    if (!user.ownedNFTs.includes(result.data.nft._id)) {
      user.ownedNFTs.push(result.data.nft._id);
      if (!user.nftStats) user.nftStats = { totalOwned: 0, totalListed: 0, totalRented: 0, totalRentedOut: 0, portfolioValue: 0, totalEarnings: 0, totalSpent: 0 };
      user.nftStats.totalOwned += 1;
      await userRepo.save(user);
    }

    res.json({
      success: true,
      message: 'NFT verified successfully',
      data: result.data
    });

  } catch (error) {
    console.error('NFT verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

// Get NFT details by contract address and token ID (MAIN ENDPOINT FOR YOUR USE CASE)
const getNFTByContract = async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.params;
    const userId = req.userId;

    if (!contractAddress || !tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Contract address and token ID are required'
      });
    }

    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get NFT details and verify ownership
    const result = await nftVerificationService.verifyAndFetchNFT(
      contractAddress,
      tokenId,
      user.walletAddress
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        currentOwner: result.currentOwner
      });
    }

    // Check if user owns this NFT
    const isOwner = result.data.owner.toLowerCase() === user.walletAddress.toLowerCase();
    const canList = isOwner && !result.data.isListed;
    const canRent = result.data.contract.type === 'ERC4907' && isOwner;

    res.json({
      success: true,
      message: 'NFT details retrieved successfully',
      data: {
        nft: result.data.nft,
        metadata: result.data.metadata,
        contract: result.data.contract,
        ownership: {
          isOwner: isOwner,
          currentOwner: result.data.owner,
          userWallet: user.walletAddress
        },
        capabilities: {
          canList: canList,
          canSell: canList,
          canRent: canRent,
          isListed: result.data.isListed,
          isRentable: result.data.contract.type === 'ERC4907'
        }
      }
    });

  } catch (error) {
    console.error('Get NFT by contract error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user's NFTs with filtering
const getUserNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    const { filter = 'all', page = 1, limit = 20 } = req.query;

    const user = await userRepo.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Filter NFTs
    // Fetch owned NFTs
    let owned = Array.isArray(user.ownedNFTs) ? user.ownedNFTs : [];
    let nfts = await Promise.all(owned.map((id) => nftRepo.findById(id))).then(arr => arr.filter(Boolean));
    // Attach contract info
    nfts = await Promise.all(nfts.map(async (nft) => {
      const contract = nft.contractId ? await nftContractRepo.findOne({ _id: nft.contractId }) : null;
      return { ...nft, contract };
    }));

    let filteredNFTs = nfts;

    if (filter === 'listed') {
      filteredNFTs = nfts.filter(nft => nft.isListed);
    } else if (filter === 'unlisted') {
      filteredNFTs = nfts.filter(nft => !nft.isListed);
    } else if (filter === 'rentable') {
      filteredNFTs = nfts.filter(nft => nft.contract.type === 'ERC4907');
    }

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedNFTs = filteredNFTs.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        nfts: paginatedNFTs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredNFTs.length,
          pages: Math.ceil(filteredNFTs.length / limit)
        },
        filters: {
          current: filter,
          available: ['all', 'listed', 'unlisted', 'rentable']
        },
        stats: user.nftStats
      }
    });

  } catch (error) {
    console.error('Get user NFTs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Quick verify endpoint (no database storage, no auth required)
const quickVerify = async (req, res) => {
  try {
    const { contractAddress, tokenId, walletAddress } = req.body;

    if (!contractAddress || !tokenId || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Contract address, token ID, and wallet address are required'
      });
    }

    const result = await nftVerificationService.verifyAndFetchNFT(
      contractAddress,
      tokenId,
      walletAddress
    );

    res.json(result);

  } catch (error) {
    console.error('Quick verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get NFT details by database ID
const getNFTDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const nft = await nftRepo.findById(id);
    const contract = nft?.contractId ? await nftContractRepo.findOne({ _id: nft.contractId }) : null;
    
    if (!nft) {
      return res.status(404).json({
        success: false,
        message: 'NFT not found'
      });
    }

    res.json({
      success: true,
      data: { ...nft, contract }
    });
  } catch (error) {
    console.error('Get NFT details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add missing functions that are in your routes
const getOwnedNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userRepo.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        nfts: await Promise.all((user.ownedNFTs || []).map((id) => nftRepo.findById(id))).then(arr => arr.filter(Boolean)),
        count: (user.ownedNFTs || []).length
      }
    });
  } catch (error) {
    console.error('Get owned NFTs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getRentedNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    // Assuming you have a rentedNFTs field in User model
    const user = await userRepo.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        nfts: user.rentedNFTs || [],
        count: (user.rentedNFTs || []).length
      }
    });
  } catch (error) {
    console.error('Get rented NFTs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const addNFTToCollection = async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.body;
    const userId = req.userId;

    // Use the verify function to add NFT to collection
    const result = await verifyNFT(req, res);
    // This will handle the logic already
  } catch (error) {
    console.error('Add NFT to collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  verifyNFT,
  getNFTByContract,
  getUserNFTs,
  quickVerify,
  getNFTDetails,
  getOwnedNFTs,
  getRentedNFTs,
  addNFTToCollection
};