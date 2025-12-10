/**
 * WaiterRatingCard Component
 * Displays waiter rating (max 5.0) based on last 40 reviews
 * Shows on waiter profile page and payment page
 */

import React, { useEffect, useState } from 'react';
import { getWaiterReviews, calculateAverageRating, type StoredReview } from '../lib/hcsReviewService';
import { ReviewSummaryCard } from './ui/review-summary-card';
import { Shield, MessageSquare, Star } from 'lucide-react';

interface WaiterRatingCardProps {
  waiterId: string;
  waiterName?: string;
  compact?: boolean; // Compact mode for payment page
}

export const WaiterRatingCard: React.FC<WaiterRatingCardProps> = ({
  waiterId,
  waiterName,
  compact = false
}) => {
  const [reviews, setReviews] = useState<StoredReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        const reviewsData = await getWaiterReviews(waiterId);
        setReviews(reviewsData.slice(0, 3)); // Only last 3 reviews

        // Calculate average rating
        const { average, total } = calculateAverageRating(reviewsData);
        setAverageRating(average);
        setTotalRatings(total);
      } catch (error) {
        console.error('Failed to load reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    if (waiterId) {
      loadReviews();
    }
  }, [waiterId]);

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-black border border-gray-800 rounded-xl`}>
        <p className="text-gray-500 text-center text-sm">Loading rating...</p>
      </div>
    );
  }

  // No reviews yet
  if (totalRatings === 0) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-black border border-gray-800 rounded-xl`}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-6 h-6 text-gray-600" />
            <span className="text-2xl font-bold text-gray-600">—</span>
          </div>
          <p className="text-gray-500 text-sm">No ratings yet</p>
          <p className="text-gray-600 text-xs mt-1">Be the first to leave a review!</p>
        </div>
      </div>
    );
  }

  // Generate summary text
  const summaryText = `Outstanding: Rated ${averageRating.toFixed(1)} with ${totalRatings} ${totalRatings === 1 ? 'review' : 'reviews'}${waiterName ? ` for ${waiterName}` : ''}.`;

  return (
    <div className="space-y-6">
      {/* Use new ReviewSummaryCard component */}
      <div className="flex justify-center">
        <ReviewSummaryCard
          rating={averageRating}
          reviewCount={totalRatings}
          maxRating={5}
          summaryText={summaryText}
          className="bg-black border-gray-800"
        />
      </div>

      {/* Last 3 Reviews */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-400">Recent Reviews</p>
          </div>

          {reviews.map((review) => (
            <div
              key={review.id}
              className={`${compact ? 'p-3' : 'p-4'} bg-gray-900/30 border border-gray-800/50 rounded-lg`}
            >
              {/* Rating */}
              {review.rating && review.rating > 0 && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-4 h-4 text-[#00eb78] fill-[#00eb78]" />
                  <span className="text-sm font-semibold text-white">{review.rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-500">/5</span>
                </div>
              )}

              {/* Comment */}
              {review.comment && (
                <p className="text-gray-300 text-sm line-clamp-2">{review.comment}</p>
              )}

              {/* Timestamp */}
              {review.hcsTimestamp && (
                <p className="text-xs text-gray-600 mt-2">
                  {new Date(parseInt(review.hcsTimestamp.split('.')[0]) * 1000).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          ))}

          {/* View all link */}
          {!compact && reviews.length >= 3 && (
            <div className="text-center pt-2">
              <button className="text-sm text-gray-500 hover:text-[#00eb78] transition-colors">
                View all reviews →
              </button>
            </div>
          )}
        </div>
      )}

      {/* HCS Badge */}
      {compact && (
        <div className="pt-3 border-t border-gray-800/50">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Shield className="w-3 h-3 text-[#00eb78]" />
            <span>Reviews verified on Hedera blockchain</span>
          </div>
        </div>
      )}
    </div>
  );
};
