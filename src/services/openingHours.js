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

// The ISO weekday whose hours apply right now in the Netherlands: yesterday
// while its hours run past midnight (at 00:30 on Sunday, Saturday's 17:00 –
// 01:00), otherwise today. pastMidnight tells which. Only for showing the hours;
// whether the restaurant is open still comes from the database.
export function currentHoursDay(hours) {
  const parts = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Amsterdam',
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  const today = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(part('weekday')) + 1;
  const time = `${part('hour')}:${part('minute')}`;

  // Same rule as is_within_opening_hours; "HH:MM" strings compare like times.
  const yesterday = ((today + 5) % 7) + 1;
  const period = hours?.[yesterday];
  if (period && period[1] <= period[0] && time < period[1]) {
    return { day: yesterday, pastMidnight: true };
  }
  return { day: today, pastMidnight: false };
}
