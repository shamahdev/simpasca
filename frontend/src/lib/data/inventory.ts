import { cache } from "react";
import type { InventoryItem, ItemCategory, NeedType } from "../types.ts";
import { listAll } from "./api.ts";

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
    expirationDate: i.expiration_date,
  };
}

interface ApiStockMovement {
  item_id: number;
  quantity_in: string;
  quantity_out: string;
}

// shortcut: read-only here; item master data and stock receipts are managed in UC#2 Logistik, which has no screen yet.
export const listInventoryItems = cache(async (): Promise<InventoryItem[]> => {
  const rows = await listAll<ApiInventoryItem>("/api/inventory-items");
  return rows.map(fromApi).sort((a, b) => a.name.localeCompare(b.name, "id"));
});

/** Current stock per item id = SUM(quantity_in) − SUM(quantity_out) over stock_movements (AB-02). */
export const getStockLevels = cache(async (): Promise<Map<string, number>> => {
  const stock = new Map<string, number>();
  for (const m of await listAll<ApiStockMovement>("/api/stock-movements")) {
    const id = String(m.item_id);
    stock.set(id, (stock.get(id) ?? 0) + Number(m.quantity_in) - Number(m.quantity_out));
  }
  // Decimal quantities (3 places) summed as floats; round the noise away.
  for (const [id, value] of stock) stock.set(id, Number(value.toFixed(3)));
  return stock;
});

/** Every item with its current stock. */
export async function listStock() {
  const [items, stock] = await Promise.all([listInventoryItems(), getStockLevels()]);
  return items.map((item) => ({ item, stock: stock.get(item.id) ?? 0 }));
}

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
