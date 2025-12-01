/**
 * Script to create a new HCS Topic for storing reviews
 * Run with: node scripts/createHCSTopic.js
 *
 * IMPORTANT: You need to set your Hedera account credentials:
 * - ACCOUNT_ID: Your Hedera account ID (e.g., 0.0.xxxxx)
 * - PRIVATE_KEY: Your account's private key
 *
 * For testnet, you can create a free account at: https://portal.hedera.com/
 */

const {
  Client,
  TopicCreateTransaction,
  PrivateKey,
  Hbar
} = require('@hashgraph/sdk');

async function createReviewsTopic() {
  // Configuration - REPLACE WITH YOUR CREDENTIALS
  const ACCOUNT_ID = process.env.HEDERA_ACCOUNT_ID || '0.0.YOUR_ACCOUNT_ID';
  const PRIVATE_KEY = process.env.HEDERA_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';
  const NETWORK = 'testnet'; // or 'mainnet'

  console.log('🚀 Creating HCS Topic for Ez Crypto Tips Reviews...\n');

  try {
    // Validate credentials
    if (ACCOUNT_ID.includes('YOUR_ACCOUNT_ID') || PRIVATE_KEY.includes('YOUR_PRIVATE_KEY')) {
      console.error('❌ Error: Please set your Hedera credentials!');
      console.log('\nOptions:');
      console.log('1. Set environment variables:');
      console.log('   export HEDERA_ACCOUNT_ID=0.0.xxxxx');
      console.log('   export HEDERA_PRIVATE_KEY=your_private_key');
      console.log('\n2. Or edit this file and replace the placeholder values\n');
      process.exit(1);
    }

    // Create client for testnet or mainnet
    const client = NETWORK === 'mainnet'
      ? Client.forMainnet()
      : Client.forTestnet();

    client.setOperator(ACCOUNT_ID, PrivateKey.fromString(PRIVATE_KEY));

    console.log(`📡 Network: ${NETWORK}`);
    console.log(`👤 Operator Account: ${ACCOUNT_ID}\n`);

    // Create the topic
    console.log('⏳ Creating topic...');
    const transaction = new TopicCreateTransaction()
      .setTopicMemo('Ez Crypto Tips - Customer Reviews & Ratings')
      .setMaxTransactionFee(new Hbar(2));

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId;

    console.log('\n✅ Topic created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Topic ID: ${topicId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 Next steps:');
    console.log('1. Copy the Topic ID above');
    console.log('2. Update src/HederaWalletContext.tsx:');
    console.log(`   const REVIEWS_TOPIC_ID = '${topicId}';`);
    console.log('\n3. You can view messages on HashScan:');
    console.log(`   https://hashscan.io/${NETWORK}/topic/${topicId}\n`);

    client.close();
  } catch (error) {
    console.error('\n❌ Error creating topic:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

createReviewsTopic();
