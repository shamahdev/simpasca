import { cache } from "react";
import { ITEM_CATEGORIES, NEED_TYPES } from "../options.ts";
import type {
  InventoryItem,
  ItemCategory,
  MovementType,
  NeedType,
  StockMovement,
} from "../types.ts";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { recordAudit } from "./audit.ts";
import { DataError, invalidIfAny } from "./errors.ts";

/** Days covered by a daily need (AB-01, product planning policy). */
export const PLANNING_DAYS = 30;
/** Low-stock threshold for the dashboard (KF-02.5). */
export const LOW_STOCK_THRESHOLD = 10;

export interface ApiInventoryItem {
  id: number;
  name: string;
  category: string;
  stock_unit: string;
  initial_stock: string;
  need_ratio: string | null;
  need_type: string | null;
  ratio_basis: string | null;
  expiration_date: string | null;
  created_by: number;
}

export function fromApi(i: ApiInventoryItem): InventoryItem {
  return {
    id: String(i.id),
    name: i.name,
    category: i.category as ItemCategory,
    stockUnit: i.stock_unit,
    initialStock: Number(i.initial_stock),
    needRatio: i.need_ratio === null ? null : Number(i.need_ratio),
    needType: i.need_type as NeedType | null,
    ratioBasis: i.ratio_basis,
    expirationDate: i.expiration_date,
  };
}

