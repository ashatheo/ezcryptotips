// Verify smart contract on HashScan using Sourcify API
const fs = require('fs');
const path = require('path');
const https = require('https');

async function verifyContract() {
  console.log("🔍 Verifying HederaTipSplitter contract on HashScan...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployment-testnet.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error("❌ deployment-testnet.json not found. Deploy the contract first.");
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const contractAddress = deployment.contractAddress;

  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🌐 Network: ${deployment.network}\n`);

  // Read contract source
  const contractPath = path.join(__dirname, '../contracts/HederaTipSplitter.sol');
  const sourceCode = fs.readFileSync(contractPath, 'utf8');

  // Read metadata from artifact
  const artifactPath = path.join(__dirname, '../artifacts/contracts/HederaTipSplitter.sol/HederaTipSplitter.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Prepare verification payload
  const verificationData = {
    address: contractAddress,
    chain: "296", // Hedera testnet chain ID
    files: {
      "HederaTipSplitter.sol": sourceCode
    },
    chosenContract: "HederaTipSplitter"
  };

  console.log("📦 Preparing verification request...");
  console.log(`   Contract: HederaTipSplitter`);
  console.log(`   Compiler: Solidity 0.8.20`);
  console.log(`   Chain ID: 296 (Hedera Testnet)\n`);

  // Sourcify API endpoint
  const apiUrl = "https://server-verify.hashscan.io";

  console.log("🚀 Submitting to Sourcify verification service...");
  console.log(`   API: ${apiUrl}\n`);

  try {
    const result = await submitVerification(apiUrl, verificationData);

    if (result.result && result.result[0] && result.result[0].status === 'perfect') {
      console.log("✅ Contract verified successfully!");
      console.log("━".repeat(60));
      console.log(`🔗 View on HashScan: ${deployment.hashscanUrl}`);
      console.log("━".repeat(60));

      // Update deployment info
      deployment.verified = true;
      deployment.verifiedAt = new Date().toISOString();
      deployment.verificationStatus = 'perfect';

      fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
      console.log("\n💾 Updated deployment-testnet.json with verification status\n");

      return true;
    } else {
      console.log("⚠️  Verification status:", result);
      console.log("\nℹ️  Manual verification steps:");
      console.log("1. Visit: https://hashscan.io/testnet/contract/" + contractAddress);
      console.log("2. Click 'Verify Contract' tab");
      console.log("3. Choose 'Solidity (Single File)'");
      console.log("4. Upload HederaTipSplitter.sol");
      console.log("5. Set compiler version: 0.8.20");
      console.log("6. Enable optimization: Yes (200 runs)");
      return false;
    }
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    console.log("\n📝 Manual verification steps:");
    console.log("1. Visit: https://hashscan.io/testnet/contract/" + contractAddress);
    console.log("2. Click 'Contract' tab");
    console.log("3. Click 'Verify and Publish'");
    console.log("4. Select verification method:");
    console.log("   - Compiler Type: Solidity (Single file)");
    console.log("   - Compiler Version: v0.8.20+commit.a1b79de6");
    console.log("   - Optimization: Yes (200 runs)");
    console.log("5. Paste contract source code");
    console.log("6. Constructor arguments (if needed): " + deployment.platformWallet);
    console.log("\n🔗 HashScan URL: " + deployment.hashscanUrl);
    return false;
  }
}

function submitVerification(apiUrl, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const url = new URL(apiUrl);
    options.hostname = url.hostname;
    options.port = url.port || 443;
    options.path = '/verify';

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + responseData));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Execute verification
verifyContract()
  .then((success) => {
    if (success) {
      console.log("🎉 Verification complete!\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  Please verify manually using the steps above.\n");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("\n❌ Verification error:");
    console.error(error);
    process.exit(1);
  });
