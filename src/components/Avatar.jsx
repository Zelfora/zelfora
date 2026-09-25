import { useState } from 'react';

// A user's profile photo, or the first letter of their name or email when
// there is none (or the link is broken).
function Avatar({ src, name, className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && failedSrc !== src;

  return (
    <span
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-accent-500 font-display font-bold uppercase text-white ${className}`}
    >
      {showImage ? (
        <img src={src} alt="" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      ) : (
        (name?.[0] ?? '?')
      )}
    </span>
  );
}

export default Avatar;
