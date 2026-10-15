import { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { MIN_QUERY_LENGTH, suggestAddresses } from '../services/addresses';

// How long typing has to pause before suggestions are asked for.
const DEBOUNCE_MS = 250;

// A text input that suggests Dutch addresses while typing (see
// services/addresses.js). Picking one fills in the input. Typed text is kept as
// it is too, so an address the register lacks, or the service being down,
// never blocks the form. onChange receives the new text, not an event.
// Wrap it in <FormField controlId={id}>: the suggestion list can't sit inside
// a <label>. The browser's own autofill is off, because it would cover the list.
function AddressInput({ id, value, onChange, className = '', ...inputProps }) {
  const { t } = useTranslation();
  const listId = useId();
  const inputRef = useRef(null);
  // What to look up: the trimmed text while the owner types, '' once they pick.
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  // The suggestion picked with the arrow keys, -1 for none.
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const results = await suggestAddresses(query, { signal: controller.signal });
        setSuggestions(results);
        setActiveIndex(-1);
        // Not when focus moved on while the request was underway.
        setOpen(document.activeElement === inputRef.current);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error(err);
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const showList = open && suggestions.length > 0;

  function handleChange(e) {
    const text = e.target.value;
    onChange(text);
    const trimmed = text.trim();
    if (trimmed.length >= MIN_QUERY_LENGTH) {
      // The previous suggestions stay up until the new ones arrive.
      setQuery(trimmed);
    } else {
      setQuery('');
      setSuggestions([]);
    }
  }

  function choose(suggestion) {
    onChange(suggestion.label);
    setQuery('');
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      e.preventDefault();
      const down = e.key === 'ArrowDown';
      if (!showList) {
        setOpen(true);
        setActiveIndex(down ? 0 : suggestions.length - 1);
        return;
      }
      // Past the last suggestion (or above the first) comes the typed text, -1.
      const count = suggestions.length + 1;
      setActiveIndex((i) => ((i + 1 + (down ? 1 : -1) + count) % count) - 1);
    } else if (e.key === 'Enter' && showList) {
      if (activeIndex >= 0) {
        // Pick the suggestion instead of submitting the form.
        e.preventDefault();
        choose(suggestions[activeIndex]);
      } else {
        setOpen(false);
      }
    } else if (e.key === 'Escape' && showList) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <input
        {...inputProps}
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`w-full ${className}`}
      />
      {/* A press on a suggestion keeps focus in the input (no mousedown
          default), so its blur doesn't close the list before the click lands. */}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('form.addressSuggestions')}
          className="absolute inset-x-0 top-full z-20 mt-2 overflow-clip rounded-card border border-border bg-bg-elevated/95 py-1 shadow-glow backdrop-blur-md"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(suggestion)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-text transition-colors ${
                index === activeIndex ? 'bg-surface-hover' : 'hover:bg-surface-hover'
              }`}
            >
              <MapPin size={16} className="shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0">{suggestion.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddressInput;
