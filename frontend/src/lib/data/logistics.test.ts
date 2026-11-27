import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { InventoryItem } from "../types.ts";
import { DataError } from "./errors.ts";
import type { ItemInput } from "./inventory.ts";
import type { ReceiptInput } from "./receipts.ts";
import { mockNextRequest, page, stubApi, type ApiCall } from "./test-helpers.ts";

mockNextRequest();
const { createItem, updateItem, validateItemInput } = await import("./inventory.ts");
const { createReceipt, deleteReceipt, validateReceipt } = await import("./receipts.ts");

let restore = () => {};
afterEach(() => restore());

const itemInput = (overrides: Partial<ItemInput> = {}): ItemInput => ({
  name: " Beras ", category: "PANGAN", stockUnit: "kg", initialStock: "500", needRatio: "0.5",
  needType: "HARIAN", ratioBasis: "orang/hari", expirationDate: "2027-03-01", ...overrides,
});
const receiptInput = (overrides: Partial<ReceiptInput> = {}): ReceiptInput => ({
  itemId: "7", quantity: "100", receiptDate: "2026-11-20", sourceGiver: "Donasi warga",
  itemCondition: "Baik", notes: "", ...overrides,
});
const beras = { id: "7", name: "Beras", stockUnit: "kg" } as InventoryItem;

const rejects = (fn: () => unknown, field: string) =>
  assert.throws(fn, (e) => e instanceof DataError && e.code === "INVALID" && field in (e.fieldErrors ?? {}));

test("AC-21/AC-13: item categories are limited and stock must be whole", () => {
  rejects(() => validateItemInput(itemInput({ category: "OBAT" })), "category");
  rejects(() => validateItemInput(itemInput({ initialStock: "2.5" })), "initialStock");
  rejects(() => validateItemInput(itemInput({ initialStock: "-1" })), "initialStock");
  rejects(() => validateItemInput(itemInput({ needRatio: "0" })), "needRatio");
  rejects(() => validateItemInput(itemInput({ needType: "MINGGUAN" })), "needType");
  const ok = validateItemInput(itemInput({ initialStock: "0", needRatio: "" }));
  assert.deepEqual([ok.name, ok.initialStock, ok.needRatio], ["Beras", 0, null]);
  // Expiry is food-only information (KF-04.1).
  assert.equal(validateItemInput(itemInput({ category: "PAPAN" })).expirationDate, null);
});

test("KF-06.1: receipts need a whole positive quantity, a past date and a condition", () => {
  rejects(() => validateReceipt(receiptInput({ quantity: "0" }), beras, "2026-11-23"), "quantity");
  rejects(() => validateReceipt(receiptInput({ quantity: "1.5" }), beras, "2026-11-23"), "quantity");
  rejects(() => validateReceipt(receiptInput({ receiptDate: "2026-11-24" }), beras, "2026-11-23"), "receiptDate");
  rejects(() => validateReceipt(receiptInput({ itemCondition: "" }), beras, "2026-11-23"), "itemCondition");
  rejects(() => validateReceipt(receiptInput(), undefined, "2026-11-23"), "itemId");
});

/** Fake backend: item 7 (Beras, initial 500) with `stock` units left. */
function backend(stock: number, override?: (call: ApiCall) => [number, unknown?] | undefined) {
  const api = stubApi((call) => {
    const custom = override?.(call);
    if (custom) return custom;
    const route = `${call.method} ${call.path}`;
    if (route === "GET /api/inventory-items/7") {
      return [200, { data: { id: 7, name: "Beras", category: "PANGAN", stock_unit: "kg", initial_stock: "500.000", need_ratio: null, need_type: "HARIAN", ratio_basis: null, expiration_date: null, created_by: 1 } }];
    }
    if (route === "GET /api/stock-movements") return [200, page([{ id: 1, item_id: 7, quantity_in: String(stock), quantity_out: "0" }])];
    if (route === "GET /api/stock-receipts/3") {
      return [200, { data: { id: 3, item_id: 7, quantity: "100.000", receipt_date: "2026-11-20", source_giver: "Donasi warga", item_condition: "Baik", notes: null, request_key: "k", created_by: 1 } }];
    }
    if (route === "POST /api/inventory-items") return [201, { data: { id: 9, ...call.body } }];
    if (route === "POST /api/stock-receipts") return [201, { data: { id: 4, ...call.body } }];
    if (call.method === "POST") return [201, { data: { id: 1 } }];
    if (call.method === "PATCH") return [200, { data: { id: 7, ...call.body } }];
    return [204];
  });
  restore = api.restore;
  return api.calls;
}
const writes = (calls: ApiCall[]) => calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.path}`);

// The API writes STOK_AWAL, PENERIMAAN, KOREKSI and the audit itself (AB-02, KF-09):
// the frontend sends one write and never posts movements or audit rows.

test("UC-07/KF-06.2: a new item is one write; the API records STOK_AWAL", async () => {
  const calls = backend(0);
  await createItem(itemInput());
  assert.deepEqual(writes(calls), ["POST /api/inventory-items"]);
  assert.equal(calls[0].body.initial_stock, "500");
  assert.equal(calls[0].body.created_by, undefined);
});

test("KF-06.3: changing the opening stock is one PATCH, never below zero", async () => {
  const calls = backend(500);
  await updateItem("7", itemInput({ initialStock: "520" }));
  assert.deepEqual(writes(calls), ["PATCH /api/inventory-items/7"]);

  // Only 30 left after shipping: lowering the opening stock by 100 would go negative (AB-02.3).
  const refused = backend(30);
  await assert.rejects(updateItem("7", itemInput({ initialStock: "400" })), (e) => e instanceof DataError && "initialStock" in (e.fieldErrors ?? {}));
  assert.deepEqual(writes(refused), []);
});

test("UC-08/AC-22: a receipt is one write with its request key", async () => {
  const calls = backend(0);
  await createReceipt(receiptInput(), "key-1");
  assert.deepEqual(writes(calls), ["POST /api/stock-receipts"]);
  assert.equal(calls.find((c) => c.method === "POST")!.body.request_key, "key-1");
});

test("AC-17: deleting a receipt is refused when its goods were already shipped", async () => {
  const refused = backend(40);
  await assert.rejects(deleteReceipt("3"), (e) => e instanceof DataError && e.code === "INVALID");
  assert.deepEqual(writes(refused), []);

  const calls = backend(150);
  await deleteReceipt("3");
  assert.deepEqual(writes(calls), ["DELETE /api/stock-receipts/3"]);
});
