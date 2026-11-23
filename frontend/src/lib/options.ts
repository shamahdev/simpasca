import type { HandlingScale, HandlingStatus, ItemCategory, NeedType } from "./types.ts";

/** Client-safe option lists for disaster forms and filters. */
export const DISASTER_TYPES = [
  "Banjir",
  "Banjir bandang",
  "Tanah longsor",
  "Gempa bumi",
  "Tsunami",
  "Erupsi gunung api",
  "Angin kencang",
  "Kebakaran hutan dan lahan",
  "Kekeringan",
  "Gelombang pasang dan abrasi",
];

export const HANDLING_STATUSES: HandlingStatus[] = ["AKTIF", "SELESAI"];
export const HANDLING_SCALES: HandlingScale[] = ["KABUPATEN_KOTA", "PROVINSI", "NASIONAL"];

/** Perka BNPB 23/2014 Pasal 8 (AC-21). */
export const ITEM_CATEGORIES: ItemCategory[] = ["PANGAN", "SANDANG", "PAPAN", "LOGISTIK_LAINNYA"];
export const NEED_TYPES: NeedType[] = ["HARIAN", "SATU_KALI"];
/** Pangan is a daily need by default, everything else one-time (KF-04.1). */
export const defaultNeedType = (category: ItemCategory): NeedType =>
  category === "PANGAN" ? "HARIAN" : "SATU_KALI";
/** Kondisi barang saat diterima; the API stores free text. */
export const ITEM_CONDITIONS = ["Baik", "Rusak ringan", "Rusak berat"];
