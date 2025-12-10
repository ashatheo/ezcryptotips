/**
 * ReviewList Component
 * Displays reviews with HCS verification badges
 * Shows reviews stored on Hedera Consensus Service (tamper-proof)
 */

import React, { useEffect, useState } from 'react';
import { ReviewCard } from './ui/review-card';
import { getWaiterReviews, getReviewHashScanUrl, type StoredReview } from '../lib/hcsReviewService';
import { Shield, ExternalLink, Clock } from 'lucide-react';

interface ReviewListProps {
  waiterId: string;
  maxReviews?: number;
}

export const ReviewList: React.FC<ReviewListProps> = ({ waiterId, maxReviews = 10 }) => {
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        const reviewsData = await getWaiterReviews(waiterId);
        setReviews(reviewsData.slice(0, maxReviews));
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (waiterId) {
      loadReviews();
    }
  }, [waiterId, maxReviews]);

  if (loading) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-xl">
        <p className="text-gray-500 text-center">Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="p-6 bg-black border border-gray-800 rounded-xl text-center">
        <p className="text-gray-500">No reviews yet</p>
        <p className="text-gray-600 text-sm mt-2">Be the first to leave a review!</p>
      </div>
    );
  }

  // Helper function to generate avatar URL or use initials
  const getAvatarUrl = (review: StoredReview): string => {
    // Use Unsplash random avatar as placeholder
    const seed = review.reviewerAccount || review.id || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
  };

  // Helper function to generate reviewer handle
  const getReviewerHandle = (review: StoredReview): string => {
    if (review.reviewerAccount) {
      // Shorten Hedera account ID: 0.0.12345 -> 0.0.***45
      const parts = review.reviewerAccount.split('.');
      if (parts.length === 3) {
        return `${parts[0]}.${parts[1]}.${'*'.repeat(parts[2].length - 2)}${parts[2].slice(-2)}`;
      }
    }
    return 'Anonymous User';
  };

  // Helper function to get reviewer name
  const getReviewerName = (review: StoredReview): string => {
    // If we have waiter name from review, use it as "Customer"
    return review.waiterName ? 'Satisfied Customer' : 'Anonymous';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Customer Reviews</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-4 h-4 text-[#00eb78]" />
          <span>Verified on HCS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review) => (
          <div key={review.id} className="relative">
            <ReviewCard
              name={getReviewerName(review)}
              handle={getReviewerHandle(review)}
              review={review.comment || 'No comment provided'}
              rating={review.rating || 0}
              imageUrl={getAvatarUrl(review)}
              className="bg-black border-gray-800 h-full"
            />

            {/* HCS Verification Footer */}
            <div className="mt-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {review.verified && (
                  <div className="flex items-center gap-1 text-[#00eb78]">
                    <Shield className="w-3 h-3" />
                    <span>HCS Verified</span>
                  </div>
                )}
                {review.hcsTimestamp && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="w-3 h-3" />
                    <span>
                      {new Date(parseInt(review.hcsTimestamp.split('.')[0]) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* HashScan Link */}
              {review.hcsMessageId && (
                <a
                  href={getReviewHashScanUrl(review.hcsMessageId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-gray-500 hover:text-[#00eb78] transition-colors"
                >
                  <span>HashScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Tip Amount Badge */}
            {review.tipAmount && (
              <div className="absolute top-2 right-2 bg-[#00eb78]/10 border border-[#00eb78]/30 rounded-full px-3 py-1">
                <span className="text-xs font-semibold text-[#00eb78]">
                  {review.tipAmount} {review.tipToken || 'HBAR'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info about HCS */}
      <div className="p-3 bg-gray-900/30 border border-gray-800/50 rounded-lg">
        <div className="flex items-start gap-2">
          <Shield className="w-4 h-4 text-[#00eb78] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-500">
            <p className="font-semibold text-gray-400 mb-1">Tamper-Proof Reviews</p>
            <p>
              All reviews are permanently stored on Hedera Consensus Service (HCS), making them
              immutable and publicly verifiable on the blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
