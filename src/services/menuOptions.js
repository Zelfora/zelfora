// Options customers pick when adding a dish, such as a size, a sauce or extra
// cheese. menu_items.options holds a list of groups (see
// supabase/restaurant_owners.sql):
//   [{ id, name, min, max, choices: [{ id, name, price }] }]
// From each group the customer picks at least min and at most max choices
// (max null: no limit). Ids are unique within the dish, so a picked choice is
// kept as just its id. The database checks the picks and their prices again
// when the order is placed (validate_order in supabase/orders.sql).

// Most of one cart line; validate_order allows 1 to 99.
export const MAX_QUANTITY = 99;

export function optionGroups(item) {
  return Array.isArray(item?.options) ? item.options : [];
}

function hasLimit(group) {
  return group.max !== null && group.max !== undefined;
}

export function pickedCount(group, picked) {
  return group.choices.filter((choice) => picked.has(choice.id)).length;
}

// Whether the group has the minimum number of picks it needs.
export function isGroupComplete(group, picked) {
  return pickedCount(group, picked) >= group.min;
}

// Whether no more choices can be added to the group.
export function isGroupFull(group, picked) {
  return hasLimit(group) && pickedCount(group, picked) >= group.max;
}

// Required groups of exactly one work like radio buttons: they can't be
// emptied, only switched.
export function isSingleChoice(group) {
  return group.min === 1 && group.max === 1;
}

// Picks or unpicks a choice and returns the new set of picked ids. In a group
// of at most one, picking a choice replaces the one picked before.
export function toggleChoice(group, picked, choiceId) {
  const next = new Set(picked);
  if (next.has(choiceId)) {
    if (!isSingleChoice(group)) next.delete(choiceId);
    return next;
  }
  if (group.max === 1) {
    group.choices.forEach((choice) => next.delete(choice.id));
  } else if (isGroupFull(group, picked)) {
    return picked;
  }
  next.add(choiceId);
  return next;
}

// The picked choices in menu order, the way the cart and orders keep them.
export function pickedOptions(groups, picked) {
  return groups.flatMap((group) =>
    group.choices
      .filter((choice) => picked.has(choice.id))
      .map((choice) => ({ id: choice.id, group: group.name, name: choice.name, price: Number(choice.price) }))
  );
}

// In cents, so 0.1 + 0.2 stays 0.3.
export function sumPrices(prices) {
  return prices.reduce((sum, price) => sum + Math.round(Number(price) * 100), 0) / 100;
}

// Identifies a cart line: the same dish with other options is another line.
export function lineKey(menuItemId, options) {
  return [menuItemId, ...options.map((option) => option.id).sort()].join(':');
}

// "Groot, Extra kaas" for a cart line or an ordered item. Orders from before
// options existed have none.
export function formatOptions(options) {
  return (options ?? []).map((option) => option.name).join(', ');
}

// How many choices the customer may pick, such as "Choose 1".
export function describeRule(group, t) {
  if (!hasLimit(group)) {
    return group.min > 0 ? t('options.rule.atLeast', { min: group.min }) : t('options.rule.any');
  }
  if (group.min === group.max) return t('options.rule.exactly', { count: group.max });
  if (group.min === 0) return t('options.rule.upTo', { max: group.max });
  return t('options.rule.between', { min: group.min, max: group.max });
}
