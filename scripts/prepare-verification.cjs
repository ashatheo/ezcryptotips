// Prepare files for manual contract verification on HashScan
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("📋 Preparing contract verification files...\n");

// Load deployment info
const deploymentPath = path.join(__dirname, '../deployment-testnet.json');
if (!fs.existsSync(deploymentPath)) {
  throw new Error("❌ deployment-testnet.json not found. Deploy the contract first.");
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
const contractAddress = deployment.contractAddress;

console.log(`📍 Contract Address: ${contractAddress}`);
console.log(`🔗 HashScan URL: ${deployment.hashscanUrl}\n`);

// Read contract source
const contractPath = path.join(__dirname, '../contracts/HederaTipSplitter.sol');
const sourceCode = fs.readFileSync(contractPath, 'utf8');

// Read artifact for ABI and bytecode info
const artifactPath = path.join(__dirname, '../artifacts/contracts/HederaTipSplitter.sol/HederaTipSplitter.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

// Encode constructor arguments (platformWallet address)
const { ethers } = require('ethers');
const platformWallet = deployment.platformWallet;

console.log("📦 Contract Details:");
console.log(`   Name: HederaTipSplitter`);
console.log(`   Compiler: solc 0.8.20`);
console.log(`   Optimization: Enabled (200 runs)`);
console.log(`   Platform Wallet: ${platformWallet}\n`);

// Encode constructor arguments
const abiCoder = new ethers.AbiCoder();
const constructorArgs = abiCoder.encode(['address'], [platformWallet]);
const constructorArgsHex = constructorArgs.slice(2); // Remove '0x' prefix

console.log("🔧 Constructor Arguments (ABI-encoded):");
console.log(`   ${constructorArgsHex}\n`);

// Create verification directory
const verifyDir = path.join(__dirname, '../verification');
if (!fs.existsSync(verifyDir)) {
  fs.mkdirSync(verifyDir, { recursive: true });
}

// Save flattened source (just copy since it's a single file)
const flattenedPath = path.join(verifyDir, 'HederaTipSplitter_flattened.sol');
fs.writeFileSync(flattenedPath, sourceCode);

// Save verification info
const verificationInfo = {
  contractAddress: contractAddress,
  contractName: "HederaTipSplitter",
  compilerVersion: "v0.8.20+commit.a1b79de6",
  optimization: {
    enabled: true,
    runs: 200
  },
  constructorArguments: constructorArgsHex,
  platformWallet: platformWallet,
  evmVersion: "default",
  license: "MIT",
  hashscanUrl: deployment.hashscanUrl,
  verificationSteps: [
    "1. Visit: " + deployment.hashscanUrl,
    "2. Click 'Contract' tab",
    "3. Click 'Verify and Publish' button",
    "4. Fill in the form:",
    "   - Contract Address: " + contractAddress,
    "   - Compiler Type: Solidity (Single file)",
    "   - Compiler Version: v0.8.20+commit.a1b79de6",
    "   - Open Source License Type: MIT",
    "   - Optimization: Yes",
    "   - Runs: 200",
    "5. Paste the contract source code from: verification/HederaTipSplitter_flattened.sol",
    "6. Constructor Arguments (ABI-encoded): " + constructorArgsHex,
    "7. Click 'Verify and Publish'"
  ]
};

const verificationInfoPath = path.join(verifyDir, 'verification-info.json');
fs.writeFileSync(verificationInfoPath, JSON.stringify(verificationInfo, null, 2));

// Create a text file with instructions
const instructionsPath = path.join(verifyDir, 'VERIFICATION_INSTRUCTIONS.txt');
const instructions = `
HEDERA SMART CONTRACT VERIFICATION GUIDE
=========================================

Contract Address: ${contractAddress}
HashScan URL: ${deployment.hashscanUrl}

STEP-BY-STEP INSTRUCTIONS:
--------------------------

1. Open HashScan
   Visit: ${deployment.hashscanUrl}

2. Navigate to Verification
   - Click on the "Contract" tab
   - Click "Verify and Publish" button

3. Fill in the Verification Form:

   Contract Address:
   ${contractAddress}

   Compiler Type:
   Solidity (Single file)

   Compiler Version:
   v0.8.20+commit.a1b79de6

   Open Source License Type:
   MIT License (MIT)

   Optimization Enabled:
   Yes

   Runs (Optimizer):
   200

4. Paste Contract Source Code:
   Copy the entire content from: verification/HederaTipSplitter_flattened.sol

5. Constructor Arguments (ABI-encoded):
   ${constructorArgsHex}

   This encodes the platform wallet address: ${platformWallet}

6. Click "Verify and Publish"

ALTERNATIVE: Use Hardhat Verify Plugin
---------------------------------------
If the manual verification doesn't work, you can try:

npm install --save-dev @nomicfoundation/hardhat-verify
npx hardhat verify --network hedera-testnet ${contractAddress} ${platformWallet}

FILES CREATED:
--------------
- verification/HederaTipSplitter_flattened.sol (Contract source)
- verification/verification-info.json (All verification details)
- verification/VERIFICATION_INSTRUCTIONS.txt (This file)

TROUBLESHOOTING:
----------------
1. If verification fails with "Constructor arguments mismatch":
   - Double check the constructor arguments hex: ${constructorArgsHex}
   - Make sure it matches the platform wallet: ${platformWallet}

2. If compiler version not found:
   - Try other 0.8.20 versions from the dropdown
   - Common format: v0.8.20+commit.a1b79de6

3. If source code doesn't match:
   - Make sure optimization is enabled with 200 runs
   - Check that you're using the exact source from HederaTipSplitter_flattened.sol

For more help: https://docs.hedera.com/hedera/core-concepts/smart-contracts/verifying-smart-contracts-beta
`;

fs.writeFileSync(instructionsPath, instructions);

console.log("✅ Verification files created successfully!\n");
console.log("📁 Files saved to:");
console.log(`   - ${flattenedPath}`);
console.log(`   - ${verificationInfoPath}`);
console.log(`   - ${instructionsPath}\n`);

console.log("📝 Next Steps:");
console.log("1. Open: " + deployment.hashscanUrl);
console.log("2. Follow instructions in: verification/VERIFICATION_INSTRUCTIONS.txt\n");

console.log("⚡ Quick verification:");
console.log(`   npx hardhat verify --network hedera-testnet ${contractAddress} ${platformWallet}\n`);

console.log("🎯 Or verify manually at HashScan with these details:");
console.log("   Contract: HederaTipSplitter_flattened.sol");
console.log("   Compiler: v0.8.20+commit.a1b79de6");
console.log("   Optimization: Yes (200 runs)");
console.log("   Constructor Args: " + constructorArgsHex + "\n");
