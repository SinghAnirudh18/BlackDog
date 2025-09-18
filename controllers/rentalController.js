const { Contract, JsonRpcProvider, isAddress } = require('ethers');
const userRepo = require('../repositories/userRepo');
const nftRepo = require('../repositories/nftRepo');
const blockchainConfig = require('../config/blockchain');

// Minimal ERC4907 ABI
const ERC4907_ABI = [
  'function userOf(uint256 tokenId) view returns (address)',
  'function userExpires(uint256 tokenId) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)'
];

const provider = new JsonRpcProvider(blockchainConfig.sepolia.rpcUrl);

function ensureUserArrays(u) {
  if (!Array.isArray(u.ownedNFTs)) u.ownedNFTs = [];
  if (!Array.isArray(u.rentedNFTs)) u.rentedNFTs = [];
  if (!Array.isArray(u.rentedOutNFTs)) u.rentedOutNFTs = [];
  if (!u.nftStats) u.nftStats = { totalOwned: 0, totalListed: 0, totalRented: 0, totalRentedOut: 0, portfolioValue: 0, totalEarnings: 0, totalSpent: 0 };
}

// Core function to sync a single NFT rental state
async function syncRentalFor(contractAddress, tokenId) {
  const contract = new Contract(contractAddress, ERC4907_ABI, provider);
    const [owner, user, expires] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.userOf(tokenId),
      contract.userExpires(tokenId)
    ]);

    const now = Math.floor(Date.now() / 1000);
    const isActive = user && user !== '0x0000000000000000000000000000000000000000' && Number(expires) > now;

    // Find or create NFT record
    let nft = await nftRepo.findOne({ contractAddress: contractAddress.toLowerCase(), tokenId: String(tokenId) });
    if (!nft) {
      // Minimal record if not present
      nft = await nftRepo.create({
        contractAddress: contractAddress.toLowerCase(),
        tokenId: String(tokenId),
        owner: owner,
        currentOwner: owner,
        isListed: false,
        rental: { isRented: false, currentRenter: null, rentalStart: null, rentalEnd: null }
      });
    }

    // Identify owner and renter users by walletAddress
    const ownerUser = await userRepo.findOne({ walletAddress: owner.toLowerCase() });
    const renterUser = isActive ? await userRepo.findOne({ walletAddress: user.toLowerCase() }) : null;

    // Update NFT rental fields
    if (isActive) {
      const rentalStart = nft.rental?.rentalStart || (now - 1); // unknown exact start; approximate
      await nftRepo.updateById(nft._id, {
        rental: { ...(nft.rental || {}), isRented: true, currentRenter: user, rentalStart, rentalEnd: Number(expires) }
      });
    } else {
      await nftRepo.updateById(nft._id, {
        rental: { ...(nft.rental || {}), isRented: false, currentRenter: null, rentalEnd: Number(expires) }
      });
    }

    // Update users' lists
    if (ownerUser) {
      ensureUserArrays(ownerUser);
      // Remove from owned if active, add to rentedOut; else revert
      const id = nft._id;
      const rmOwned = () => ownerUser.ownedNFTs = ownerUser.ownedNFTs.filter(x => x !== id);
      const addOwned = () => { if (!ownerUser.ownedNFTs.includes(id)) ownerUser.ownedNFTs.push(id); };
      const addRentedOut = () => { if (!ownerUser.rentedOutNFTs.includes(id)) ownerUser.rentedOutNFTs.push(id); };
      const rmRentedOut = () => ownerUser.rentedOutNFTs = ownerUser.rentedOutNFTs.filter(x => x !== id);

      if (isActive) {
        rmOwned();
        addRentedOut();
        ownerUser.nftStats.totalRentedOut = (ownerUser.nftStats.totalRentedOut || 0) + 1;
      } else {
        rmRentedOut();
        addOwned();
      }
      await userRepo.save(ownerUser);
    }

    if (renterUser) {
      ensureUserArrays(renterUser);
      const id = nft._id;
      const addRented = () => { if (!renterUser.rentedNFTs.includes(id)) renterUser.rentedNFTs.push(id); };
      const rmRented = () => renterUser.rentedNFTs = renterUser.rentedNFTs.filter(x => x !== id);
      if (isActive) {
        addRented();
        renterUser.nftStats.totalRented = (renterUser.nftStats.totalRented || 0) + 1;
      } else {
        rmRented();
      }
      await userRepo.save(renterUser);
    }

    return { success: true, data: { owner, renter: isActive ? user : null, active: isActive, expires: Number(expires) } };
}

// Sync rental state based on on-chain data (ERC4907 userOf + expires)
// Body: { contractAddress, tokenId }
async function syncRental(req, res) {
  try {
    const { contractAddress, tokenId } = req.body;
    if (!isAddress(contractAddress) || !tokenId) {
      return res.status(400).json({ success: false, message: 'Invalid parameters' });
    }
    const result = await syncRentalFor(contractAddress, tokenId);
    return res.json(result);
  } catch (error) {
    console.error('syncRental error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = { syncRental, syncRentalFor };
