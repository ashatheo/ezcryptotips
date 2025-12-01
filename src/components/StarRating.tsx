import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxStars?: number;
  size?: number;
  color?: string;
  readOnly?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  maxStars = 5,
  size = 24,
  color = '#00eb78',
  readOnly = false
}) => {
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleClick = (starIndex: number) => {
    if (!readOnly) {
      onRatingChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (!readOnly) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(0);
    }
  };

  return (
    <div className="flex gap-1">
      {[...Array(maxStars)].map((_, index) => {
        const starIndex = index + 1;
        const isActive = hoverRating >= starIndex || (!hoverRating && rating >= starIndex);

        return (
          <button
            key={starIndex}
            type="button"
            onClick={() => handleClick(starIndex)}
            onMouseEnter={() => handleMouseEnter(starIndex)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={`transition-all ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
            aria-label={`Rate ${starIndex} out of ${maxStars} stars`}
          >
            <Star
              size={size}
              fill={isActive ? color : 'none'}
              stroke={isActive ? color : '#6b7280'}
              className="transition-all"
            />
          </button>
        );
      })}
    </div>
  );
};
