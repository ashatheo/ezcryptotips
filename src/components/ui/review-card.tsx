import * as React from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Interface for component props for type-safety and reusability
export interface ReviewCardProps {
  name: string;
  handle: string;
  review: string;
  rating: number;
  imageUrl: string;
  className?: string;
}

const ReviewCard = React.forwardRef<HTMLDivElement, ReviewCardProps>(
  ({ name, handle, review, rating, imageUrl, className }, ref) => {
    // Animation variants for framer-motion
    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.4,
          ease: "easeOut",
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "bg-card border rounded-xl p-6 shadow-sm w-full max-w-md",
          className
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        // ARIA attributes for accessibility
        role="article"
        aria-labelledby="review-author"
        aria-describedby="review-content"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={imageUrl}
              alt={`Avatar of ${name}`}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 id="review-author" className="text-lg font-semibold text-white">
                {name}
              </h3>
              <p className="text-sm text-gray-400">{handle}</p>
            </div>
          </div>
          {/* Rating Section */}
          <div className="flex items-center gap-1 text-lg font-bold text-white">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span>{rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Card Body */}
        <p id="review-content" className="mt-4 text-sm text-gray-300">
          {review}
        </p>
      </motion.div>
    );
  }
);

ReviewCard.displayName = "ReviewCard";

export { ReviewCard };
