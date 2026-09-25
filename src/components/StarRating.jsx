import { Sparkles, Star } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

function StarRating({ rating }) {
  const { t } = useTranslation();

  // New restaurants have no rating yet.
  if (rating == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-1 text-sm font-semibold text-text">
        <Sparkles size={14} className="text-accent-400" />
        {t('rating.new')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-2 py-1 text-sm font-semibold text-text">
      <Star size={14} className="fill-warn-400 text-warn-400" />
      {rating}
    </span>
  );
}

export default StarRating;
