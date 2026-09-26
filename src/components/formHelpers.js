// Shared styling and parsing for cards and forms, so every page looks and
// behaves the same.

// A section of a page, such as a form or a list, on a translucent card.
export const cardClass = 'rounded-card border border-border bg-surface/70 p-6 backdrop-blur-md';

// A warning in the flow of a page, such as "this restaurant is closed".
export const noticeClass = 'rounded-card border border-warn-400/50 bg-warn-400/10 p-4 text-sm text-text';

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

// An amount as the owner types it back into a form, such as "12,50" in Dutch:
// two decimals, no currency sign and no thousands separator, so parseAmount
// reads it again.
export function formatAmount(amount, locale) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, useGrouping: false }).format(amount);
}
