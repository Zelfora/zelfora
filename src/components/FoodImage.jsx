import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

// Restaurant or dish photo. Owners can leave the image out or paste a link
// that breaks, so this falls back to a placeholder instead of a broken image.
function FoodImage({ src, alt, className = '', iconSize = 28 }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-primary-500/25 to-accent-500/25 text-primary-300 ${className}`}
      >
        <UtensilsCrossed size={iconSize} />
      </div>
    );
  }

  return <img src={src} alt={alt} onError={() => setFailedSrc(src)} className={className} />;
}

export default FoodImage;
