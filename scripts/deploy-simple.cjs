// Simple deployment script without Hardhat plugins
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function main() {
  console.log("🚀 Deploying HederaTipSplitter contract to Hedera...\n");

  // Get configuration from environment
  const privateKey = process.env.HEDERA_TESTNET_OPERATOR_PRIVATE_KEY;
  const platformWalletId = process.env.PLATFORM_WALLET_ADDRESS;
  const rpcUrl = "https://testnet.hashio.io/api";

  // Validation
  if (!privateKey) {
    throw new Error("❌ HEDERA_TESTNET_OPERATOR_PRIVATE_KEY is not set in .env file");
  }

  if (!platformWalletId) {
    throw new Error("❌ PLATFORM_WALLET_ADDRESS is not set in .env file");
  }

  console.log(`📋 Platform Wallet (Hedera ID): ${platformWalletId}`);
  console.log(`🌐 Network: Hedera Testnet`);
  console.log(`🔗 RPC URL: ${rpcUrl}\n`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`👤 Deployer Address (EVM): ${wallet.address}`);

  // Use deployer's EVM address as platform wallet (same account)
  const platformWallet = wallet.address;
  console.log(`📋 Platform Wallet (EVM): ${platformWallet}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} HBAR\n`);

  if (balance === 0n) {
    throw new Error("❌ Insufficient balance. Get testnet HBAR from https://portal.hedera.com/faucet");
  }

  // Read compiled contract
  const artifactPath = path.join(__dirname, '../artifacts/contracts/HederaTipSplitter.sol/HederaTipSplitter.json');

  if (!fs.existsSync(artifactPath)) {
    console.log("⚠️  Artifact not found. Attempting to compile contract...\n");

    // Try to compile
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec('npx hardhat compile --config hardhat.config.cjs', (error, stdout, stderr) => {
        if (error) {
          console.error("Compilation output:", stdout);
          console.error("Compilation errors:", stderr);
          reject(new Error("Failed to compile contract"));
        } else {
          console.log("✅ Contract compiled successfully\n");
          resolve();
        }
      });
    });
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Deploy contract
  console.log("📦 Deploying contract...");
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  const contract = await factory.deploy(platformWallet, {
    gasLimit: 1000000 // Set explicit gas limit
  });

  console.log("⏳ Waiting for deployment transaction to be mined...");
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
  console.log(`✓ Platform Fee: ${platformFeeBPS / 100n}% (${platformFeeBPS} basis points)`);

  // Test calculation
  const testAmount = ethers.parseEther("100"); // 100 HBAR
  const [waiterAmount, platformFee] = await contract.calculateSplit(testAmount);

  console.log("\n🧮 Test Split Calculation (100 HBAR):");
  console.log(`  → Waiter receives: ${ethers.formatEther(waiterAmount)} HBAR`);
  console.log(`  → Platform fee: ${ethers.formatEther(platformFee)} HBAR`);

  console.log("\n📝 Next Steps:");
  console.log("1. Add contract address to your .env file:");
  console.log(`   VITE_TIP_SPLITTER_CONTRACT_ADDRESS=${contractAddress}`);
  console.log("2. Update your frontend to use the contract");
  console.log("3. Test on testnet before mainnet deployment");

  console.log("\n🎉 Deployment complete!\n");

  // Save deployment info
  const deploymentInfo = {
    network: 'hedera-testnet',
    contractAddress: contractAddress,
    platformWallet: storedPlatformWallet,
    platformFeeBPS: platformFeeBPS.toString(),
    deployedAt: new Date().toISOString(),
    deployer: wallet.address,
    hashscanUrl: `https://hashscan.io/testnet/contract/${contractAddress}`
  };

  fs.writeFileSync(
    path.join(__dirname, '../deployment-testnet.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployment-testnet.json\n");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
