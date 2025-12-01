import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'ez-crypto-tips';

interface WaiterRating {
  averageRating: number;
  totalReviews: number;
  totalRatings: number;
  isLoading: boolean;
}

export const useWaiterRating = (waiterId: string | undefined): WaiterRating => {
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRating = async () => {
      if (!waiterId || !db) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const reviewsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reviews');
        const q = query(reviewsRef, where('waiterId', '==', waiterId));
        const querySnapshot = await getDocs(q);

        let totalRatingSum = 0;
        let ratingCount = 0;
        const reviewCount = querySnapshot.size;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.rating && typeof data.rating === 'number') {
            totalRatingSum += data.rating;
            ratingCount++;
          }
        });

        const avgRating = ratingCount > 0 ? totalRatingSum / ratingCount : 0;

        setAverageRating(avgRating);
        setTotalReviews(reviewCount);
        setTotalRatings(ratingCount);
      } catch (error) {
        console.error('Error fetching waiter ratings:', error);
        setAverageRating(0);
        setTotalReviews(0);
        setTotalRatings(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRating();
  }, [waiterId]);

  return { averageRating, totalReviews, totalRatings, isLoading };
};
