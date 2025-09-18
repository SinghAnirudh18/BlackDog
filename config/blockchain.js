// Blockchain Configuration for Sepolia Network
module.exports = {
  // Sepolia Network Configuration
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },

  // Contract Addresses (Update these after deploying to Sepolia)
  contracts: {
    rentalNFT: process.env.RENTAL_NFT_CONTRACT_ADDRESS || '',
    rentalMarketplace: process.env.RENTAL_MARKETPLACE_CONTRACT_ADDRESS || ''
  },

  // Platform Configuration
  platform: {
    feeBps: parseInt(process.env.PLATFORM_FEE_BPS) || 500, // 5%
    feeRecipient: process.env.FEE_RECIPIENT_ADDRESS || ''
  },

  // Gas Configuration
  gas: {
    gasLimit: 500000,
    gasPrice: '20000000000' // 20 gwei
  }
};
