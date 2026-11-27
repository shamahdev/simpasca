import { cache } from "react";
import type { Disaster, InventoryItem, Shipment, ShipmentStatus } from "../types.ts";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { getDisaster } from "./disasters.ts";
import { DataError, invalidIfAny } from "./errors.ts";
import {
  getStockLevels,
  hasRatio,
  isExpiredFood,
  listInventoryItems,
  recommendedQuantity,
} from "./inventory.ts";

/** Raw form values. */
export interface ShipmentInput {
  disasterId: string;
  /** YYYY-MM-DD */
  shippedAt: string;
  destination: string;
  personInCharge: string;
  items: { itemId: string; quantity: string }[];
}

const todayInJakarta = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

const isValidDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);

// --- API mapping -----------------------------------------------------------

export interface ApiShipment {
  id: number;
  disaster_id: number;
  status: string;
  shipped_at: string | null;
  received_at: string | null;
  destination: string;
  person_in_charge: string;
  request_key: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ApiShipmentItem {
  id: number;
  shipment_id: number;
  item_id: number;
  quantity: string;
  deleted_at: string | null;
}

/** API date-time → YYYY-MM-DD in WIB. */
const toJakartaDate = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
/** YYYY-MM-DD (WIB) → API date-time. */
const toApiDateTime = (date: string) => `${date}T00:00:00+07:00`;

export function fromApi(s: ApiShipment, items: ApiShipmentItem[]): Shipment {
  return {
    id: String(s.id),
    code: `DST-${String(s.id).padStart(4, "0")}`,
    disasterId: String(s.disaster_id),
    status: s.status as ShipmentStatus,
    shippedAt: toJakartaDate(s.shipped_at ?? s.created_at),
    receivedAt: s.received_at ? toJakartaDate(s.received_at) : null,
    destination: s.destination,
    personInCharge: s.person_in_charge,
    requestKey: s.request_key,
    items: items.map((i) => ({
      id: String(i.id),
      itemId: String(i.item_id),
      quantity: Number(i.quantity),
    })),
    createdBy: s.created_by,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

// --- Reads -----------------------------------------------------------------

/** Live shipments with their items, newest shipping date first. Once per request. */
export const listShipments = cache(async (): Promise<Shipment[]> => {
  const [shipments, items] = await Promise.all([
    listAll<ApiShipment>("/api/shipments"),
    listAll<ApiShipmentItem>("/api/shipment-items"),
  ]);
  const itemsByShipment = new Map<number, ApiShipmentItem[]>();
  for (const item of items) {
    itemsByShipment.set(item.shipment_id, [...(itemsByShipment.get(item.shipment_id) ?? []), item]);
  }
  return shipments
    .map((s) => fromApi(s, itemsByShipment.get(s.id) ?? []))
    .sort((a, b) => b.shippedAt.localeCompare(a.shippedAt) || Number(b.id) - Number(a.id));
});

/** The detail endpoint includes the shipment's live items. */
async function loadShipment(id: string) {
  const row = await getRow<ApiShipment & { items: ApiShipmentItem[] }>("/api/shipments", id);
  return row && { row, shipment: fromApi(row, row.items ?? []) };
}

export async function getShipment(id: string): Promise<Shipment | undefined> {
  return (await loadShipment(id))?.shipment;
}

async function requireShipment(id: string) {
  const loaded = await loadShipment(id);
  if (!loaded) throw new DataError("NOT_FOUND", "Pengiriman tidak ditemukan atau sudah dihapus.");
  return loaded;
}

export type FulfillmentStatus = "TERPENUHI" | "KURANG" | "TANPA_RASIO";

export interface FulfillmentRow {
  item: InventoryItem;
  recommended: number | null;
  shipped: number;
  remaining: number | null;
  stock: number;
  status: FulfillmentStatus;
}

/**
 * Rekomendasi & pemenuhan per item for one disaster (KF-05, AB-01).
 * Shipped counts DIKIRIM and DITERIMA alike (KF-05.1).
 */
export function computeFulfillment(
  disaster: Disaster,
  items: InventoryItem[],
  stock: Map<string, number>,
  shipments: Shipment[],
): FulfillmentRow[] {
  const shippedByItem = new Map<string, number>();
  for (const s of shipments) {
    if (s.disasterId !== disaster.id) continue;
    for (const i of s.items) {
      shippedByItem.set(i.itemId, (shippedByItem.get(i.itemId) ?? 0) + i.quantity);
    }
  }
  return items.flatMap((item) => {
    const shipped = shippedByItem.get(item.id) ?? 0;
    if (!hasRatio(item) && shipped === 0) return [];
    const recommended = recommendedQuantity(item, disaster.affectedPeople);
    return [
      {
        item,
        recommended,
        shipped,
        remaining: recommended === null ? null : Math.max(0, recommended - shipped),
        stock: stock.get(item.id) ?? 0,
        status:
          recommended === null
            ? "TANPA_RASIO"
            : shipped >= recommended
              ? "TERPENUHI"
              : "KURANG",
      },
    ];
  });
}

export async function getFulfillment(disaster: Disaster) {
  const [items, stock, shipments] = await Promise.all([
    listInventoryItems(),
    getStockLevels(),
    listShipments(),
  ]);
  return computeFulfillment(disaster, items, stock, shipments);
}

// --- Validation ------------------------------------------------------------

type ShipmentData = Pick<
  Shipment,
  "disasterId" | "shippedAt" | "destination" | "personInCharge"
> & { items: { itemId: string; quantity: number }[] };

/** What validation needs to know, loaded once per request. */
export interface ShipmentContext {
  disasterExists: boolean;
  items: InventoryItem[];
  stock: Map<string, number>;
  /** YYYY-MM-DD in WIB */
  today: string;
}

/**
 * Validates a shipment as a whole (AB-03.2): one bad item rejects everything.
 * `ownShipment` is the shipment being edited; its quantities return to the available stock.
 */
export function validateShipment(
  input: ShipmentInput,
  ctx: ShipmentContext,
  ownShipment?: Shipment,
): ShipmentData {
  const errors: Record<string, string> = {};

  if (!ctx.disasterExists) errors.disasterId = "Pilih bencana.";
  if (!isValidDate(input.shippedAt)) {
    errors.shippedAt = "Tanggal pengiriman tidak valid.";
  } else if (input.shippedAt > ctx.today) {
    errors.shippedAt = "Tanggal pengiriman tidak boleh di masa depan.";
  } else if (ownShipment?.receivedAt && ownShipment.receivedAt < input.shippedAt) {
    errors.shippedAt = "Tanggal pengiriman tidak boleh setelah tanggal penerimaan.";
  }
  const destination = input.destination.trim();
  if (!destination || destination.length > 200) errors.destination = "Isi lokasi tujuan (maks. 200 karakter).";
  const personInCharge = input.personInCharge.trim();
  if (!personInCharge || personInCharge.length > 120) errors.personInCharge = "Isi nama penanggung jawab (maks. 120 karakter).";

  const problems: string[] = [];
  const seen = new Set<string>();
  const items: ShipmentData["items"] = [];
  const shipDay = [input.shippedAt, ctx.today].sort().at(-1)!;
  for (const row of input.items) {
    const item = ctx.items.find((i) => i.id === row.itemId);
    if (!item) {
      problems.push("Ada barang yang belum dipilih.");
      continue;
    }
    if (seen.has(item.id)) {
      problems.push(`${item.name} dipilih lebih dari sekali.`);
      continue;
    }
    seen.add(item.id);
    const quantity = /^\d{1,9}$/.test(row.quantity.trim()) ? Number(row.quantity.trim()) : NaN;
    if (!(quantity > 0)) {
      problems.push(`Jumlah ${item.name} harus bilangan bulat lebih dari 0.`);
      continue;
    }
    if (isExpiredFood(item, shipDay)) {
      problems.push(`${item.name} sudah kedaluwarsa sehingga tidak dapat dikirim.`);
      continue;
    }
    const own = ownShipment?.items.find((i) => i.itemId === item.id)?.quantity ?? 0;
    const available = (ctx.stock.get(item.id) ?? 0) + own;
    if (quantity > available) {
      problems.push(`Jumlah ${item.name} melebihi stok tersedia (${available} ${item.stockUnit}).`);
      continue;
    }
    items.push({ itemId: item.id, quantity });
  }
  if (input.items.length === 0) problems.push("Tambahkan minimal satu barang.");
  if (problems.length > 0) errors.items = problems.join(" ");

  invalidIfAny(errors, "Pengiriman ditolak. Periksa kembali isian.");
  return { disasterId: input.disasterId, shippedAt: input.shippedAt, destination, personInCharge, items };
}

async function loadContext(disasterId: string): Promise<ShipmentContext> {
  const [disaster, items, stock] = await Promise.all([
    getDisaster(disasterId),
    listInventoryItems(),
    getStockLevels(),
  ]);
  return { disasterExists: disaster !== undefined, items, stock, today: todayInJakarta() };
}

// --- Writes ----------------------------------------------------------------
// The API writes the shipment, its items, the PENGIRIMAN/KOREKSI stock movements
// and the audit entry in one transaction (AB-03.2, KF-09). The checks below give
// the form field-level errors first; the API checks again under a lock.

const linesToApi = (items: ShipmentData["items"]) =>
  items.map(({ itemId, quantity }) => ({ item_id: Number(itemId), quantity }));

const withItems = (row: ApiShipment & { items?: ApiShipmentItem[] }) => fromApi(row, row.items ?? []);

/** Records a shipment as DIKIRIM and takes its items out of stock (AB-03.1). A reused request key is refused (AB-03.4). */
export async function createShipment(input: ShipmentInput, requestKey: string): Promise<Shipment> {
  const key = requestKey.trim();
  if (!key) throw new DataError("INVALID", "Permintaan tidak memiliki request key.");
  const data = validateShipment(input, await loadContext(input.disasterId));
  try {
    return withItems(
      await postJson<ApiShipment & { items: ApiShipmentItem[] }>("/api/shipments", {
        disaster_id: Number(data.disasterId),
        shipped_at: toApiDateTime(data.shippedAt),
        destination: data.destination,
        person_in_charge: data.personInCharge,
        request_key: key,
        items: linesToApi(data.items),
      }),
    );
  } catch (error) {
    if (error instanceof DataError && error.code === "CONFLICT") {
      throw new DataError(
        "CONFLICT",
        "Pengiriman ini sudah tercatat sebelumnya. Tutup formulir lalu periksa daftar pengiriman.",
      );
    }
    throw error;
  }
}

/** Corrects a shipment; the API returns differences to or takes them out of stock as KOREKSI (KF-09.3). */
export async function updateShipment(id: string, input: ShipmentInput): Promise<Shipment> {
  const before = await requireShipment(id);
  const data = validateShipment(input, await loadContext(input.disasterId), before.shipment);
  return withItems(
    await patchJson<ApiShipment & { items: ApiShipmentItem[] }>(`/api/shipments/${id}`, {
      disaster_id: Number(data.disasterId),
      shipped_at: toApiDateTime(data.shippedAt),
      destination: data.destination,
      person_in_charge: data.personInCharge,
      items: linesToApi(data.items),
    }),
  );
}

/** DIKIRIM → DITERIMA. Stores the receipt date only; stock is not touched (AB-03.3, AC-10). */
export async function confirmShipmentReceived(id: string, receivedAt: string): Promise<Shipment> {
  const { shipment } = await requireShipment(id);
  if (shipment.status === "DITERIMA") {
    throw new DataError("CONFLICT", "Pengiriman ini sudah dikonfirmasi diterima.");
  }
  if (!isValidDate(receivedAt)) {
    const message = "Tanggal penerimaan tidak valid.";
    throw new DataError("INVALID", message, { receivedAt: message });
  }
  if (receivedAt < shipment.shippedAt || receivedAt > todayInJakarta()) {
    const message = "Tanggal penerimaan harus antara tanggal pengiriman dan hari ini.";
    throw new DataError("INVALID", message, { receivedAt: message });
  }
  return withItems(
    await patchJson<ApiShipment & { items: ApiShipmentItem[] }>(`/api/shipments/${id}`, {
      status: "DITERIMA",
      received_at: toApiDateTime(receivedAt),
    }),
  );
}

/** Soft delete; the API puts every item back into stock, so the disaster's shipped totals drop too (KF-09.3). */
export async function deleteShipment(id: string): Promise<Shipment> {
  const { shipment } = await requireShipment(id);
  await deleteRow(`/api/shipments/${id}`);
  return shipment;
}
