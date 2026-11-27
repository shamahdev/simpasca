import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Disaster, InventoryItem, Shipment } from "../types.ts";
import type { DisasterInput } from "./disasters.ts";
import { DataError } from "./errors.ts";
import type { ShipmentContext, ShipmentInput } from "./shipments.ts";
import { mockNextRequest, page, stubApi, type ApiCall } from "./test-helpers.ts";

mockNextRequest();
const { validateDisasterInput } = await import("./disasters.ts");
const { recommendedQuantity } = await import("./inventory.ts");
const { computeFulfillment, confirmShipmentReceived, createShipment, deleteShipment, updateShipment, validateShipment } =
  await import("./shipments.ts");
const { computeDisasterTrend } = await import("./dashboard.ts");

let restore = () => {};
afterEach(() => restore());

const disasterInput = (overrides: Partial<DisasterInput> = {}): DisasterInput => ({
  disasterType: "Banjir",
  status: "AKTIF",
  province: "Jawa Barat",
  regencyCity: "Kab. Garut",
  latitude: "",
  longitude: "",
  occurredAt: "2026-06-20T10:00",
  handlingScale: "KABUPATEN_KOTA",
  affectedPeople: "250",
  affectedHouseholds: "60",
  locationDetails: "Tarogong",
  impactNotes: "Uji",
  ...overrides,
});

const item = (overrides: Partial<InventoryItem>): InventoryItem => ({
  id: "1", name: "Beras", category: "PANGAN", stockUnit: "kg", initialStock: 0,
  needRatio: 0.5, needType: "HARIAN", ratioBasis: null, expirationDate: null, ...overrides,
});

const beras = item({ id: "1", name: "Beras", needRatio: 0.5, needType: "HARIAN", expirationDate: "2027-03-01" });
const tenda = item({ id: "2", name: "Tenda", category: "PAPAN", stockUnit: "unit", needRatio: 0.05, needType: "SATU_KALI" });
const mie = item({ id: "3", name: "Mie instan", stockUnit: "dus", needRatio: null, expirationDate: "2026-10-01" });

const context = (overrides: Partial<ShipmentContext> = {}): ShipmentContext => ({
  disasterExists: true,
  items: [beras, tenda, mie],
  stock: new Map([["1", 5500], ["2", 8], ["3", 8]]),
  today: "2026-06-20",
  ...overrides,
});

const shipmentInput = (items: ShipmentInput["items"]): ShipmentInput => ({
  disasterId: "5", shippedAt: "2026-06-20", destination: "Posko uji", personInCharge: "Petugas uji", items,
});

const rejects = (fn: () => unknown, field: string) =>
  assert.throws(fn, (e) => e instanceof DataError && e.code === "INVALID" && field in (e.fieldErrors ?? {}));

test("AC-04/AC-05/AC-06/AC-24: AB-01 recommendation", () => {
  assert.equal(recommendedQuantity(item({ needRatio: 0.5, needType: "HARIAN" }), 250), 3750);
  assert.equal(recommendedQuantity(item({ needRatio: 0.05, needType: "SATU_KALI" }), 250), 13);
  assert.equal(recommendedQuantity(item({ needRatio: null }), 250), null);
  assert.equal(recommendedQuantity(item({ needRatio: 0 }), 250), null);
});

test("AC-03: disaster validation", () => {
  rejects(() => validateDisasterInput(disasterInput({ affectedPeople: "-1" })), "affectedPeople");
  rejects(() => validateDisasterInput(disasterInput({ affectedPeople: "2.5" })), "affectedPeople");
  rejects(() => validateDisasterInput(disasterInput({ affectedHouseholds: "300" })), "affectedHouseholds");
  rejects(() => validateDisasterInput(disasterInput({ regencyCity: "Kab. Demak" })), "regencyCity");
  rejects(() => validateDisasterInput(disasterInput({ latitude: "40", longitude: "107" })), "latitude");
  rejects(() => validateDisasterInput(disasterInput({ status: "SIAGA" })), "status");
  const ok = validateDisasterInput(disasterInput({ affectedHouseholds: "" }));
  assert.equal(ok.affectedHouseholds, null);
  assert.equal(ok.occurredAt, "2026-06-20T10:00:00+07:00");
});

test("AC-08/AB-03.2: one item over stock rejects the whole shipment", () => {
  rejects(
    () => validateShipment(shipmentInput([{ itemId: "1", quantity: "100" }, { itemId: "2", quantity: "9" }]), context()),
    "items",
  );
  const ok = validateShipment(shipmentInput([{ itemId: "1", quantity: "100" }, { itemId: "2", quantity: "8" }]), context());
  assert.deepEqual(ok.items, [{ itemId: "1", quantity: 100 }, { itemId: "2", quantity: 8 }]);
});

