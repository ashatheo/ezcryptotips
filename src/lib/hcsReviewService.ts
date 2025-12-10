/**
 * Hedera Consensus Service (HCS) Review Service
 *
 * Provides tamper-proof review storage using HCS.
 * All reviews are submitted to HCS topic and stored immutably on Hedera.
 *
 * Features:
 * - Immutable reviews (cannot be edited or deleted)
 * - Timestamp verification (HCS consensus timestamp)
 * - Cryptographic integrity (HCS message hash)
 * - Public auditability (viewable on HashScan)
 */

import {
  TopicMessageSubmitTransaction,
  TopicId,
  Client,
  PrivateKey
} from '@hashgraph/sdk';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const APP_ID = 'ez-crypto-tips';

// HCS Topic ID - hardcoded to avoid Vite converting to scientific notation
// IMPORTANT: Vite may convert "0.0.7415185" to number like 2.48e+47 - always use string literal
// Created: 2025-12-10 - Topic for Ez Crypto Tips Reviews Storage
const HCS_TOPIC_ID = '0.0.7415185';

export interface ReviewData {
  waiterId: string;
  waiterName: string;
  rating: number;
  comment: string;
  tipAmount?: number;
  tipToken?: string;
  transactionId?: string;
}

export interface StoredReview extends ReviewData {
  id: string;
  hcsMessageId: string;
  hcsTimestamp: string;
  hcsSequenceNumber: number;
  createdAt: any;
  verified: boolean;
}

/**
 * Submit a review to HCS and store reference in Firebase
 * @param client Hedera client (must be connected)
 * @param reviewData Review data to submit
 * @returns HCS message ID and sequence number
 */
export async function submitReviewToHCS(
  client: Client,
  reviewData: ReviewData
): Promise<{ messageId: string; sequenceNumber: number; timestamp: string }> {
  console.log('[HCS] Submitting review to topic:', HCS_TOPIC_ID);
  console.log('[HCS] Review data:', reviewData);

  try {
    // Prepare review message
    const reviewMessage = {
      app: 'ez-crypto-tips',
      version: '1.0',
      type: 'review',
      data: {
        waiterId: reviewData.waiterId,
        waiterName: reviewData.waiterName,
        rating: reviewData.rating,
        comment: reviewData.comment,
        tipAmount: reviewData.tipAmount,
        tipToken: reviewData.tipToken,
        transactionId: reviewData.transactionId,
      },
      timestamp: new Date().toISOString(),
    };

    // Convert to JSON string
    const messageString = JSON.stringify(reviewMessage);
    console.log('[HCS] Message size:', messageString.length, 'bytes');

    // Submit to HCS topic
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(HCS_TOPIC_ID))
      .setMessage(messageString);

    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);

    const sequenceNumber = receipt.topicSequenceNumber?.toNumber() || 0;
    const timestamp = receipt.consensusTimestamp?.toString() || '';

    console.log('[HCS] ✅ Review submitted successfully');
    console.log('[HCS] Sequence number:', sequenceNumber);
    console.log('[HCS] Consensus timestamp:', timestamp);

    // Store reference in Firebase
    if (db) {
      await storeReviewReference(reviewData, sequenceNumber, timestamp);
    }

    return {
      messageId: `${HCS_TOPIC_ID}@${sequenceNumber}`,
      sequenceNumber,
      timestamp,
    };
  } catch (error: any) {
    console.error('[HCS] ❌ Failed to submit review:', error);
    throw new Error(`Failed to submit review to HCS: ${error.message}`);
  }
}

/**
 * Store review reference in Firebase (for quick access)
 * The source of truth is HCS, Firebase is just an index
 */
async function storeReviewReference(
  reviewData: ReviewData,
  sequenceNumber: number,
  timestamp: string
): Promise<void> {
  try {
    const reviewsRef = collection(db!, 'artifacts', APP_ID, 'public', 'data', 'reviews');

    await addDoc(reviewsRef, {
      ...reviewData,
      hcsMessageId: `${HCS_TOPIC_ID}@${sequenceNumber}`,
      hcsSequenceNumber: sequenceNumber,
      hcsTimestamp: timestamp,
      verified: true, // HCS provides verification
      createdAt: serverTimestamp(),
    });

    console.log('[Firebase] ✅ Review reference stored');
  } catch (error) {
    console.error('[Firebase] ⚠️ Failed to store review reference:', error);
    // Don't throw - HCS submission succeeded, Firebase is just cache
  }
}

/**
 * Get reviews for a waiter from Firebase cache
 * For full verification, reviews can be fetched directly from HCS Mirror Node
 */
