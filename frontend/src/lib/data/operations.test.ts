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
const { computeFulfillment, createShipment, deleteShipment, validateShipment } = await import(
  "./shipments.ts"
);
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
    if (route === "POST /api/shipments") return [201, { data: apiShipment }];
    if (route === "POST /api/shipment-items") return [201, { data: { id: nextItemId++, ...call.body } }];
    if (call.method === "POST") return [201, { data: { id: 1 } }];
    if (call.method === "DELETE") return [204];
    if (route === "GET /api/shipments/42") return [200, { data: apiShipment }];
    if (route === "GET /api/shipment-items") {
      return [200, page([{ id: 100, shipment_id: 42, item_id: 1, quantity: "100.000", deleted_at: null }])];
    }
    return [404, { message: `tidak ada ${route}` }];
  });
  restore = api.restore;
  return api.calls;
}

const writes = (calls: ApiCall[]) =>
  calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`);

test("AB-03.1/AB-02: a shipment writes its items and one PENGIRIMAN movement each", async () => {
  const calls = backend();
  const created = await createShipment(
    shipmentInput([{ itemId: "1", quantity: "100" }, { itemId: "2", quantity: "8" }]), "k-1", 1,
  );
  assert.deepEqual(writes(calls), [
    "POST /api/shipments",
    "POST /api/shipment-items", "POST /api/stock-movements",
    "POST /api/shipment-items", "POST /api/stock-movements",
  ]);
  const shipmentBody = calls.find((c) => c.path === "/api/shipments")!.body;
  assert.deepEqual(
    [shipmentBody.status, shipmentBody.request_key, shipmentBody.shipped_at],
    ["DIKIRIM", "k-1", "2026-06-20T00:00:00+07:00"],
  );
  const movement = calls.filter((c) => c.path === "/api/stock-movements" && c.method === "POST")[1].body;
  assert.deepEqual(
    [movement.movement_type, movement.item_id, movement.shipment_item_id, movement.quantity_out, movement.quantity_in, movement.disaster_id],
    ["PENGIRIMAN", 2, 101, "8", "0", 5],
  );
  assert.equal(created.code, "DST-0042");
  assert.equal(created.shippedAt, "2026-06-20");
  assert.equal(created.items.length, 2);
});

test("AB-03.2: a failure halfway rolls the shipment back and puts stock back", async () => {
  let items = 0;
  const calls = backend((call) =>
    call.method === "POST" && call.path === "/api/shipment-items" && ++items === 2
      ? [500, { message: "Database tidak tersedia" }]
      : undefined,
  );
  await assert.rejects(
    createShipment(shipmentInput([{ itemId: "1", quantity: "100" }, { itemId: "2", quantity: "8" }]), "k-1", 1),
    (e) => e instanceof DataError && e.code === "UNAVAILABLE",
  );
  assert.deepEqual(writes(calls).slice(4), [
    "POST /api/stock-movements", "DELETE /api/shipment-items/100", "DELETE /api/shipments/42",
  ]);
  const correction = calls.filter((c) => c.path === "/api/stock-movements" && c.method === "POST").at(-1)!.body;
  assert.deepEqual([correction.movement_type, correction.quantity_in, correction.quantity_out], ["KOREKSI", "100", "0"]);
});

test("AB-03.4/AC-19: a reused request key is refused without writing items", async () => {
  const calls = backend((call) =>
    call.method === "POST" && call.path === "/api/shipments" ? [409, { message: "request_key sudah digunakan." }] : undefined,
  );
  await assert.rejects(
    createShipment(shipmentInput([{ itemId: "1", quantity: "1" }]), "k-1", 1),
    (e) => e instanceof DataError && e.code === "CONFLICT",
  );
  assert.deepEqual(writes(calls), ["POST /api/shipments"]);
});

test("KF-09.3: deleting a shipment returns its stock, then audits", async () => {
  const calls = backend();
  await deleteShipment("42", 1);
  assert.deepEqual(writes(calls), [
    "POST /api/stock-movements", "DELETE /api/shipment-items/100", "DELETE /api/shipments/42", "POST /api/audit-logs",
  ]);
  const audit = calls.at(-1)!.body;
  assert.deepEqual([audit.action, audit.entity_type, audit.entity_id], ["HAPUS", "shipments", 42]);
});
