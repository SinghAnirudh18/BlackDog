# BlackDog NFT Rental Marketplace - Sepolia Configuration

This project has been updated to use the Sepolia testnet instead of Polygon Amoy. The marketplace allows users to rent out their NFTs for a specified duration with optional deposit requirements.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MetaMask or compatible Web3 wallet
- Sepolia ETH (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### 1. Backend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Update .env with your configuration:
# - SEPOLIA_RPC_URL (Infura/Alchemy endpoint)
# - Contract addresses (after deployment)
# - Database connection string
```

### 2. Smart Contracts Deployment

```bash
# Install contract dependencies
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts hardhat

# Compile contracts
npx hardhat compile

# Deploy to Sepolia (requires PRIVATE_KEY in .env)
npx hardhat run scripts/deploy-sepolia.js --network sepolia
```

### 3. Frontend Setup

```bash
cd frontend/neural_dao

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with:
# - VITE_SEPOLIA_RPC_URL
# - Contract addresses from deployment
```

### 4. Start Development Servers

```bash
# Backend (from root directory)
npm run dev

# Frontend (from frontend/neural_dao)
npm run dev
```

## 📋 Contract Addresses

After deployment, update these in your environment files:

```env
# Backend (.env)
RENTAL_NFT_CONTRACT_ADDRESS=0x...
RENTAL_MARKETPLACE_CONTRACT_ADDRESS=0x...

# Frontend (.env.local)
VITE_RENTAL_NFT_CONTRACT_ADDRESS=0x...
VITE_RENTAL_MARKETPLACE_CONTRACT_ADDRESS=0x...
```

## 🔧 Configuration Changes Made

### Network Migration
- ✅ Updated RPC URLs from Polygon Amoy to Sepolia
- ✅ Changed chain ID from 80002 to 11155111
- ✅ Updated explorer URLs to Sepolia Etherscan
- ✅ Created blockchain configuration files

### New Routes Added
- `/create-listing` - Create new rental listings
- `/my-rentals` - View active and past rentals
- `/rental/:contractAddress/:tokenId` - Detailed rental view

### Wallet Integration
- ✅ MetaMask connection with network switching
- ✅ Automatic Sepolia network detection
- ✅ Wallet state management across the app
- ✅ Contract interaction helpers

## 🎯 Smart Contracts

### ERC4907.sol & IERC4907.sol
- Implements the ERC-4907 standard for rentable NFTs
- Allows setting temporary users with expiration times

### RentalNFT.sol
- ERC721 NFT contract with ERC-4907 support
- Owner can mint new NFTs

### RentalMarketplace.sol
- Core marketplace functionality
- Supports both ETH and ERC20 payments
- Configurable deposit requirements
- Platform fee system

### Native ETH Only
- Rentals and deposits are settled in native ETH on Sepolia
- No ERC20 token is required

## 🔗 Sepolia Testnet

- **Chain ID**: 11155111
- **RPC URL**: https://sepolia.infura.io/v3/YOUR_PROJECT_ID
- **Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com/

## 🧪 Testing

1. Get Sepolia ETH from the faucet
2. Deploy contracts to Sepolia
3. Mint some test NFTs
4. Create rental listings
5. Test rental functionality

## 📱 Frontend Features

- **Wallet Connection**: MetaMask integration with network switching
- **Create Listings**: List NFTs for rent with custom terms
- **Browse Marketplace**: View and filter available rentals
- **My Rentals**: Track active and completed rentals
- **Rental Details**: Detailed view with rental functionality

## 🚨 Important Notes

- This is configured for **Sepolia testnet only**
- Use test ETH only - no real value
- Contract addresses need to be updated after deployment
- Ensure MetaMask is connected to Sepolia network

## 🔄 Migration from Polygon Amoy

If migrating from Polygon Amoy:
1. Update all RPC URLs to Sepolia endpoints
2. Change chain ID from 80002 to 11155111
3. Redeploy contracts to Sepolia (RentalNFT, RentalMarketplace)
4. Update frontend configuration (remove any token-based payment assumptions)
5. Test all functionality on Sepolia using native ETH

## 📞 Support

For issues or questions:
1. Check the console for error messages
2. Verify network configuration
3. Ensure wallet is connected to Sepolia
4. Check contract addresses are correct
