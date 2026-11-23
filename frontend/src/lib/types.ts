/** Status penanganan (SKPL KF-03). Operational only, not an official emergency status. */
export type HandlingStatus = "AKTIF" | "SELESAI";

/** Skala penanganan berdasarkan tingkat administratif (SKPL KF-03). */
export type HandlingScale = "KABUPATEN_KOTA" | "PROVINSI" | "NASIONAL";

/** Row of `disasters` (SKPL §3.4). */
export interface Disaster {
  id: string;
  /** Display code derived from the id, e.g. "BCN-0001". */
  code: string;
  disasterType: string;
  province: string;
  regencyCity: string;
  latitude: number | null;
  longitude: number | null;
  locationDetails: string;
  status: HandlingStatus;
  handlingScale: HandlingScale;
  /** ISO 8601 date-time with offset. */
  occurredAt: string;
  affectedPeople: number;
  affectedHouseholds: number | null;
  impactNotes: string;
  createdBy: number;
}

/** Kategori barang (Perka BNPB 23/2014 Pasal 8). */
export type ItemCategory = "PANGAN" | "SANDANG" | "PAPAN" | "LOGISTIK_LAINNYA";

export type NeedType = "HARIAN" | "SATU_KALI";

/** Row of `inventory_items` (SKPL §3.4). */
export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  stockUnit: string;
  initialStock: number;
  /** Need per person; null or <= 0 means no recommendation (KF-04.2). */
  needRatio: number | null;
  needType: NeedType | null;
  /** Basis of the ratio, e.g. "orang/hari". */
  ratioBasis: string | null;
  /** YYYY-MM-DD, food only. */
  expirationDate: string | null;
}

/** Jenis pergerakan stok (SKPL KF-06.2). */
export type MovementType = "STOK_AWAL" | "PENERIMAAN" | "PENGIRIMAN" | "KOREKSI";

/** Row of `stock_movements`; stock = SUM(quantityIn) − SUM(quantityOut) (AB-02). */
export interface StockMovement {
  id: string;
  itemId: string;
  disasterId: string | null;
  receiptId: string | null;
  movementType: MovementType;
  quantityIn: number;
  quantityOut: number;
  /** YYYY-MM-DD */
  movementDate: string;
  notes: string;
  createdAt: string;
}

/** Row of `stock_receipts` (SKPL KF-06.1). */
export interface StockReceipt {
  id: string;
  itemId: string;
  quantity: number;
  /** YYYY-MM-DD */
  receiptDate: string;
  sourceGiver: string;
  itemCondition: string;
  notes: string;
  createdBy: number;
}

/** Status pengiriman (SKPL KF-07). */
export type ShipmentStatus = "DIKIRIM" | "DITERIMA";

/** Row of `shipment_items`. */
export interface ShipmentItem {
  /** shipment_items id. */
  id: string;
  itemId: string;
  quantity: number;
}

/** Row of `shipments` (SKPL §3.4). */
export interface Shipment {
  id: string;
  /** Display code derived from the id, e.g. "DST-0001". */
  code: string;
  disasterId: string;
  status: ShipmentStatus;
  /** YYYY-MM-DD */
  shippedAt: string;
  /** YYYY-MM-DD */
  receivedAt: string | null;
  destination: string;
  personInCharge: string;
  requestKey: string;
  items: ShipmentItem[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
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
