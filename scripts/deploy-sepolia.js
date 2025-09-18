const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("🚀 Starting deployment to Sepolia testnet...\n");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.provider.getBalance(deployer.address)).toString()
  );

  // Deploy RentalNFT
  console.log("\n🎨 Deploying RentalNFT...");
  const RentalNFT = await ethers.getContractFactory("RentalNFT");
  const rentalNFT = await RentalNFT.deploy(
    "RentableNFT",
    "RNFT",
    deployer.address
  );
  await rentalNFT.waitForDeployment();
  const rentalNFTAddress = await rentalNFT.getAddress();
  console.log("✅ RentalNFT deployed to:", rentalNFTAddress);

  // Deploy RentalMarketplace
  console.log("\n🏪 Deploying RentalMarketplace...");
  const RentalMarketplace = await ethers.getContractFactory(
    "RentalMarketplace"
  );
  const platformFeeBps = 500; // 5%
  const feeRecipient = deployer.address;
  const rentalMarketplace = await RentalMarketplace.deploy(
    deployer.address,
    platformFeeBps,
    feeRecipient
  );
  await rentalMarketplace.waitForDeployment();
  const rentalMarketplaceAddress = await rentalMarketplace.getAddress();
  console.log("✅ RentalMarketplace deployed to:", rentalMarketplaceAddress);

  // Mint some test NFTs
  console.log("\n🎯 Minting test NFTs...");
  for (let i = 1; i <= 3; i++) {
    const tx = await rentalNFT.mint(deployer.address);
    await tx.wait();
    console.log(`✅ Minted NFT #${i}`);
  }

  // Update .env with new addresses
  console.log("\n📝 Updating .env with deployed contract addresses...");
  let env = fs.readFileSync(".env", "utf8");

  if (env.includes("RENTAL_NFT_CONTRACT_ADDRESS=")) {
    env = env.replace(
      /RENTAL_NFT_CONTRACT_ADDRESS=.*/g,
      `RENTAL_NFT_CONTRACT_ADDRESS=${rentalNFTAddress}`
    );
  } else {
    env += `\nRENTAL_NFT_CONTRACT_ADDRESS=${rentalNFTAddress}`;
  }

  if (env.includes("RENTAL_MARKETPLACE_CONTRACT_ADDRESS=")) {
    env = env.replace(
      /RENTAL_MARKETPLACE_CONTRACT_ADDRESS=.*/g,
      `RENTAL_MARKETPLACE_CONTRACT_ADDRESS=${rentalMarketplaceAddress}`
    );
  } else {
    env += `\nRENTAL_MARKETPLACE_CONTRACT_ADDRESS=${rentalMarketplaceAddress}`;
  }

  fs.writeFileSync(".env", env);
  console.log("✅ .env updated successfully!");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("=====================================");
  console.log(`RentalNFT:          ${rentalNFTAddress}`);
  console.log(`RentalMarketplace:  ${rentalMarketplaceAddress}`);
  console.log("=====================================");

  console.log("\n🔗 Sepolia Etherscan:");
  console.log(
    `https://sepolia.etherscan.io/address/${rentalNFTAddress}`
  );
  console.log(
    `https://sepolia.etherscan.io/address/${rentalMarketplaceAddress}`
  );
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
