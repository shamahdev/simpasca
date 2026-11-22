import type { HandlingScale, HandlingStatus } from "./types.ts";

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
