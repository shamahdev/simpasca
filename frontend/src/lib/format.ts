const LOCALE = "id-ID";
const TIME_ZONE = "Asia/Jakarta";

const numberFormat = new Intl.NumberFormat(LOCALE);

const shortDateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const longDateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const timeFormat = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: TIME_ZONE,
});

/** 1850 → "1.850" */
export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** 47500000 → "Rp47.500.000", -5000 → "-Rp5.000" */
export function formatRupiah(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}Rp${numberFormat.format(Math.abs(value))}`;
}

/** "2026-06-17" → "17 Jun 2026" */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso));
}

const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** "2026-06-17" → "Juni 2026" */
export function formatMonth(iso: string): string {
  return monthFormat.format(new Date(iso));
}

/** "2026-06-17" → "17 Juni 2026" */
export function formatLongDate(iso: string): string {
  return longDateFormat.format(new Date(iso));
}

/** "2026-06-16T08:30:00+07:00" → "16 Juni 2026 · 08.30 WIB" */
export function formatDateTime(iso: string, separator = " · "): string {
  const date = new Date(iso);
  return `${longDateFormat.format(date)}${separator}${timeFormat.format(date)} WIB`;
}

/** "2026-06-17T09:15:00+07:00" → "17 Jun 2026, 09.15" */
export function formatShortDateTime(iso: string): string {
  const date = new Date(iso);
  return `${shortDateFormat.format(date)}, ${timeFormat.format(date)}`;
}

/** Today's date in Jakarta as "YYYY-MM-DD". */
export function todayIsoDate(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
}

/** "Kab. Bandung" → "Bandung" */
export function shortRegencyName(regency: string): string {
  return regency.replace(/^(Kab\.|Kota)\s+/, "");
}