test("AC-14: expired food cannot be shipped; duplicates and bad quantities are refused", () => {
  rejects(() => validateShipment(shipmentInput([{ itemId: "3", quantity: "1" }]), context({ today: "2026-11-21" })), "items");
  rejects(() => validateShipment(shipmentInput([{ itemId: "1", quantity: "1" }, { itemId: "1", quantity: "2" }]), context()), "items");
  rejects(() => validateShipment(shipmentInput([{ itemId: "1", quantity: "0" }]), context()), "items");
  rejects(() => validateShipment(shipmentInput([]), context()), "items");
  rejects(() => validateShipment({ ...shipmentInput([{ itemId: "1", quantity: "1" }]), shippedAt: "2026-06-21" }, context()), "shippedAt");
  rejects(() => validateShipment(shipmentInput([{ itemId: "1", quantity: "1" }]), context({ disasterExists: false })), "disasterId");
});

test("KF-09.3: an edited shipment may reuse its own quantity", () => {
  const own = { items: [{ id: "9", itemId: "2", quantity: 5 }], receivedAt: null } as unknown as Shipment;
  // 8 in stock + 5 already on this shipment = 13 available.
  validateShipment(shipmentInput([{ itemId: "2", quantity: "13" }]), context(), own);
  rejects(() => validateShipment(shipmentInput([{ itemId: "2", quantity: "14" }]), context(), own), "items");
});

test("AC-11/AC-12: fulfillment per item", () => {
  const disaster = { id: "5", affectedPeople: 250 } as Disaster;
  const shipments = [
    { disasterId: "5", items: [{ id: "a", itemId: "2", quantity: 13 }, { id: "b", itemId: "3", quantity: 2 }] },
    { disasterId: "6", items: [{ id: "c", itemId: "1", quantity: 9999 }] },
  ] as Shipment[];
  const rows = computeFulfillment(disaster, [beras, tenda, mie], context().stock, shipments);
  assert.deepEqual(
    rows.map((r) => [r.item.name, r.recommended, r.shipped, r.remaining, r.status]),
    [
      ["Beras", 3750, 0, 3750, "KURANG"],
      ["Tenda", 13, 13, 0, "TERPENUHI"],
      ["Mie instan", null, 2, null, "TANPA_RASIO"],
    ],
  );
});

test("KF-02.4: disaster trend counts the last six months per type", () => {
  const at = (occurredAt: string, disasterType: string) => ({ occurredAt, disasterType }) as Disaster;
  const { points, label } = computeDisasterTrend(
    [
      at("2026-11-01T00:30:00+07:00", "Banjir bandang"),
      at("2026-10-31T23:30:00+07:00", "Gempa bumi"),
      at("2026-06-15T10:00:00+07:00", "Banjir"),
      at("2026-05-31T10:00:00+07:00", "Banjir"),
    ],
    "2026-11-21",
  );
  assert.equal(label, "Jun–Nov 2026");
  assert.deepEqual(points.map((p) => p.month), ["Jun", "Jul", "Agu", "Sep", "Okt", "Nov"]);
  assert.deepEqual([points[0].banjir, points[4].gempa, points[5].banjir], [1, 1, 1]);
  assert.equal(computeDisasterTrend([], "2026-02-10").label, "Sep 2025–Feb 2026");
});

// --- API orchestration ------------------------------------------------------

const apiItem = (i: InventoryItem) => ({
  id: Number(i.id), name: i.name, category: i.category, stock_unit: i.stockUnit, initial_stock: "0",
  need_ratio: i.needRatio === null ? null : String(i.needRatio), need_type: i.needType,
  ratio_basis: null, expiration_date: i.expirationDate, created_by: 1,
});
const apiShipment = { id: 42, disaster_id: 5, status: "DIKIRIM", shipped_at: "2026-06-19T17:00:00.000Z",
  received_at: null, destination: "Posko uji", person_in_charge: "Petugas uji", request_key: "k-1",
  created_by: 1, created_at: "2026-06-20T01:00:00.000Z", updated_at: "2026-06-20T01:00:00.000Z", deleted_at: null };

