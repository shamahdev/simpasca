import type { Disaster } from "../types";
import { listCashTransactions } from "./cash";
import { disasters, disasterTrend, shipments } from "./mock";

const byNewest = <T,>(getDate: (item: T) => string) => (a: T, b: T) =>
  new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();

export function getDashboardSummary() {
  return {
    disasterCount: disasters.length,
    activeDisasterCount: disasters.filter((d) => d.status === "aktif").length,
    affectedPeople: disasters.reduce((sum, d) => sum + d.affectedPeople, 0),
  };
}

export function getRecentDisasters(limit = 5): Disaster[] {
  return [...disasters].sort(byNewest((d) => d.occurredAt)).slice(0, limit);
}

/** Disasters shown on the map. Active only by default (PRD KF-02). */
export function getMapDisasters({ includeFinished = false } = {}): Disaster[] {
  return disasters.filter(
    (d) =>
      (includeFinished || d.status === "aktif") &&
      d.latitude !== null &&
      d.longitude !== null,
  );
}

export async function getRecentCashTransactions(limit = 5) {
  return (await listCashTransactions({ limit })).rows;
}

/** One row per shipped item, newest shipment first. */
export function getRecentDistributions(limit = 5) {
  const disasterById = new Map(disasters.map((d) => [d.id, d]));

  return [...shipments]
    .sort(byNewest((s) => s.shippedAt))
    .flatMap((shipment) =>
      shipment.items.map((item, index) => ({
        key: `${shipment.id}-${index}`,
        shipment,
        item,
        disaster: disasterById.get(shipment.disasterId),
      })),
    )
    .slice(0, limit);
}

export function getDisasterTrend() {
  return disasterTrend;
}
