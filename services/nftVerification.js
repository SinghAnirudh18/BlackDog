const { ethers, JsonRpcProvider, Contract, isAddress } = require("ethers");
const nftRepo = require('../repositories/nftRepo');
const nftContractRepo = require('../repositories/nftContractRepo');
const axios = require('axios');
const blockchainConfig = require('../config/blockchain');

const provider = new JsonRpcProvider(blockchainConfig.sepolia.rpcUrl);

class NFTVerificationService {
  constructor() {
    this.erc721Abi = [
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function tokenURI(uint256 tokenId) external view returns (string)",
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function supportsInterface(bytes4 interfaceId) external view returns (bool)"
    ];

    this.erc4907Abi = [
      "function userOf(uint256 tokenId) external view returns (address)",
      "function userExpires(uint256 tokenId) external view returns (uint256)"
    ];
  }

  async verifyAndFetchNFT(contractAddress, tokenId, walletAddress) {
    try {
      console.log(`Verifying NFT: ${contractAddress}, Token: ${tokenId}, Wallet: ${walletAddress}`);
      
      // Validate inputs
      if (!isAddress(contractAddress)) {
        return {
          success: false,
          error: "Invalid contract address",
          code: "INVALID_CONTRACT_ADDRESS"
        };
      }

      if (isNaN(tokenId) || parseInt(tokenId) < 0) {
        return {
          success: false,
          error: "Invalid token ID",
          code: "INVALID_TOKEN_ID"
        };
      }

      if (!isAddress(walletAddress)) {
        return {
          success: false,
          error: "Invalid wallet address",
          code: "INVALID_WALLET_ADDRESS"
        };
      }

      const normalizedAddress = contractAddress.toLowerCase();
      const normalizedWallet = walletAddress.toLowerCase();

      // Create contract instance
      const contract = new Contract(normalizedAddress, this.erc721Abi, provider);

      // Check ownership
      let owner;
      try {
        owner = await contract.ownerOf(tokenId);
        console.log(`NFT Owner: ${owner}`);
      } catch (error) {
        console.error('Error getting owner:', error.message);
        return {
          success: false,
          error: "NFT does not exist or contract is not ERC-721 compatible",
          code: "NFT_NOT_FOUND"
        };
      }

      const isOwner = owner.toLowerCase() === normalizedWallet;
      if (!isOwner) {
        return {
          success: false,
          error: `You are not the owner of this NFT. Current owner: ${owner}`,
          code: "NOT_OWNER",
          currentOwner: owner
        };
      }

      // Get contract details
      let contractName = "Unknown";
      let contractSymbol = "Unknown";
      try {
        contractName = await contract.name();
        contractSymbol = await contract.symbol();
      } catch (error) {
        console.warn('Could not fetch contract name/symbol:', error.message);
      }

      // Check if it's ERC4907 (rentable)
      const isERC4907 = await this.checkERC4907Support(normalizedAddress);
      console.log(`Is ERC4907: ${isERC4907}`);

      // Get or create contract in datastore
      let nftContract = await nftContractRepo.findOne({ address: normalizedAddress });
      if (!nftContract) {
        nftContract = await nftContractRepo.create({
          address: normalizedAddress,
          name: contractName,
          symbol: contractSymbol,
          type: isERC4907 ? 'ERC4907' : 'ERC721',
          verified: false,
        });
      }

      // Get token URI and metadata
      let tokenURI = "";
      let metadata = null;
      
      try {
        tokenURI = await contract.tokenURI(tokenId);
        console.log(`Token URI: ${tokenURI}`);
        
        if (tokenURI) {
          metadata = await this.fetchNFTMetadata(tokenURI);
        }
      } catch (error) {
        console.warn('Could not fetch token URI or metadata:', error.message);
        metadata = {
          name: `Token #${tokenId}`,
          description: "Metadata not available",
          image: ""
        };
      }

      // Prepare metadata with default values for required fields
      const nftMetadata = {
        name: metadata?.name || `Token #${tokenId}`,
        description: metadata?.description || "No description available",
        image: metadata?.image || "",
        attributes: metadata?.attributes || [],
        ...metadata
      };

      // Get or create NFT in datastore
      let nft = await nftRepo.findOne({
        contractAddress: normalizedAddress,
        tokenId: tokenId.toString(),
      });

      if (!nft) {
        nft = await nftRepo.create({
          contractAddress: normalizedAddress,
          tokenId: tokenId.toString(),
          contractId: nftContract._id,
          name: nftMetadata.name,
          description: nftMetadata.description,
          image: nftMetadata.image,
          tokenURI: tokenURI,
          metadata: {
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image,
            attributes: nftMetadata.attributes || [],
          },
          owner: owner,
          currentOwner: owner,
          isListed: false,
          listingType: null,
          rental: {
            isRented: false,
            currentRenter: null,
            rentalStart: null,
            rentalEnd: null,
            rentalPrice: null,
            minDuration: null,
            maxDuration: null,
          },
          lastSale: null,
          media: {},
          metadataVerified: !!metadata,
          currency: "ETH",
        });
      } else {
        // Update existing NFT
        nft = await nftRepo.updateById(nft._id, {
          owner: owner,
          currentOwner: owner,
          name: nftMetadata.name,
          description: nftMetadata.description,
          image: nftMetadata.image,
          metadata: {
            name: nftMetadata.name,
            description: nftMetadata.description,
            image: nftMetadata.image,
            attributes: nftMetadata.attributes || [],
          },
          tokenURI: tokenURI || nft.tokenURI,
        });
      }

      return {
        success: true,
        data: {
          nft,
          metadata: nft.metadata,
          contract: nftContract,
          owner: owner,
          isListed: nft.isListed,
          canRent: isERC4907,
          canSell: true
        }
      };

    } catch (error) {
      console.error("NFT verification error:", error);
      return {
        success: false,
        error: error.message || "Failed to verify NFT ownership",
        code: "VERIFICATION_FAILED"
      };
    }
  }

