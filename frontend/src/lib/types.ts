/** Status penanganan (PRD KF-03). Operational only, not an official emergency status. */
export type HandlingStatus = "aktif" | "selesai";

/** Skala penanganan berdasarkan tingkat administratif (PRD KF-03). */
export type HandlingScale = "kabupaten" | "provinsi" | "nasional";

export interface Disaster {
  id: string;
  type: string;
  province: string;
  regency: string;
  locationNote: string;
  latitude: number | null;
  longitude: number | null;
  status: HandlingStatus;
  scale: HandlingScale;
  /** ISO 8601 date-time with offset. */
  occurredAt: string;
  affectedPeople: number;
  affectedFamilies: number | null;
  impactNotes: string;
}

/** Status pengiriman (PRD KF-07). */
export type ShipmentStatus = "dikirim" | "diterima";

export interface ShipmentItem {
  itemName: string;
  quantity: number;
  unit: string;
}

export interface Shipment {
  id: string;
  code: string;
  disasterId: string;
  destination: string;
  personInCharge: string;
  shippedAt: string;
  receivedAt: string | null;
  status: ShipmentStatus;
  items: ShipmentItem[];
}

/** Jenis transaksi kas (PRD KF-08). */
export type CashTransactionKind = "masuk" | "keluar";

export interface CashTransaction {
  id: string;
  kind: CashTransactionKind;
  amount: number;
  description: string;
  date: string;
}

/** Monthly disaster count per type, used by the dashboard trend chart. */
export interface DisasterTrendPoint {
  month: string;
  banjir: number;
  gempa: number;
  longsor: number;
  lainnya: number;
}
