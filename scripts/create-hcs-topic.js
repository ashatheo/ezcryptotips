/**
 * Create HCS Topic for Ez Crypto Tips Reviews
 * This topic will store all review messages immutably on Hedera blockchain
 */

const {
  Client,
  TopicCreateTransaction,
  PrivateKey
} = require('@hashgraph/sdk');

async function createHCSTopic() {
  console.log('🚀 Creating HCS Topic for Reviews...\n');

  // Load environment variables
  require('dotenv').config();
  const operatorId = process.env.VITE_HEDERA_OPERATOR_ID || '0.0.7372316';
  const operatorKey = process.env.VITE_HEDERA_OPERATOR_KEY || process.env.HEDERA_TESTNET_OPERATOR_PRIVATE_KEY;

  if (!operatorId || !operatorKey) {
    throw new Error('Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY');
  }

  console.log('Operator Account:', operatorId);

  // Create Hedera client for testnet
  const client = Client.forTestnet();
  client.setOperator(operatorId, PrivateKey.fromStringECDSA(operatorKey));

  try {
    // Create a new HCS topic
    const transaction = new TopicCreateTransaction()
      .setTopicMemo('Ez Crypto Tips - Reviews Storage')
      .setAdminKey(client.operatorPublicKey) // Allow topic updates
      .setSubmitKey(client.operatorPublicKey); // Allow anyone to submit messages

    console.log('Creating topic...');
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const topicId = receipt.topicId;

    console.log('\n✅ HCS Topic Created Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Topic ID:', topicId.toString());
    console.log('Network: Hedera Testnet');
    console.log('Memo: Ez Crypto Tips - Reviews Storage');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('HashScan URL:', 'https://hashscan.io/testnet/topic/' + topicId.toString());
    console.log('Mirror Node API:', 'https://testnet.mirrornode.hedera.com/api/v1/topics/' + topicId.toString() + '/messages');
    console.log('\n📝 Next Steps:');
    console.log('1. Update .env file: VITE_HCS_TOPIC_ID=' + topicId.toString());
    console.log('2. Update src/lib/hcsReviewService.ts with new topic ID');
    console.log('3. Rebuild and redeploy your app\n');

    return topicId.toString();
  } catch (error) {
    console.error('❌ Error creating HCS topic:', error);
    throw error;
  } finally {
    client.close();
  }
}

// Run the script
createHCSTopic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
