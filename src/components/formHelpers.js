// Shared styling and parsing for forms, so every form looks and behaves the same.

const fieldClass =
  'border border-border bg-bg px-4 py-2.5 text-text placeholder:text-text-faint outline-none focus:border-primary-500 focus:shadow-glow';

export const inputClass = `rounded-pill ${fieldClass}`;
export const textareaClass = `rounded-card ${fieldClass} resize-y`;

export const primaryButtonClass =
  'rounded-pill bg-gradient-to-r from-primary-500 to-accent-500 px-5 py-2.5 font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60';

export const secondaryButtonClass =
  'rounded-pill border border-border px-5 py-2.5 font-medium text-text transition-colors hover:border-primary-500 disabled:opacity-60';

// Parses a euro amount typed as "12,50" or "12.50". Returns NaN for anything
// else, including more than two decimals.
export function parseAmount(value) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  return Number(normalized);
}
