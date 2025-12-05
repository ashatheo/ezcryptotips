/**
 * Firestore Database Cleanup Script
 * Deletes all documents from the waiters collection
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin using Application Default Credentials
// This works because Firebase CLI is already authenticated
admin.initializeApp({
  projectId: 'ezcryptotips'
});

const db = admin.firestore();

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve, reject);
  });
}

async function deleteQueryBatch(query, resolve, reject) {
  try {
    const snapshot = await query.get();

    if (snapshot.size === 0) {
      resolve();
      return;
    }

    console.log(`Deleting ${snapshot.size} documents...`);

    // Delete documents in a batch
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      console.log(`  - ${doc.id}: ${doc.data().name || 'No name'}`);
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Batch deleted successfully\n`);

    // Recurse on the next process tick to avoid exploding the call stack
    process.nextTick(() => {
      deleteQueryBatch(query, resolve, reject);
    });
  } catch (error) {
    reject(error);
  }
}

async function main() {
  console.log('🧹 Starting Firestore cleanup...\n');
  console.log('Project: ezcryptotips');
  console.log('Collection: waiters\n');

  try {
    // First, let's see what we have
    const waitersSnapshot = await db.collection('waiters').get();
    console.log(`📊 Found ${waitersSnapshot.size} documents in 'waiters' collection:\n`);

    if (waitersSnapshot.size === 0) {
      console.log('✅ Collection is already empty!');
      process.exit(0);
    }

    // Show all documents
    waitersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}`);
      console.log(`    Name: ${data.name || 'No name'}`);
      console.log(`    Email: ${data.email || 'No email'}`);
      console.log(`    Hedera ID: ${data.hederaId || 'No Hedera ID'}`);
      console.log('');
    });

    console.log('⚠️  Are you sure you want to delete all these documents?');
    console.log('⚠️  This action cannot be undone!\n');

    // Wait 3 seconds before proceeding
    console.log('Starting deletion in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete all documents
    await deleteCollection('waiters');

    console.log('✅ All documents deleted successfully!');
    console.log('🎉 Firestore cleanup complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

main();
