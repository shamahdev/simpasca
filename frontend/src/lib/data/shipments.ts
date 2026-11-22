import { cache } from "react";
import type { Disaster, InventoryItem, Shipment, ShipmentItem, ShipmentStatus } from "../types.ts";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { recordAudit } from "./audit.ts";
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

async function loadShipment(id: string) {
  const row = await getRow<ApiShipment>("/api/shipments", id);
  if (!row) return undefined;
  const items = await listAll<ApiShipmentItem>("/api/shipment-items", { shipment_id: id });
  return { row, items, shipment: fromApi(row, items) };
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
// The API only stores rows; the stock movements that belong to shipment items
// are written here (AB-02).
// shortcut: a shipment spans several API calls without a transaction; creation rolls back on failure, an edit or delete failing halfway does not. Ask the backend for one atomic shipment endpoint (AB-03.2).

interface WriteContext {
  shipmentId: string;
  code: string;
  disasterId: string;
  userId: number;
}

/** delta > 0 takes stock out, delta < 0 puts it back. */
function addMovement(
  ctx: WriteContext,
  item: ShipmentItem,
  type: "PENGIRIMAN" | "KOREKSI",
  delta: number,
  date: string,
) {
  return postJson("/api/stock-movements", {
    item_id: Number(item.itemId),
    disaster_id: Number(ctx.disasterId),
    shipment_item_id: Number(item.id),
    movement_type: type,
    quantity_in: String(Math.max(0, -delta)),
    quantity_out: String(Math.max(0, delta)),
    movement_date: date,
    notes: type === "PENGIRIMAN" ? `Pengiriman ${ctx.code}` : `Koreksi pengiriman ${ctx.code}`,
    created_by: ctx.userId,
  });
}

/** Adds an item row and takes it out of stock. */
async function shipItem(
  ctx: WriteContext,
  itemId: string,
  quantity: number,
  date: string,
): Promise<ShipmentItem> {
  const row = await postJson<ApiShipmentItem>("/api/shipment-items", {
    shipment_id: Number(ctx.shipmentId),
    item_id: Number(itemId),
    quantity: String(quantity),
  });
  const item = { id: String(row.id), itemId, quantity };
  await addMovement(ctx, item, "PENGIRIMAN", quantity, date);
  return item;
}

/** Puts an item row back into stock and removes it (KF-09.3). */
async function returnItem(ctx: WriteContext, item: ShipmentItem, today: string) {
  await addMovement(ctx, item, "KOREKSI", -item.quantity, today);
  await deleteRow(`/api/shipment-items/${item.id}`);
}

/** Records a shipment as DIKIRIM and takes its items out of stock (AB-03.1). A reused request key is refused (AB-03.4). */
export async function createShipment(
  input: ShipmentInput,
  requestKey: string,
  userId: number,
): Promise<Shipment> {
  const key = requestKey.trim();
  if (!key) throw new DataError("INVALID", "Permintaan tidak memiliki request key.");
  const context = await loadContext(input.disasterId);
  const data = validateShipment(input, context);

  let row: ApiShipment;
  try {
    row = await postJson<ApiShipment>("/api/shipments", {
      disaster_id: Number(data.disasterId),
      status: "DIKIRIM",
      shipped_at: toApiDateTime(data.shippedAt),
      received_at: null,
      destination: data.destination,
      person_in_charge: data.personInCharge,
      request_key: key,
      created_by: userId,
    });
  } catch (error) {
    if (error instanceof DataError && error.code === "CONFLICT") {
      throw new DataError(
        "CONFLICT",
        "Pengiriman ini sudah tercatat sebelumnya. Tutup formulir lalu periksa daftar pengiriman.",
      );
    }
    throw error;
  }

  const shipment = fromApi(row, []);
  const ctx: WriteContext = { shipmentId: shipment.id, code: shipment.code, disasterId: data.disasterId, userId };
  try {
    for (const { itemId, quantity } of data.items) {
      shipment.items.push(await shipItem(ctx, itemId, quantity, data.shippedAt));
    }
  } catch (error) {
    // All or nothing (AB-03.2): undo what was written, then report the original failure.
    try {
      for (const item of shipment.items) await returnItem(ctx, item, context.today);
      await deleteRow(`/api/shipments/${row.id}`);
    } catch (rollbackError) {
      console.error("rollback pengiriman gagal", row.id, rollbackError);
    }
    throw error;
  }
  return shipment;
}

/** Corrects a shipment; differences go back to or out of stock as KOREKSI movements (KF-09.3). Audited (KF-09). */
export async function updateShipment(
  id: string,
  input: ShipmentInput,
  userId: number,
): Promise<Shipment> {
  const before = await requireShipment(id);
  const context = await loadContext(input.disasterId);
  const data = validateShipment(input, context, before.shipment);
  const ctx: WriteContext = { shipmentId: id, code: before.shipment.code, disasterId: data.disasterId, userId };

  const row = await patchJson<ApiShipment>(`/api/shipments/${id}`, {
    disaster_id: Number(data.disasterId),
    shipped_at: toApiDateTime(data.shippedAt),
    destination: data.destination,
    person_in_charge: data.personInCharge,
  });

  const items: ShipmentItem[] = [];
  for (const old of before.shipment.items) {
    const quantity = data.items.find((i) => i.itemId === old.itemId)?.quantity;
    if (quantity === undefined) {
      await returnItem(ctx, old, context.today);
      continue;
    }
    if (quantity !== old.quantity) {
      await patchJson(`/api/shipment-items/${old.id}`, { quantity: String(quantity) });
      await addMovement(ctx, old, "KOREKSI", quantity - old.quantity, context.today);
    }
    items.push({ ...old, quantity });
  }
  for (const { itemId, quantity } of data.items) {
    if (!before.shipment.items.some((i) => i.itemId === itemId)) {
      items.push(await shipItem(ctx, itemId, quantity, data.shippedAt));
    }
  }

  await recordAudit({
    userId,
    action: "UBAH",
    entityType: "shipments",
    entityId: id,
    before: { ...before.row, items: before.items },
    after: { ...row, items },
  });
  return { ...fromApi(row, []), items };
}

/** DIKIRIM → DITERIMA. Stores the receipt date only; stock is not touched (AB-03.3, AC-10). Audited (KF-09). */
export async function confirmShipmentReceived(
  id: string,
  receivedAt: string,
  userId: number,
): Promise<Shipment> {
  const { row, shipment } = await requireShipment(id);
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
  const after = await patchJson<ApiShipment>(`/api/shipments/${id}`, {
    status: "DITERIMA",
    received_at: toApiDateTime(receivedAt),
  });
  await recordAudit({ userId, action: "UBAH", entityType: "shipments", entityId: id, before: row, after });
  return { ...fromApi(after, []), items: shipment.items };
}

/** Soft delete; every item goes back into stock, so the disaster's shipped totals drop too (KF-09.3). Audited (KF-09). */
export async function deleteShipment(id: string, userId: number): Promise<Shipment> {
  const { row, items, shipment } = await requireShipment(id);
  const ctx: WriteContext = { shipmentId: id, code: shipment.code, disasterId: shipment.disasterId, userId };
  const today = todayInJakarta();
  for (const item of shipment.items) await returnItem(ctx, item, today);
  await deleteRow(`/api/shipments/${id}`);
  await recordAudit({
    userId,
    action: "HAPUS",
    entityType: "shipments",
    entityId: id,
    before: { ...row, items },
    after: null,
  });
  return shipment;
}
