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

/** "2026-06-16T08:30:00+07:00" → "16 Juni 2026 · 08.30 WIB" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${longDateFormat.format(date)} · ${timeFormat.format(date)} WIB`;
}

/** "Kab. Bandung" → "Bandung" */
export function shortRegencyName(regency: string): string {
  return regency.replace(/^(Kab\.|Kota)\s+/, "");
}
