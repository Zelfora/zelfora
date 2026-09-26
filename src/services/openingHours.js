// Opening hours as stored in restaurants.opening_hours: ISO weekday (1 =
// Monday) to [opens, closes] in Dutch time, e.g. { "1": ["11:00", "22:00"] }.
// A missing day is closed, and a closing time at or before the opening time
// runs past midnight. Whether a restaurant is open right now is decided by the
// database (is_open in restaurant_owners.sql), so it's never computed here.

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value) {
  return TIME_PATTERN.test(value);
}

// Localized name of an ISO weekday. 1 January 2024 was a Monday.
export function weekdayName(isoDay, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2024, 0, isoDay))
  );
}

// Today's ISO weekday in the Netherlands, where the hours apply.
export function todayWeekday() {
  const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Amsterdam' }).format(
    new Date()
  );
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(name) + 1;
}
