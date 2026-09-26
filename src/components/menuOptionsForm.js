// The options of a dish (menu_items.options, see services/menuOptions.js) as
// the owner edits them in MenuOptionsEditor: counts and prices as typed text.
// These limits match valid_menu_options in supabase/restaurant_owners.sql.
import { parseAmount } from './formHelpers';

export const MAX_GROUPS = 20;
export const MAX_CHOICES = 30;
export const MAX_NAME_LENGTH = 60;
export const MAX_OPTION_PRICE = 99.99;

export function newOptionGroup() {
  return { id: crypto.randomUUID(), name: '', min: '0', max: '', choices: [newOptionChoice(), newOptionChoice()] };
}

export function newOptionChoice() {
  return { id: crypto.randomUUID(), name: '', price: '' };
}

// freshIds gives copied groups new ids, so copying twice can't repeat one.
export function toEditableOptions(options, formatAmount, { freshIds = false } = {}) {
  const id = (existing) => (freshIds ? crypto.randomUUID() : existing);
  return options.map((group) => ({
    id: id(group.id),
    name: group.name,
    min: String(group.min),
    max: group.max === null || group.max === undefined ? '' : String(group.max),
    choices: group.choices.map((choice) => ({
      id: id(choice.id),
      name: choice.name,
      price: Number(choice.price) > 0 ? formatAmount(choice.price) : '',
    })),
  }));
}

// A whole number as typed: empty gives fallback, anything else NaN.
export function parseCount(value, fallback) {
  const trimmed = value.trim();
  if (trimmed === '') return fallback;
  return /^\d{1,2}$/.test(trimmed) ? Number(trimmed) : NaN;
}

// Turns the edited groups back into menu_items.options. Returns { options },
// or { error, vars } with a translation key for the first problem. Choice
// rows left empty are skipped, and so are groups left entirely empty.
export function parseEditableOptions(groups) {
  const options = [];
  for (const group of groups) {
    const name = group.name.trim();
    const rows = group.choices.filter((choice) => choice.name.trim() || choice.price.trim());
    if (!name && rows.length === 0) continue;
    if (!name) return { error: 'partner.options.error.groupName' };

    const vars = { group: name };
    if (rows.length === 0) return { error: 'partner.options.error.noChoices', vars };

    const choices = [];
    for (const row of rows) {
      const choiceName = row.name.trim();
      if (!choiceName) return { error: 'partner.options.error.choiceName', vars };
      const price = row.price.trim() === '' ? 0 : parseAmount(row.price);
      if (Number.isNaN(price) || price > MAX_OPTION_PRICE) return { error: 'partner.options.error.price', vars };
      choices.push({ id: row.id, name: choiceName, price });
    }

    const min = parseCount(group.min, 0);
    const max = parseCount(group.max, null);
    if (Number.isNaN(min) || Number.isNaN(max) || max === 0) return { error: 'partner.options.error.count', vars };
    if (min > choices.length) return { error: 'partner.options.error.minTooHigh', vars };
    if (max !== null && max < min) return { error: 'partner.options.error.maxBelowMin', vars };

    options.push({ id: group.id, name, min, max, choices });
  }
  return { options };
}