  async getNFTDetails(contractAddress, tokenId) {
    try {
      console.log(`Getting NFT details: ${contractAddress}, Token: ${tokenId}`);
      
      // Validate inputs
      if (!isAddress(contractAddress)) {
        return {
          success: false,
          error: "Invalid contract address"
        };
      }

      const normalizedAddress = contractAddress.toLowerCase();
      const contract = new Contract(normalizedAddress, this.erc721Abi, provider);

      // Check if NFT exists and get owner
      let owner;
      try {
        owner = await contract.ownerOf(tokenId);
      } catch (error) {
        return {
          success: false,
          error: "NFT does not exist or contract is not ERC-721 compatible"
        };
      }

      // Get contract details
      let contractName = "Unknown";
      let contractSymbol = "Unknown";
      try {
        contractName = await contract.name();
        contractSymbol = await contract.symbol();
      } catch (error) {
        console.warn('Could not fetch contract name/symbol');
      }

      // Check if it's ERC4907
      const isERC4907 = await this.checkERC4907Support(normalizedAddress);

      // Get token URI and metadata
      let tokenURI = "";
      let metadata = null;
      
      try {
        tokenURI = await contract.tokenURI(tokenId);
        if (tokenURI) {
          metadata = await this.fetchNFTMetadata(tokenURI);
        }
      } catch (error) {
        console.warn('Could not fetch metadata');
      }

      return {
        success: true,
        data: {
          contractAddress: normalizedAddress,
          tokenId: tokenId.toString(),
          owner: owner,
          contract: {
            name: contractName,
            symbol: contractSymbol,
            type: isERC4907 ? 'ERC4907' : 'ERC721'
          },
          metadata: metadata || {
            name: `Token #${tokenId}`,
            description: "Metadata not available",
            image: ""
          },
          tokenURI: tokenURI,
          isListed: false // You can check this from your database
        }
      };

    } catch (error) {
      console.error("Get NFT details error:", error);
      return {
        success: false,
        error: error.message || "Failed to get NFT details"
      };
    }
  }

  async checkERC4907Support(contractAddress) {
    try {
      const contract = new Contract(contractAddress, [...this.erc721Abi, ...this.erc4907Abi], provider);
      
      // Check if contract supports ERC4907 interface
      const ERC4907_INTERFACE_ID = "0xad092b5c";
      const supportsERC4907 = await contract.supportsInterface(ERC4907_INTERFACE_ID);
      
      return supportsERC4907;
    } catch (error) {
      console.warn('Could not check ERC4907 support:', error.message);
      return false;
    }
  }

  async fetchNFTMetadata(tokenURI) {
    try {
      if (!tokenURI) throw new Error("No token URI provided");

      let url = tokenURI;

      // Handle IPFS URLs
      if (tokenURI.startsWith("ipfs://")) {
        url = `https://ipfs.io/ipfs/${tokenURI.replace("ipfs://", "")}`;
      } 
      // Handle base64 encoded JSON
      else if (tokenURI.startsWith("data:application/json;base64,")) {
        const base64Data = tokenURI.replace("data:application/json;base64,", "");
        const jsonString = Buffer.from(base64Data, "base64").toString("utf8");
        return JSON.parse(jsonString);
      }
      // Handle regular JSON data URIs
      else if (tokenURI.startsWith("data:application/json,")) {
        const jsonData = tokenURI.replace("data:application/json,", "");
        return JSON.parse(decodeURIComponent(jsonData));
      }

      console.log(`Fetching metadata from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 
          "User-Agent": "NFT-Rental-Marketplace/1.0",
          "Accept": "application/json"
        }
      });

      return response.data;
    } catch (error) {
      console.error("Metadata fetch error:", error.message);
      throw new Error(`Failed to fetch NFT metadata: ${error.message}`);
    }
  }
}

module.exports = new NFTVerificationService();