import type {
  CashTransactionKind,
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

export const cashKindLabel: Record<CashTransactionKind, string> = {
  masuk: "Masuk",
  keluar: "Keluar",
};
