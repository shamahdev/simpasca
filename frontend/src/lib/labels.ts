import type {
  CashTransactionType,
  HandlingScale,
  HandlingStatus,
  ItemCategory,
  MovementType,
  NeedType,
  ShipmentStatus,
} from "./types";

export const handlingStatusLabel: Record<HandlingStatus, string> = {
  AKTIF: "Aktif",
  SELESAI: "Selesai",
};

export const handlingScaleLabel: Record<HandlingScale, string> = {
  KABUPATEN_KOTA: "Kabupaten/Kota",
  PROVINSI: "Provinsi",
  NASIONAL: "Nasional",
};

export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  DIKIRIM: "Dikirim",
  DITERIMA: "Diterima",
};

export const itemCategoryLabel: Record<ItemCategory, string> = {
  PANGAN: "Pangan",
  SANDANG: "Sandang",
  PAPAN: "Papan",
  LOGISTIK_LAINNYA: "Logistik lainnya",
};

export const needTypeLabel: Record<NeedType, string> = {
  HARIAN: "Harian",
  SATU_KALI: "Satu kali",
};

export const movementTypeLabel: Record<MovementType, string> = {
  STOK_AWAL: "Stok awal",
  PENERIMAAN: "Penerimaan",
  PENGIRIMAN: "Pengiriman",
  KOREKSI: "Koreksi",
};

export const fulfillmentLabel = {
  TERPENUHI: "Terpenuhi",
  KURANG: "Kurang",
  TANPA_RASIO: "Tanpa rasio",
} as const;

export const cashTypeLabel: Record<CashTransactionType, string> = {
  MASUK: "Masuk",
  KELUAR: "Keluar",
};

/** "Pemasukan Rp…" / "Pengeluaran Rp…" wording used in dialogs and audit notes. */
export const cashTypeNoun: Record<CashTransactionType, string> = {
  MASUK: "pemasukan",
  KELUAR: "pengeluaran",
};