/** Fake backend: disaster 5, three items, stock from one STOK_AWAL movement each. */
function backend(override?: (call: ApiCall) => [number, unknown?] | undefined) {
  let nextItemId = 100;
  const api = stubApi((call) => {
    const custom = override?.(call);
    if (custom) return custom;
    const route = `${call.method} ${call.path}`;
    if (route === "GET /api/disasters/5") return [200, { data: { id: 5 } }];
    if (route === "GET /api/inventory-items") return [200, page([beras, tenda, mie].map(apiItem))];
    if (route === "GET /api/stock-movements") {
      return [200, page([["1", "5500"], ["2", "8"], ["3", "8"]].map(([id, q]) => ({ item_id: Number(id), quantity_in: q, quantity_out: "0" })))];
    }
    const withItems = (lines: { item_id: number; quantity: number | string }[]) => ({
      ...apiShipment,
      items: lines.map((l) => ({ id: nextItemId++, item_id: l.item_id, quantity: String(l.quantity) })),
    });
    if (route === "POST /api/shipments") return [201, { data: withItems(call.body.items) }];
    if (route === "PATCH /api/shipments/42") {
      const { items, ...fields } = call.body;
      return [200, { data: { ...withItems(items ?? [{ item_id: 1, quantity: 100 }]), ...fields } }];
    }
    if (call.method === "DELETE") return [204];
    if (route === "GET /api/shipments/42") return [200, { data: { ...apiShipment, items: [{ id: 100, item_id: 1, quantity: "100" }] } }];
    return [404, { message: `tidak ada ${route}` }];
  });
  restore = api.restore;
  return api.calls;
}

const writes = (calls: ApiCall[]) =>
  calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`);

// The API writes the shipment, its items, the stock movements and the audit in one
// transaction (AB-03.1, AB-03.2, KF-09): every change is exactly one request.

test("AB-03.1: a shipment and its items are one POST; no movements from the frontend", async () => {
  const calls = backend();
  const created = await createShipment(
    shipmentInput([{ itemId: "1", quantity: "100" }, { itemId: "2", quantity: "8" }]), "k-1",
  );
  assert.deepEqual(writes(calls), ["POST /api/shipments"]);
  const body = calls.find((c) => c.path === "/api/shipments")!.body;
  assert.deepEqual(
    [body.request_key, body.shipped_at, body.items, body.created_by, body.status],
    ["k-1", "2026-06-20T00:00:00+07:00", [{ item_id: 1, quantity: 100 }, { item_id: 2, quantity: 8 }], undefined, undefined],
  );
  assert.equal(created.code, "DST-0042");
  assert.equal(created.shippedAt, "2026-06-20");
  assert.deepEqual(created.items.map((i) => [i.itemId, i.quantity]), [["1", 100], ["2", 8]]);
});

test("AB-03.2: a shipment the API refuses writes nothing else", async () => {
  const calls = backend((call) =>
    call.method === "POST" && call.path === "/api/shipments" ? [422, { message: "Pengiriman ditolak." }] : undefined,
  );
  await assert.rejects(
    createShipment(shipmentInput([{ itemId: "1", quantity: "100" }]), "k-1"),
    (e) => e instanceof DataError && e.code === "INVALID",
  );
  assert.deepEqual(writes(calls), ["POST /api/shipments"]);
});

test("AB-03.4/AC-19: a reused request key is refused", async () => {
  const calls = backend((call) =>
    call.method === "POST" && call.path === "/api/shipments" ? [409, { message: "request_key sudah digunakan." }] : undefined,
  );
  await assert.rejects(
    createShipment(shipmentInput([{ itemId: "1", quantity: "1" }]), "k-1"),
    (e) => e instanceof DataError && e.code === "CONFLICT",
  );
  assert.deepEqual(writes(calls), ["POST /api/shipments"]);
});

test("KF-09.3: correcting a shipment sends all its lines in one PATCH", async () => {
  const calls = backend();
  const updated = await updateShipment("42", shipmentInput([{ itemId: "1", quantity: "60" }, { itemId: "2", quantity: "2" }]));
  assert.deepEqual(writes(calls), ["PATCH /api/shipments/42"]);
  assert.deepEqual(calls.at(-1)!.body.items, [{ item_id: 1, quantity: 60 }, { item_id: 2, quantity: 2 }]);
  assert.deepEqual(updated.items.map((i) => [i.itemId, i.quantity]), [["1", 60], ["2", 2]]);
});

test("AB-03.3: confirming receipt only sends the status and date", async () => {
  const calls = backend();
  await confirmShipmentReceived("42", "2026-06-21");
  assert.deepEqual(writes(calls), ["PATCH /api/shipments/42"]);
  assert.deepEqual(calls.at(-1)!.body, { status: "DITERIMA", received_at: "2026-06-21T00:00:00+07:00" });
});

test("KF-09.3: deleting a shipment is one DELETE; the API returns the stock", async () => {
  const calls = backend();
  await deleteShipment("42");
  assert.deepEqual(writes(calls), ["DELETE /api/shipments/42"]);
});
