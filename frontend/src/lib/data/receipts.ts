import { cache } from "react";
import { ITEM_CONDITIONS } from "../options.ts";
import type { InventoryItem, StockReceipt } from "../types.ts";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { DataError, invalidIfAny } from "./errors.ts";
import {
  getInventoryItem,
  getItemStock,
  isValidDate,
  todayInJakarta,
} from "./inventory.ts";

export interface ApiStockReceipt {
  id: number;
  item_id: number;
  quantity: string;
  receipt_date: string;
  source_giver: string;
  item_condition: string;
  notes: string | null;
  request_key: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const fromApi = (r: ApiStockReceipt): StockReceipt => ({
  id: String(r.id),
  itemId: String(r.item_id),
  quantity: Number(r.quantity),
  receiptDate: r.receipt_date.slice(0, 10),
  sourceGiver: r.source_giver,
  itemCondition: r.item_condition,
  notes: r.notes ?? "",
  createdBy: r.created_by,
});

/** Raw form values (all strings). */
export interface ReceiptInput {
  itemId: string;
  quantity: string;
  /** YYYY-MM-DD */
  receiptDate: string;
  sourceGiver: string;
  itemCondition: string;
  notes: string;
}

type ReceiptData = Omit<StockReceipt, "id" | "createdBy">;

/** Validates a receipt (KF-06.1, AB-02.2, AC-13, AC-22). `item` is the selected item, if it exists. */
export function validateReceipt(input: ReceiptInput, item: InventoryItem | undefined, today: string): ReceiptData {
  const errors: Record<string, string> = {};
  if (!item) errors.itemId = "Pilih barang.";
  const quantityText = input.quantity.trim();
  if (!/^\d{1,9}$/.test(quantityText) || Number(quantityText) <= 0) {
    errors.quantity = "Jumlah harus bilangan bulat lebih dari 0.";
  }
  if (!isValidDate(input.receiptDate)) {
    errors.receiptDate = "Tanggal penerimaan tidak valid.";
  } else if (input.receiptDate > today) {
    errors.receiptDate = "Tanggal penerimaan tidak boleh di masa depan.";
  }
  const sourceGiver = input.sourceGiver.trim();
  if (!sourceGiver || sourceGiver.length > 150) errors.sourceGiver = "Isi sumber atau pemberi (maks. 150 karakter).";
  if (!ITEM_CONDITIONS.includes(input.itemCondition)) errors.itemCondition = "Pilih kondisi barang.";
  const notes = input.notes.trim();
  if (notes.length > 1000) errors.notes = "Paling banyak 1000 karakter.";

  invalidIfAny(errors, "Periksa kembali isian penerimaan.");
  return {
    itemId: input.itemId,
    quantity: Number(quantityText),
    receiptDate: input.receiptDate,
    sourceGiver,
    itemCondition: input.itemCondition,
    notes,
  };
}

const PATH = "/api/stock-receipts";

/** Every live receipt, newest first. Once per request. */
export const listAllReceipts = cache(async (): Promise<StockReceipt[]> => {
  const rows = await listAll<ApiStockReceipt>(PATH);
  return rows.map(fromApi).sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || Number(b.id) - Number(a.id));
});

export async function listReceipts(itemId: string): Promise<StockReceipt[]> {
  const rows = await listAll<ApiStockReceipt>(PATH, { item_id: itemId });
  return rows.map(fromApi).sort((a, b) => b.receiptDate.localeCompare(a.receiptDate) || Number(b.id) - Number(a.id));
}

export async function getReceipt(id: string): Promise<StockReceipt | undefined> {
  const row = await getRow<ApiStockReceipt>(PATH, id);
  return row && fromApi(row);
}

async function requireReceipt(id: string) {
  const row = await getRow<ApiStockReceipt>(PATH, id);
  if (!row) throw new DataError("NOT_FOUND", "Penerimaan tidak ditemukan atau sudah dihapus.");
  return row;
}

/** Stock may not go below zero by correcting a receipt (AB-02.3). */
async function ensureStockCovers(itemId: string, removed: number, unit: string) {
  const stock = await getItemStock(itemId);
  if (stock - removed < 0) {
    const message = `Koreksi ditolak: ${removed} ${unit} akan membuat stok negatif (stok terkini ${stock} ${unit}, sebagian sudah dikirim).`;
    throw new DataError("INVALID", message, { quantity: message });
  }
}

/** Records goods received; the API adds them to stock as a PENERIMAAN movement (UC-08). A reused request key is refused (AC-19). */
export async function createReceipt(input: ReceiptInput, requestKey: string): Promise<StockReceipt> {
  const key = requestKey.trim();
  if (!key) throw new DataError("INVALID", "Permintaan tidak memiliki request key.");
  const item = await getInventoryItem(input.itemId);
  const data = validateReceipt(input, item, todayInJakarta());
  try {
    return fromApi(
      await postJson<ApiStockReceipt>(PATH, {
        item_id: Number(data.itemId),
        quantity: String(data.quantity),
        receipt_date: data.receiptDate,
        source_giver: data.sourceGiver,
        item_condition: data.itemCondition,
        notes: data.notes || null,
        request_key: key,
      }),
    );
  } catch (error) {
    if (error instanceof DataError && error.code === "CONFLICT") {
      throw new DataError("CONFLICT", "Penerimaan ini sudah tercatat sebelumnya. Tutup formulir lalu periksa riwayat stok.");
    }
    throw error;
  }
}

/** Corrects a receipt; the API records a changed quantity as KOREKSI (KF-06.3). The item cannot change. Audited by the API (KF-09). */
export async function updateReceipt(id: string, input: ReceiptInput): Promise<StockReceipt> {
  const before = await requireReceipt(id);
  const item = await getInventoryItem(String(before.item_id));
  const data = validateReceipt({ ...input, itemId: String(before.item_id) }, item, todayInJakarta());
  const delta = data.quantity - Number(before.quantity);
  if (delta < 0) await ensureStockCovers(data.itemId, -delta, item!.stockUnit);
  return fromApi(
    await patchJson<ApiStockReceipt>(`${PATH}/${id}`, {
      quantity: String(data.quantity),
      receipt_date: data.receiptDate,
      source_giver: data.sourceGiver,
      item_condition: data.itemCondition,
      notes: data.notes || null,
    }),
  );
}

/** Soft-deletes a receipt; the API takes its quantity back out of stock as KOREKSI (KF-09.3). */
export async function deleteReceipt(id: string): Promise<StockReceipt> {
  const before = await requireReceipt(id);
  const item = await getInventoryItem(String(before.item_id));
  await ensureStockCovers(String(before.item_id), Number(before.quantity), item?.stockUnit ?? "");
  await deleteRow(`${PATH}/${id}`);
  return fromApi(before);
}
