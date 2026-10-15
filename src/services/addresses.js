// Address suggestions for the Netherlands, from PDOK's Locatieserver: the
// government's free search over the BAG, the official register of every Dutch
// address. It needs no key and accepts requests from any site; its address is
// in the CSP's connect-src in vercel.json.
const SUGGEST_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest';

// Shorter input matches too many streets to be useful.
export const MIN_QUERY_LENGTH = 3;

// The addresses that best match what was typed so far, as [{ id, label }] with
// labels such as "Damrak 1, 1012 LG Amsterdam". Throws when the request fails
// or is aborted through signal.
export async function suggestAddresses(query, { signal } = {}) {
  const url = new URL(SUGGEST_URL);
  url.search = new URLSearchParams({ q: query, fq: 'type:adres', fl: 'id,weergavenaam', rows: '6' });
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Address suggestions failed with status ${response.status}`);
  const data = await response.json();
  return (data.response?.docs ?? []).map((doc) => ({ id: doc.id, label: formatPostcode(doc.weergavenaam) }));
}

// PDOK writes postcodes as "1012LG"; people write "1012 LG".
function formatPostcode(label) {
  return label.replace(/\b(\d{4})([A-Z]{2})\b/, '$1 $2');
}
