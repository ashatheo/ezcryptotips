require('dotenv').config();

console.log("Testing .env configuration:\n");

const requiredVars = [
  'HEDERA_TESTNET_OPERATOR_PRIVATE_KEY',
  'PLATFORM_WALLET_ADDRESS'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Show first 10 chars only for security
    const preview = value.substring(0, 10) + '...';
    console.log(`✅ ${varName}: ${preview} (length: ${value.length})`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log("\n✅ All required variables are set!");
} else {
  console.log("\n❌ Some required variables are missing!");
  console.log("\nPlease update your .env file with:");
  console.log("HEDERA_TESTNET_OPERATOR_PRIVATE_KEY=your_private_key_here");
  console.log("PLATFORM_WALLET_ADDRESS=0.0.XXXXX");
}
