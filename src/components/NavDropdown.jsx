import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

// Compact navbar menu for picking one option (language, theme, ...).
// options: [{ value, label, icon, lang? }]
function NavDropdown({ label, value, options, onChange, children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    // Any interaction elsewhere closes the menu: a press outside it (with
    // touch this fires as soon as the finger lands, also when it goes on to
    // scroll), any scrolling, or focus moving away.
    function closeIfOutside(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    // Scroll events don't bubble; capturing also catches scrolling panels.
    document.addEventListener('scroll', close, { capture: true, passive: true });
    // Also when the page is already at its end and doesn't move.
    window.addEventListener('wheel', close, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
      document.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('wheel', close);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  function choose(next) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="flex h-9 items-center gap-1.5 rounded-pill border border-border px-2.5 text-xs font-semibold uppercase text-text-muted transition-colors hover:border-primary-500 hover:text-text"
      >
        {children}
        <ChevronDown size={14} className={`hidden transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-40 overflow-hidden rounded-card border border-border bg-bg-elevated/95 py-1 shadow-glow backdrop-blur-md"
        >
          {options.map((option) => (
            <li key={option.value} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={option.value === value}
                lang={option.lang}
                onClick={() => choose(option.value)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-text transition-colors hover:bg-surface-hover"
              >
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {option.value === value && <Check size={16} className="text-primary-300" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NavDropdown;
