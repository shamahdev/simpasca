import { itemCategoryLabel, shipmentStatusLabel } from "../labels.ts";
import type { Disaster, InventoryItem, ItemCategory, Shipment, ShipmentStatus, User } from "../types.ts";
import { getRow, listPage, postJson } from "./api.ts";
import { recordAudit } from "./audit.ts";
import { getDisaster } from "./disasters.ts";
import { DataError } from "./errors.ts";
import { getStockLevels, listInventoryItems } from "./inventory.ts";
import { computeFulfillment, listShipments, type FulfillmentStatus } from "./shipments.ts";

/**
 * report_snapshot (KF-10.2, AB-05): everything the report shows, copied at
 * generation time so later edits never change a saved report. No cash data (KF-10.3).
 */
export interface ReportSnapshot {
  version: 1;
  disaster: Pick<
    Disaster,
    | "id" | "code" | "disasterType" | "province" | "regencyCity" | "latitude" | "longitude"
    | "locationDetails" | "handlingScale" | "status" | "occurredAt" | "impactNotes"
    | "affectedPeople" | "affectedHouseholds"
  >;
  needs: {
    itemId: string;
    name: string;
    category: ItemCategory;
    unit: string;
    recommended: number | null;
    shipped: number;
    remaining: number | null;
    status: FulfillmentStatus;
  }[];
  distributions: {
    shipmentId: string;
    shipmentCode: string;
    itemName: string;
    category: ItemCategory;
    unit: string;
    quantity: number;
    shippedAt: string;
    receivedAt: string | null;
    status: ShipmentStatus;
    destination: string;
    personInCharge: string;
  }[];
  /** Jumlah keluar per kategori; units differ between items, so per category and unit. */
  categoryTotals: { category: ItemCategory; unit: string; quantity: number }[];
  generatedByName: string;
  generatedAt: string;
}

