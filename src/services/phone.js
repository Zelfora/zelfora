// Checks and tidies the phone number on an order, so the restaurant can always
// call back. Dutch numbers follow a fixed plan: a 0 and nine more digits, or
// +31 and those nine. Foreign numbers can't be checked that closely without
// every country's plan (libphonenumber-js has them, but would add about 30 kB
// gzipped for every customer), so any + number of 7 to 15 digits, the
// international limit, is accepted.

// Dutch area codes of two digits after the 0 (020 Amsterdam, 085 for
// companies). The others have three (0111), and mobile numbers start with 06.
// Only the space in the tidied number depends on this list.
const TWO_DIGIT_AREA_CODES = new Set([
  '10', '13', '15', '20', '23', '24', '26', '30', '33', '35', '36', '38', '40', '43', '45', '46', '50', '53',
  '55', '58', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '84', '85', '87', '88', '91',
]);

// The number in one format, such as "06 12345678", "020 1234567" or
// "+32470123456", or null if it can't be a phone number. Spaces, dashes, dots,
// slashes and brackets may be typed anywhere.
export function normalizePhone(input) {
  // "+31 (0)6 ...": the (0) is the 0 dropped when calling from abroad.
  const compact = input.replace(/\(0\)/g, '').replace(/[\s\-./()]/g, '');

  let international = null;
  if (/^\+\d+$/.test(compact)) international = compact.slice(1);
  else if (/^00\d+$/.test(compact)) international = compact.slice(2);
  else if (!/^\d+$/.test(compact)) return null;

  let national;
  if (international === null) {
    if (!compact.startsWith('0')) return null;
    national = compact.slice(1);
  } else if (international.startsWith('31')) {
    // Also "+31 06 ...", a common slip.
    national = international.slice(2).replace(/^0/, '');
  } else {
    return /^[1-9]\d{6,14}$/.test(international) ? `+${international}` : null;
  }

  if (!/^[1-9]\d{8}$/.test(national)) return null;
  let areaLength = 3;
  if (national.startsWith('6')) areaLength = 1;
  else if (TWO_DIGIT_AREA_CODES.has(national.slice(0, 2))) areaLength = 2;
  return `0${national.slice(0, areaLength)} ${national.slice(areaLength)}`;
}
