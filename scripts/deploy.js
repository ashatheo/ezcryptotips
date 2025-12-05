const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying HederaTipSplitter contract to Hedera...\n");

  // Get the platform wallet address from environment or use a default
  const platformWallet = process.env.PLATFORM_WALLET_ADDRESS;

  if (!platformWallet) {
    throw new Error("❌ PLATFORM_WALLET_ADDRESS is not set in .env file");
  }

  console.log(`📋 Platform Wallet: ${platformWallet}`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`⛽ Chain ID: ${hre.network.config.chainId}\n`);

  // Get the contract factory
  const HederaTipSplitter = await hre.ethers.getContractFactory("HederaTipSplitter");

  // Deploy the contract
  console.log("📦 Deploying contract...");
  const contract = await HederaTipSplitter.deploy(platformWallet);

  // Wait for deployment to complete
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();

  console.log("\n✅ Contract deployed successfully!");
  console.log("━".repeat(60));
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 HashScan URL: https://hashscan.io/testnet/contract/${contractAddress}`);
  console.log("━".repeat(60));

  // Verify contract settings
  console.log("\n🔍 Verifying contract settings...");
  const storedPlatformWallet = await contract.platformWallet();
  const platformFeeBPS = await contract.PLATFORM_FEE_BPS();

  console.log(`✓ Platform Wallet: ${storedPlatformWallet}`);
  console.log(`✓ Platform Fee: ${platformFeeBPS / 100}% (${platformFeeBPS} basis points)`);

  // Test calculation
  const testAmount = hre.ethers.parseEther("100"); // 100 HBAR
  const [waiterAmount, platformFee] = await contract.calculateSplit(testAmount);

  console.log("\n🧮 Test Split Calculation (100 HBAR):");
  console.log(`  → Waiter receives: ${hre.ethers.formatEther(waiterAmount)} HBAR`);
  console.log(`  → Platform fee: ${hre.ethers.formatEther(platformFee)} HBAR`);

  console.log("\n📝 Next Steps:");
  console.log("1. Add contract address to your .env file:");
  console.log(`   VITE_TIP_SPLITTER_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Update your frontend to use the contract");
  console.log("3. Test on testnet before mainnet deployment");

  console.log("\n🎉 Deployment complete!\n");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
