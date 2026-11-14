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

/** Jenis transaksi kas (SKPL KF-08). */
export type CashTransactionType = "MASUK" | "KELUAR";

/** Row of `cash_transactions` (SKPL §3.4). */
export interface CashTransaction {
  id: string;
  type: CashTransactionType;
  /** Rupiah, at most 2 decimals. */
  amount: number;
  description: string;
  /** YYYY-MM-DD */
  transactionDate: string;
  /** Idempotency key sent on create (AB-03.4). */
  requestKey: string;
  /** User id (`created_by`). */
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  /** Soft delete marker. */
  deletedAt: string | null;
}

export type UserRole = "PETUGAS" | "SUPERADMIN";

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
}

/** Monthly disaster count per type, used by the dashboard trend chart. */
export interface DisasterTrendPoint {
  month: string;
  banjir: number;
  gempa: number;
  longsor: number;
  lainnya: number;
}
