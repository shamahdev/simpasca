import type { ItemRow } from "@/components/logistik/item-table";
import { formatNumber, formatShortDate } from "@/lib/format";
import { itemCategoryLabel, needTypeLabel } from "@/lib/labels";
import type { InventoryItem } from "@/lib/types";

const ratioFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 });

/** "0,5 per orang/hari · Harian", or "Tanpa rasio" (KF-04.2). */
export function ratioText(item: InventoryItem) {
  if (item.needRatio === null || item.needRatio <= 0) return "Tanpa rasio";
  const basis = item.ratioBasis ? ` per ${item.ratioBasis}` : "";
  return `${ratioFormat.format(item.needRatio)} ${item.stockUnit}${basis}${item.needType ? ` · ${needTypeLabel[item.needType]}` : ""}`;
}

/** Formats an item on the server for client tables and dialogs. */
export function toItemRow(item: InventoryItem, stock: number): ItemRow {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    stockUnit: item.stockUnit,
    initialStock: item.initialStock,
    needRatio: item.needRatio,
    needType: item.needType,
    ratioBasis: item.ratioBasis ?? "",
    expirationDate: item.expirationDate,
    stock,
    categoryText: itemCategoryLabel[item.category],
    stockText: `${formatNumber(stock)} ${item.stockUnit}`,
    ratioText: ratioText(item),
    expiryText: item.expirationDate ? formatShortDate(item.expirationDate) : "—",
  };
}
