/**
 * ReviewList Component
 * Displays reviews with HCS verification badges
 * Shows reviews stored on Hedera Consensus Service (tamper-proof)
 */

import React, { useEffect, useState } from 'react';
import { StarRating } from './StarRating';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white">Customer Reviews</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-4 h-4 text-[#00eb78]" />
          <span>Verified on HCS</span>
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="p-4 bg-black border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            {/* Rating */}
            {review.rating && review.rating > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <StarRating
                  rating={review.rating}
                  onRatingChange={() => {}}
                  size={16}
                  color="#00eb78"
                  readonly
                />
                <span className="text-sm text-gray-400">{review.rating}/5</span>
              </div>
            )}

            {/* Comment */}
            {review.comment && (
              <p className="text-gray-300 text-sm mb-3">{review.comment}</p>
            )}

            {/* Tip Amount */}
            {review.tipAmount && (
              <p className="text-xs text-gray-500 mb-2">
                Tip: {review.tipAmount} {review.tipToken || 'HBAR'}
              </p>
            )}

            {/* Footer with verification */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-800/50">
              <div className="flex items-center gap-2">
                {review.verified && (
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#00eb78]" />
                    <span className="text-xs text-[#00eb78]">HCS Verified</span>
                  </div>
                )}
                {review.hcsTimestamp && (
                  <div className="flex items-center gap-1 text-xs text-gray-600">
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
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#00eb78] transition-colors"
                >
                  <span>View on HashScan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
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
