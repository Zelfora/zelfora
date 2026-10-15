import { Check, ChevronDown } from 'lucide-react';
import { useDropdown } from '../hooks/useDropdown';
import { dropdownPanelClass } from './formHelpers';

// Compact navbar menu for picking one option (such as the language).
// options: [{ value, label, icon, lang? }]
function NavDropdown({ label, value, options, onChange, children }) {
  const { open, setOpen, containerRef, buttonRef } = useDropdown();

  function choose(next) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
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
        <ul role="menu" className={`min-w-40 ${dropdownPanelClass}`}>
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