/** Builds the snapshot for one disaster only (AB-05.1, AC-31). Pure, so it is tested directly. */
export function buildSnapshot(
  disaster: Disaster,
  items: InventoryItem[],
  stock: Map<string, number>,
  shipments: Shipment[],
  generatedByName: string,
  generatedAt: string,
): ReportSnapshot {
  const own = shipments.filter((s) => s.disasterId === disaster.id);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const distributions = own.flatMap((s) =>
    s.items.map((line) => {
      const item = itemById.get(line.itemId);
      return {
        shipmentId: s.id,
        shipmentCode: s.code,
        itemName: item?.name ?? `Barang #${line.itemId}`,
        category: item?.category ?? "LOGISTIK_LAINNYA",
        unit: item?.stockUnit ?? "",
        quantity: line.quantity,
        shippedAt: s.shippedAt,
        receivedAt: s.receivedAt,
        status: s.status,
        destination: s.destination,
        personInCharge: s.personInCharge,
      };
    }),
  );
  const totals = new Map<string, ReportSnapshot["categoryTotals"][number]>();
  for (const d of distributions) {
    const key = `${d.category}|${d.unit}`;
    const total = totals.get(key) ?? { category: d.category, unit: d.unit, quantity: 0 };
    total.quantity += d.quantity;
    totals.set(key, total);
  }
  const categoryOrder = Object.keys(itemCategoryLabel);

  return {
    version: 1,
    disaster: {
      id: disaster.id,
      code: disaster.code,
      disasterType: disaster.disasterType,
      province: disaster.province,
      regencyCity: disaster.regencyCity,
      latitude: disaster.latitude,
      longitude: disaster.longitude,
      locationDetails: disaster.locationDetails,
      handlingScale: disaster.handlingScale,
      status: disaster.status,
      occurredAt: disaster.occurredAt,
      impactNotes: disaster.impactNotes,
      affectedPeople: disaster.affectedPeople,
      affectedHouseholds: disaster.affectedHouseholds,
    },
    needs: computeFulfillment(disaster, items, stock, own).map((row) => ({
      itemId: row.item.id,
      name: row.item.name,
      category: row.item.category,
      unit: row.item.stockUnit,
      recommended: row.recommended,
      shipped: row.shipped,
      remaining: row.remaining,
      status: row.status,
    })),
    distributions,
    categoryTotals: [...totals.values()].sort(
      (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.unit.localeCompare(b.unit),
    ),
    generatedByName,
    generatedAt,
  };
}

const num = new Intl.NumberFormat("id-ID");

/** Plain-text version of a report for "Salin laporan" (UC-13). */
export function reportText(s: ReportSnapshot): string {
  const d = s.disaster;
  const lines = [
    `LAPORAN BENCANA ${d.code}`,
    `${d.disasterType} · ${d.regencyCity}, ${d.province}`,
    `Waktu kejadian: ${d.occurredAt}`,
    `Penduduk terdampak: ${num.format(d.affectedPeople)} jiwa · Kepala keluarga: ${d.affectedHouseholds === null ? "-" : num.format(d.affectedHouseholds)}`,
    "",
    "Kronologi dan dampak:",
    d.impactNotes || "-",
    "",
    "Rekap kebutuhan:",
    ...(s.needs.length
      ? s.needs.map((n) =>
          `- ${n.name}: rekomendasi ${n.recommended === null ? "tanpa rasio" : `${num.format(n.recommended)} ${n.unit}`}, dikirim ${num.format(n.shipped)} ${n.unit}${n.remaining === null ? "" : `, sisa ${num.format(n.remaining)} ${n.unit}`} (${n.status})`,
        )
      : ["- (tidak ada)"]),
    "",
    "Rekap distribusi:",
    ...(s.distributions.length
      ? s.distributions.map((x) =>
          `- ${x.shipmentCode} ${x.itemName} ${num.format(x.quantity)} ${x.unit}, kirim ${x.shippedAt}${x.receivedAt ? `, terima ${x.receivedAt}` : ""}, ${shipmentStatusLabel[x.status]}, ${x.destination}, PJ ${x.personInCharge}`,
        )
      : ["- Belum ada pengiriman (jumlah keluar 0)"]),
    "",
    "Jumlah keluar per kategori:",
    ...(s.categoryTotals.length
      ? s.categoryTotals.map((c) => `- ${itemCategoryLabel[c.category]}: ${num.format(c.quantity)} ${c.unit}`)
      : ["- 0"]),
    "",
    `Dibuat oleh ${s.generatedByName} pada ${s.generatedAt}`,
  ];
  return lines.join("\n");
}

// --- API -----------------------------------------------------------------------

export interface ApiReport {
  id: number;
  disaster_id: number;
  report_snapshot: ReportSnapshot;
  generated_by: number;
  generated_by_name: string;
  generated_at: string;
}

export interface Report {
  id: string;
  code: string;
  disasterId: string;
  snapshot: ReportSnapshot;
  generatedByName: string;
  generatedAt: string;
}

const fromApi = (r: ApiReport): Report => ({
  id: String(r.id),
  code: `LAP-${String(r.id).padStart(4, "0")}`,
  disasterId: String(r.disaster_id),
  snapshot: r.report_snapshot,
  generatedByName: r.generated_by_name,
  generatedAt: r.generated_at,
});

const PATH = "/api/generated-reports";

/** Saved reports, newest first. */
export async function listReports(page: number) {
  const result = await listPage<ApiReport>(PATH, page);
  return { ...result, rows: result.rows.map(fromApi) };
}

export async function getReport(id: string): Promise<Report | undefined> {
  const row = await getRow<ApiReport>(PATH, id);
  return row && fromApi(row);
}

/**
 * Generate Laporan (KF-10, AB-05): saves a snapshot of one disaster and writes
 * GENERATE_LAPORAN to the audit log. Reads only; stock, cash and shipments stay as they are (AC-32).
 */
export async function generateReport(disasterId: string, user: User): Promise<Report> {
  const disaster = await getDisaster(disasterId);
  if (!disaster) throw new DataError("NOT_FOUND", "Data bencana tidak ditemukan atau sudah dihapus.");
  const [items, stock, shipments] = await Promise.all([listInventoryItems(), getStockLevels(), listShipments()]);
  const snapshot = buildSnapshot(disaster, items, stock, shipments, user.name, new Date().toISOString());

  const row = await postJson<ApiReport>(PATH, {
    disaster_id: Number(disaster.id),
    report_snapshot: snapshot,
    generated_by: user.id,
    generated_by_name: user.name,
  });
  await recordAudit({
    userId: user.id,
    action: "GENERATE_LAPORAN",
    entityType: "disasters",
    entityId: disaster.id,
    before: null,
    after: { report_id: row.id, disaster_id: Number(disaster.id), code: disaster.code, disaster_type: disaster.disasterType, regency_city: disaster.regencyCity },
  });
  return fromApi(row);
}
