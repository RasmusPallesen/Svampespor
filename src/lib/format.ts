/**
 * Danske dato- og talformater via `Intl` — aldrig håndlavede forkortelser
 * (tidlig bug: 'tor' + 'dag' → "tordag").
 */

const short = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'short' });
const long = new Intl.DateTimeFormat('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
const weekdayLong = new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'short' });

const noon = (iso: string) => new Date(`${iso}T12:00:00`);

export const fmtDate = (iso: string) => short.format(noon(iso));
export const fmtLongDate = (iso: string) => long.format(noon(iso));
export const fmtWeekday = (iso: string) => weekdayLong.format(noon(iso));

export const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
