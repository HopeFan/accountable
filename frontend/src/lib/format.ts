const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** USD 48,000 */
export function money(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}USD ${Math.abs(rounded).toLocaleString("en-US")}`;
}

/** USD 50k, USD 1.2M, USD 800 (chart axes) */
export function moneyCompact(value: number): string {
  const abs = Math.abs(value);
  const trim = (n: number) =>
    String(Math.round(n * 10) / 10).replace(/\.0$/, "");
  if (abs >= 1_000_000) return `USD ${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `USD ${trim(value / 1_000)}k`;
  return `USD ${Math.round(value)}`;
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [y, m, d];
}

/** 17 Nov 2026 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 17 Nov, or 17 Nov 2027 when the year isn't the current one. */
export function formatDateShort(iso: string, today: string): string {
  const [y, m, d] = parts(iso);
  return y === Number(today.slice(0, 4))
    ? `${d} ${MONTHS[m - 1]}`
    : `${d} ${MONTHS[m - 1]} ${y}`;
}

/** 17 Nov 2026, 14:05 */
export function formatDateTime(iso: string): string {
  const time = iso.slice(11, 16);
  return time ? `${formatDate(iso)}, ${time}` : formatDate(iso);
}

/** Tuesday 17 November 2026 */
export function formatLongDate(iso: string): string {
  const [y, m, d] = parts(iso);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${LONG_MONTHS[m - 1]} ${y}`;
}

/** "2026-03" to "Mar" */
export function monthLabel(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1];
}

/** "2026-03" to "Mar 2026" */
export function monthLabelLong(ym: string): string {
  return `${monthLabel(ym)} ${ym.slice(0, 4)}`;
}

export function plural(
  n: number,
  singular: string,
  pluralForm = `${singular}s`,
): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The value for <input type="datetime-local"> from an ISO string. */
export function toLocalInput(iso: string): string {
  return iso.slice(0, 16);
}

/** The person who made a record, or "Sample data" when nobody did. */
export function authorName(email: string | null | undefined): string {
  return email || "Sample data";
}

/** "Added by name@example.com", or "Sample data" when there is no author. */
export function addedBy(email: string | null | undefined): string {
  return email ? `Added by ${email}` : "Sample data";
}
