import type {
  CashTransactionType,
  HandlingScale,
  HandlingStatus,
  ShipmentStatus,
} from "./types";

export const handlingStatusLabel: Record<HandlingStatus, string> = {
  aktif: "Aktif",
  selesai: "Selesai",
};

export const handlingScaleLabel: Record<HandlingScale, string> = {
  kabupaten: "Kabupaten/Kota",
  provinsi: "Provinsi",
  nasional: "Nasional",
};

export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  dikirim: "Dikirim",
  diterima: "Diterima",
};

export const cashTypeLabel: Record<CashTransactionType, string> = {
  MASUK: "Masuk",
  KELUAR: "Keluar",
};

/** "Pemasukan Rp…" / "Pengeluaran Rp…" wording used in dialogs and audit notes. */
export const cashTypeNoun: Record<CashTransactionType, string> = {
  MASUK: "pemasukan",
  KELUAR: "pengeluaran",
};
