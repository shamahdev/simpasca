import type { Disaster, DisasterTrendPoint } from "../types.ts";
import { listCashTransactions } from "./cash.ts";
import { listDisasters } from "./disasters.ts";
import { listInventoryItems, listStock, LOW_STOCK_THRESHOLD } from "./inventory.ts";
import { listShipments } from "./shipments.ts";

/** Summary metrics over live disasters (KF-02.1). */
export async function getDashboardSummary() {
  const disasters = await listDisasters();
  return {
    disasterCount: disasters.length,
    activeDisasterCount: disasters.filter((d) => d.status === "AKTIF").length,
    affectedPeople: disasters.reduce((sum, d) => sum + d.affectedPeople, 0),
  };
}

export async function getRecentDisasters(limit = 5) {
  return (await listDisasters()).slice(0, limit);
}

/** Every live disaster; the map shows active ones by default and can show all (KF-02.3). */
export function getMapDisasters() {
  return listDisasters();
}

/** Items with current stock at or below the threshold (KF-02.5). */
export async function getLowStockItems() {
  return (await listStock()).filter(({ stock }) => stock <= LOW_STOCK_THRESHOLD);
}

export async function getRecentCashTransactions(limit = 5) {
  return (await listCashTransactions({ limit })).rows;
}

/** One row per shipped item, newest shipment first. */
export async function getRecentDistributions(limit = 5) {
  const [disasterList, itemList, shipments] = await Promise.all([
    listDisasters(),
    listInventoryItems(),
    listShipments(),
  ]);
  const disasters = new Map(disasterList.map((d) => [d.id, d]));
  const items = new Map(itemList.map((i) => [i.id, i]));

  return shipments
    .flatMap((shipment) =>
      shipment.items.flatMap(({ itemId, quantity }) => {
        const item = items.get(itemId);
        return item
          ? [
              {
                key: `${shipment.id}-${itemId}`,
                shipment,
                item,
                quantity,
                disaster: disasters.get(shipment.disasterId),
              },
            ]
          : [];
      }),
    )
    .slice(0, limit);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const seriesOf = (type: string): Exclude<keyof DisasterTrendPoint, "month"> =>
  type.startsWith("Banjir")
    ? "banjir"
    : type === "Gempa bumi"
      ? "gempa"
      : type === "Tanah longsor"
        ? "longsor"
        : "lainnya";

/** Disaster counts per type for the last `months` months up to `today` (YYYY-MM-DD, WIB), plus a period label. */
export function computeDisasterTrend(disasters: Disaster[], today: string, months = 6) {
  const [year, month] = today.split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (months - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), month: d.getUTCMonth(), year: d.getUTCFullYear() };
  });
  const points: DisasterTrendPoint[] = keys.map((k) => ({
    month: MONTHS[k.month],
    banjir: 0,
    gempa: 0,
    longsor: 0,
    lainnya: 0,
  }));
  for (const d of disasters) {
    const key = new Date(d.occurredAt).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 7);
    const index = keys.findIndex((k) => k.key === key);
    if (index >= 0) points[index][seriesOf(d.disasterType)]++;
  }
  const first = keys[0];
  const last = keys.at(-1)!;
  const label =
    first.year === last.year
      ? `${MONTHS[first.month]}–${MONTHS[last.month]} ${last.year}`
      : `${MONTHS[first.month]} ${first.year}–${MONTHS[last.month]} ${last.year}`;
  return { points, label };
}

export async function getDisasterTrend() {
  const disasters = await listDisasters();
  return computeDisasterTrend(
    disasters,
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }),
  );
}