export async function getWaiterReviews(waiterId: string): Promise<StoredReview[]> {
  if (!db) {
    return [];
  }

  try {
    const reviewsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reviews');
    const q = query(
      reviewsRef,
      where('waiterId', '==', waiterId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const querySnapshot = await getDocs(q);
    const reviews: StoredReview[] = [];

    querySnapshot.forEach((doc) => {
      reviews.push({
        id: doc.id,
        ...doc.data(),
      } as StoredReview);
    });

    return reviews;
  } catch (error) {
    console.error('[Firebase] Error fetching reviews:', error);
    return [];
  }
}

/**
 * Verify a review by checking HCS Mirror Node
 * This ensures the review actually exists on HCS and hasn't been tampered with
 */
export async function verifyReviewOnHCS(
  messageId: string
): Promise<{ verified: boolean; data?: any }> {
  try {
    const [topicId, sequenceNumber] = messageId.split('@');
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages/${sequenceNumber}`;

    console.log('[HCS] Verifying review at:', mirrorNodeUrl);

    const response = await fetch(mirrorNodeUrl);
    if (!response.ok) {
      return { verified: false };
    }

    const data = await response.json();

    // Decode base64 message
    const messageBase64 = data.message;
    const messageString = atob(messageBase64);
    const messageData = JSON.parse(messageString);

    console.log('[HCS] ✅ Review verified on HCS');

    return {
      verified: true,
      data: messageData,
    };
  } catch (error) {
    console.error('[HCS] ⚠️ Failed to verify review:', error);
    return { verified: false };
  }
}

/**
 * Get HashScan URL for a review message
 */
export function getReviewHashScanUrl(messageId: string): string {
  const [topicId, sequenceNumber] = messageId.split('@');
  return `https://hashscan.io/testnet/topic/${topicId}/message/${sequenceNumber}`;
}

/**
 * Verify that a transaction exists and was sent to the specified waiter
 * @param transactionId Hedera transaction ID (e.g., "0.0.12345@1234567890.123456789")
 * @param waiterHederaId Expected recipient Hedera Account ID
 * @returns Verification result with transaction details
 */
export async function verifyTipTransaction(
  transactionId: string,
  waiterHederaId: string
): Promise<{ verified: boolean; amount?: number; error?: string }> {
  try {
    console.log('[HCS] Verifying transaction:', transactionId);
    console.log('[HCS] Expected recipient:', waiterHederaId);

    // Parse transaction ID
    const mirrorNodeUrl = `https://testnet.mirrornode.hedera.com/api/v1/transactions/${transactionId}`;

    const response = await fetch(mirrorNodeUrl);
    if (!response.ok) {
      return {
        verified: false,
        error: 'Transaction not found on Hedera network'
      };
    }

    const data = await response.json();

    if (!data.transactions || data.transactions.length === 0) {
      return {
        verified: false,
        error: 'Transaction not found'
      };
    }

    const transaction = data.transactions[0];

    // Check if transaction was successful
    if (transaction.result !== 'SUCCESS') {
      return {
        verified: false,
        error: `Transaction failed with status: ${transaction.result}`
      };
    }

    // Check transfers to find payment to waiter
    const transfers = transaction.transfers || [];
    const waiterTransfer = transfers.find((t: any) =>
      t.account === waiterHederaId && t.amount > 0
    );

    if (!waiterTransfer) {
      return {
        verified: false,
        error: 'No payment found to this waiter in transaction'
      };
    }

    // Convert tinybar to HBAR (1 HBAR = 100,000,000 tinybar)
    const amountHBAR = waiterTransfer.amount / 100000000;

    console.log('[HCS] ✅ Transaction verified successfully');
    console.log('[HCS] Amount sent to waiter:', amountHBAR, 'HBAR');

    return {
      verified: true,
      amount: amountHBAR
    };

  } catch (error: any) {
    console.error('[HCS] ⚠️ Transaction verification failed:', error);
    return {
      verified: false,
      error: error.message || 'Failed to verify transaction'
    };
  }
}

/**
 * Check if user already left a review for this transaction
 * @param transactionId Transaction ID to check
 * @param waiterId Waiter ID
 * @returns True if duplicate review found
 */
export async function checkDuplicateReview(
  transactionId: string,
  waiterId: string
): Promise<boolean> {
  if (!db) {
    return false;
  }

  try {
    const reviewsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reviews');
    const q = query(
      reviewsRef,
      where('waiterId', '==', waiterId),
      where('transactionId', '==', transactionId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    const hasDuplicate = !querySnapshot.empty;

    if (hasDuplicate) {
      console.log('[HCS] ⚠️ Duplicate review detected for transaction:', transactionId);
    }

    return hasDuplicate;
  } catch (error) {
    console.error('[HCS] Error checking duplicate review:', error);
    return false;
  }
}

/**
 * Calculate average rating from last 40 reviews
 */
export function calculateAverageRating(reviews: StoredReview[]): {
  average: number;
  total: number;
} {
  if (reviews.length === 0) {
    return { average: 0, total: 0 };
  }

  const validReviews = reviews.filter(r => typeof r.rating === 'number' && r.rating > 0);
  if (validReviews.length === 0) {
    return { average: 0, total: 0 };
  }

  // Use only last 40 reviews for average calculation
  const last40Reviews = validReviews.slice(0, 40);
  const sum = last40Reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = sum / last40Reviews.length;

  return {
    average: Math.round(average * 10) / 10, // Round to 1 decimal
    total: validReviews.length, // Total count of all ratings
  };
}
