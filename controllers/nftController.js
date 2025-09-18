const NFT = require('../models/NFT');
const NFTContract = require('../models/NFTContract');
const User = require('../models/User');

// Get user's owned NFTs
const getOwnedNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate({
      path: 'ownedNFTs',
      populate: {
        path: 'contract',
        select: 'name symbol address verified'
      }
    });

    res.json({
      success: true,
      data: {
        nfts: user.ownedNFTs,
        stats: user.nftStats
      }
    });
  } catch (error) {
    console.error('Error fetching owned NFTs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user's rented NFTs
const getRentedNFTs = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate({
      path: 'rentedNFTs.nft',
      populate: {
        path: 'contract',
        select: 'name symbol address verified'
      }
    });

    const activeRentals = user.rentedNFTs.filter(rental => rental.status === 'active');
    const pastRentals = user.rentedNFTs.filter(rental => rental.status !== 'active');

    res.json({
      success: true,
      data: {
        activeRentals,
        pastRentals
      }
    });
  } catch (error) {
    console.error('Error fetching rented NFTs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get NFT details
const getNFTDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const nft = await NFT.findById(id)
      .populate('contract', 'name symbol address verified type')
      .populate('owner', 'username profile');

    if (!nft) {
      return res.status(404).json({
        success: false,
        message: 'NFT not found'
      });
    }

    res.json({
      success: true,
      data: { nft }
    });
  } catch (error) {
    console.error('Error fetching NFT details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Add NFT to user's collection
const addNFTToCollection = async (req, res) => {
  try {
    const { contractAddress, tokenId, metadata } = req.body;
    const userId = req.userId;
    const user = await User.findById(userId);

    // Check if NFT already exists
    let nft = await NFT.findOne({
      contractAddress: contractAddress.toLowerCase(),
      tokenId
    }).populate('contract');

    if (!nft) {
      // Create new NFT record
      let contract = await NFTContract.findOne({
        address: contractAddress.toLowerCase()
      });

      if (!contract) {
        // Create new contract record (you might want to fetch contract details from blockchain)
        contract = new NFTContract({
          address: contractAddress.toLowerCase(),
          name: 'Unknown Contract',
          symbol: 'UNK',
          verified: false
        });
        await contract.save();
      }

      nft = new NFT({
        tokenId,
        contractAddress: contractAddress.toLowerCase(),
        contract: contract._id,
        owner: user.walletAddress,
        metadata
      });
      await nft.save();
    }

    // Add to user's owned NFTs
    user.addOwnedNFT(nft._id);
    await user.save();

    res.json({
      success: true,
      message: 'NFT added to collection',
      data: { nft }
    });
  } catch (error) {
    console.error('Error adding NFT to collection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getOwnedNFTs,
  getRentedNFTs,
  getNFTDetails,
  addNFTToCollection
};