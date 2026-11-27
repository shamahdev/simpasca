import type { CashFilters, CashRow } from "@/components/anggaran/cash-book-table";
import {
  formatMonth,
  formatRupiah,
  formatShortDate,
  todayIsoDate,
} from "@/lib/format";
import type { CashLinkOptions } from "@/components/anggaran/cash-transaction-dialog";
import { listDisasters } from "@/lib/data/disasters";
import { listInventoryItems } from "@/lib/data/inventory";
import { listAllReceipts } from "@/lib/data/receipts";
import { formatNumber } from "@/lib/format";
import type { CashTransaction, Disaster, InventoryItem, StockReceipt } from "@/lib/types";

/** Formats a transaction on the server for the client table and dialogs. */
export function toCashRow(t: CashTransaction): CashRow {
  return {
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    transactionDate: t.transactionDate,
    disasterId: t.disasterId,
    receiptId: t.receiptId,
    dateText: formatShortDate(t.transactionDate),
    amountText: formatRupiah(t.amount),
  };
}

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Reads `?jenis=&periode=&halaman=`; invalid values fall back to "all" / page 1. */
export function parseCashFilters(params: RawParams): CashFilters {
  const type = first(params.jenis);
  const period = first(params.periode);
  const page = Number(first(params.halaman));
  return {
    type: type === "MASUK" || type === "KELUAR" ? type : undefined,
    period: period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** "2026-06" → { dateFrom: "2026-06-01", dateTo: "2026-06-30" } */
export function periodRange(period?: string) {
  if (!period) return {};
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { dateFrom: `${period}-01`, dateTo: `${period}-${String(lastDay).padStart(2, "0")}` };
}

/** The last `count` months as Select options, newest first, plus the selected one. */
export function periodOptions(count: number, selected?: string): [string, string][] {
  const [year, month] = todayIsoDate().split("-").map(Number);
  const periods = Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - i, 1));
    return date.toISOString().slice(0, 7);
  });
  if (selected && !periods.includes(selected)) periods.push(selected);
  return periods.map((p) => [p, formatMonth(`${p}-01`)]);
}

export const disasterLabel = (d: Disaster) => `${d.code} · ${d.disasterType}, ${d.regencyCity}`;

export const receiptLabel = (r: StockReceipt, item: InventoryItem | undefined) =>
  `${formatShortDate(r.receiptDate)} · ${item?.name ?? "Barang"} ${formatNumber(r.quantity)} ${item?.stockUnit ?? ""} dari ${r.sourceGiver}`;

/** Disasters and stock receipts a transaction can be linked to. */
export async function getCashLinkOptions(): Promise<CashLinkOptions> {
  const [disasters, receipts, items] = await Promise.all([listDisasters(), listAllReceipts(), listInventoryItems()]);
  const itemById = new Map(items.map((i) => [i.id, i]));
  return {
    disasters: disasters.map((d) => [d.id, disasterLabel(d)]),
    receipts: receipts.map((r) => [r.id, receiptLabel(r, itemById.get(r.itemId))]),
  };
}
