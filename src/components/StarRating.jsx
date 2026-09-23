import { Star } from 'lucide-react';

function StarRating({ rating }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-1 text-sm font-semibold text-text">
      <Star size={14} className="fill-warn-400 text-warn-400" />
      {rating}
    </span>
  );
}

export default StarRating;
