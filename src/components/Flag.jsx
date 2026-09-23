import { useId } from 'react';

// Inline SVG flags: emoji flags render as plain letters on Windows.
function Flag({ code, className = 'h-3.5 w-5' }) {
  const id = useId();
  const shared = {
    className: `${className} flex-shrink-0 overflow-hidden rounded-[3px] ring-1 ring-text/15`,
    preserveAspectRatio: 'xMidYMid slice',
    'aria-hidden': true,
  };

  if (code === 'nl') {
    return (
      <svg viewBox="0 0 9 6" {...shared}>
        <rect width="9" height="6" fill="#21468B" />
        <rect width="9" height="4" fill="#FFFFFF" />
        <rect width="9" height="2" fill="#AE1C28" />
      </svg>
    );
  }

  if (code === 'de') {
    return (
      <svg viewBox="0 0 5 3" {...shared}>
        <rect width="5" height="3" fill="#FFCE00" />
        <rect width="5" height="2" fill="#DD0000" />
        <rect width="5" height="1" fill="#000000" />
      </svg>
    );
  }

  if (code === 'en') {
    const clip = `${id}-diag`;
    return (
      <svg viewBox="0 0 60 30" {...shared}>
        <clipPath id={clip}>
          <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </clipPath>
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </svg>
    );
  }

  return null;
}

export default Flag;