export interface ApiStockMovement {
  id: number;
  item_id: number;
  disaster_id: number | null;
  receipt_id: number | null;
  shipment_item_id: number | null;
  movement_type: string;
  quantity_in: string;
  quantity_out: string;
  movement_date: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

const movementFromApi = (m: ApiStockMovement): StockMovement => ({
  id: String(m.id),
  itemId: String(m.item_id),
  disasterId: m.disaster_id === null ? null : String(m.disaster_id),
  receiptId: m.receipt_id === null ? null : String(m.receipt_id),
  movementType: m.movement_type as MovementType,
  quantityIn: Number(m.quantity_in),
  quantityOut: Number(m.quantity_out),
  movementDate: m.movement_date.slice(0, 10),
  notes: m.notes ?? "",
  createdAt: m.created_at,
});

/** Live items, by name. Once per request. */
export const listInventoryItems = cache(async (): Promise<InventoryItem[]> => {
  const rows = await listAll<ApiInventoryItem>("/api/inventory-items");
  return rows.map(fromApi).sort((a, b) => a.name.localeCompare(b.name, "id"));
});

export async function getInventoryItem(id: string): Promise<InventoryItem | undefined> {
  const row = await getRow<ApiInventoryItem>("/api/inventory-items", id);
  return row && fromApi(row);
}

const sumStock = (movements: Pick<ApiStockMovement, "quantity_in" | "quantity_out">[]) =>
  // Decimal quantities (3 places) summed as floats; round the noise away.
  Number(movements.reduce((sum, m) => sum + Number(m.quantity_in) - Number(m.quantity_out), 0).toFixed(3));

/** Current stock per item id = SUM(quantity_in) − SUM(quantity_out) over stock_movements (AB-02). */
export const getStockLevels = cache(async (): Promise<Map<string, number>> => {
  const byItem = new Map<string, ApiStockMovement[]>();
  for (const m of await listAll<ApiStockMovement>("/api/stock-movements")) {
    const id = String(m.item_id);
    byItem.set(id, [...(byItem.get(id) ?? []), m]);
  }
  return new Map([...byItem].map(([id, movements]) => [id, sumStock(movements)]));
});

/** Every item with its current stock. */
export async function listStock() {
  const [items, stock] = await Promise.all([listInventoryItems(), getStockLevels()]);
  return items.map((item) => ({ item, stock: stock.get(item.id) ?? 0 }));
}

/** Stock ledger of one item, oldest first, with the stock after each movement (UC-11, AC-13). */
export async function listItemMovements(itemId: string) {
  const rows = await listAll<ApiStockMovement>("/api/stock-movements", { item_id: itemId });
  rows.sort((a, b) => a.movement_date.localeCompare(b.movement_date) || a.id - b.id);
  let balance = 0;
  return rows.map((row) => {
    balance = Number((balance + Number(row.quantity_in) - Number(row.quantity_out)).toFixed(3));
    return { ...movementFromApi(row), balance };
  });
}

/** Fresh (uncached) stock of one item, for checks right before a write. */
export async function getItemStock(itemId: string): Promise<number> {
  return sumStock(await listAll<ApiStockMovement>("/api/stock-movements", { item_id: itemId }));
}

/**
 * Writes one stock_movements row (KF-06.2). `delta` > 0 adds stock, < 0 removes it.
 * The API does not write movements itself, so every stock change goes through here or shipments.ts.
 */
export function postMovement(movement: {
  itemId: string;
  type: MovementType;
  delta: number;
  date: string;
  notes: string;
  userId: number;
  receiptId?: string;
  disasterId?: string;
}) {
  return postJson("/api/stock-movements", {
    item_id: Number(movement.itemId),
    disaster_id: movement.disasterId ? Number(movement.disasterId) : null,
    receipt_id: movement.receiptId ? Number(movement.receiptId) : null,
    movement_type: movement.type,
    quantity_in: String(Math.max(0, movement.delta)),
    quantity_out: String(Math.max(0, -movement.delta)),
    movement_date: movement.date,
    notes: movement.notes,
    created_by: movement.userId,
  });
}

export const todayInJakarta = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

export const isValidDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// --- Recommendations ----------------------------------------------------------

export const hasRatio = (item: InventoryItem) =>
  item.needRatio !== null && item.needRatio > 0;

/**
 * Recommended quantity (AB-01): CEIL(people × ratio × 30) for daily needs,
 * CEIL(people × ratio) for one-time needs; null without a positive ratio (KF-04.2).
 */
export function recommendedQuantity(item: InventoryItem, affectedPeople: number) {
  if (!hasRatio(item)) return null;
  const days = item.needType === "HARIAN" ? PLANNING_DAYS : 1;
  // Round away float noise (0.05 × 250 = 12.500000000000002) before CEIL.
  return Math.ceil(Number((affectedPeople * item.needRatio! * days).toFixed(6)));
}

/** Food past its expiry date may not be shipped (UU 18/2012, AC-14). */
export function isExpiredFood(item: InventoryItem, onDate: string) {
  return (
    item.category === "PANGAN" &&
    item.expirationDate !== null &&
    item.expirationDate < onDate
  );
}

// --- Master barang (UC-07, KF-04) ----------------------------------------------

/** Raw form values (all strings). */
export interface ItemInput {
  name: string;
  category: string;
  stockUnit: string;
  initialStock: string;
  needRatio: string;
  needType: string;
  ratioBasis: string;
  /** YYYY-MM-DD or empty */
  expirationDate: string;
}

type ItemData = Omit<InventoryItem, "id">;

/** Validates the item form (KF-04.1, AB-02.2, AC-13, AC-21). */
export function validateItemInput(input: ItemInput): ItemData {
  const errors: Record<string, string> = {};
  const name = input.name.trim();
  if (!name || name.length > 150) errors.name = "Isi nama barang (maks. 150 karakter).";
  if (!ITEM_CATEGORIES.includes(input.category as ItemCategory)) {
    errors.category = "Pilih kategori Pangan, Sandang, Papan, atau Logistik lainnya.";
  }
  const stockUnit = input.stockUnit.trim();
  if (!stockUnit || stockUnit.length > 50) errors.stockUnit = "Isi satuan stok (maks. 50 karakter).";

  const initialText = input.initialStock.trim();
  if (!/^\d{1,12}$/.test(initialText)) errors.initialStock = "Stok awal harus bilangan bulat, minimal 0.";

  const ratioText = input.needRatio.trim();
  let needRatio: number | null = null;
  if (ratioText) {
    needRatio = Number(ratioText);
    if (!/^\d{1,9}(\.\d{1,6})?$/.test(ratioText) || !(needRatio > 0)) {
      errors.needRatio = "Rasio harus lebih dari 0, paling banyak 6 angka desimal. Kosongkan jika tanpa rasio.";
    }
  }
  if (!NEED_TYPES.includes(input.needType as NeedType)) errors.needType = "Pilih jenis kebutuhan.";

  const ratioBasis = input.ratioBasis.trim();
  if (ratioBasis.length > 50) errors.ratioBasis = "Paling banyak 50 karakter.";

  const isFood = input.category === "PANGAN";
  const expirationDate = isFood && input.expirationDate ? input.expirationDate : null;
  if (expirationDate && !isValidDate(expirationDate)) errors.expirationDate = "Tanggal kedaluwarsa tidak valid.";

  invalidIfAny(errors, "Periksa kembali isian barang.");
  return {
    name,
    category: input.category as ItemCategory,
    stockUnit,
    initialStock: Number(initialText),
    needRatio,
    needType: input.needType as NeedType,
    ratioBasis: ratioBasis || null,
    expirationDate,
  };
}

const itemToApi = (d: ItemData) => ({
  name: d.name,
  category: d.category,
  stock_unit: d.stockUnit,
  initial_stock: String(d.initialStock),
  need_ratio: d.needRatio === null ? null : String(d.needRatio),
  need_type: d.needType,
  ratio_basis: d.ratioBasis,
  expiration_date: d.expirationDate,
});

async function requireItem(id: string) {
  const row = await getRow<ApiInventoryItem>("/api/inventory-items", id);
  if (!row) throw new DataError("NOT_FOUND", "Barang tidak ditemukan atau sudah dihapus.");
  return row;
}

/** Registers an item and its opening stock as a STOK_AWAL movement (UC-07, KF-06.2). */
export async function createItem(input: ItemInput, userId: number): Promise<InventoryItem> {
  const data = validateItemInput(input);
  const row = await postJson<ApiInventoryItem>("/api/inventory-items", { ...itemToApi(data), created_by: userId });
  try {
    await postMovement({
      itemId: String(row.id), type: "STOK_AWAL", delta: data.initialStock,
      date: todayInJakarta(), notes: "Stok awal", userId,
    });
  } catch (error) {
    // An item without its STOK_AWAL movement would show the wrong stock: undo it.
    await deleteRow(`/api/inventory-items/${row.id}`).catch((e) => console.error("rollback barang gagal", row.id, e));
    throw error;
  }
  return fromApi(row);
}

/**
 * Updates an item. A changed opening stock is never written over: the difference
 * is recorded as a KOREKSI movement and may not make stock negative (KF-06.3, AB-02.3).
 * Audited (KF-09).
 */
export async function updateItem(id: string, input: ItemInput, userId: number): Promise<InventoryItem> {
  const data = validateItemInput(input);
  const before = await requireItem(id);
  const delta = data.initialStock - Number(before.initial_stock);
  if (delta < 0) {
    const stock = await getItemStock(id);
    if (stock + delta < 0) {
      const message = `Stok awal tidak dapat dikurangi ${-delta} ${before.stock_unit}: stok terkini tinggal ${stock}.`;
      throw new DataError("INVALID", message, { initialStock: message });
    }
  }
  const after = await patchJson<ApiInventoryItem>(`/api/inventory-items/${id}`, itemToApi(data));
  if (delta !== 0) {
    await postMovement({
      itemId: id, type: "KOREKSI", delta, date: todayInJakarta(),
      notes: `Koreksi stok awal ${Number(before.initial_stock)} → ${data.initialStock}`, userId,
    });
  }
  await recordAudit({ userId, action: "UBAH", entityType: "inventory_items", entityId: id, before, after });
  return fromApi(after);
}

/**
 * Deletes an item. The API refuses (409) while movements, receipts or shipments
 * reference it, so its stock history stays traceable (AC-18). Audited (KF-09).
 */
export async function deleteItem(id: string, userId: number): Promise<void> {
  const before = await requireItem(id);
  try {
    await deleteRow(`/api/inventory-items/${id}`);
  } catch (error) {
    if (error instanceof DataError && error.code === "CONFLICT") {
      throw new DataError(
        "CONFLICT",
        "Barang ini sudah memiliki riwayat stok, penerimaan, atau pengiriman, sehingga tidak dapat dihapus agar riwayatnya tetap utuh.",
      );
    }
    throw error;
  }
  await recordAudit({ userId, action: "HAPUS", entityType: "inventory_items", entityId: id, before, after: null });
}
