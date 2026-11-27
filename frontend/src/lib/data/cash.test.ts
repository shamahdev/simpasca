import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { ApiCashTransaction, CashInput } from "./cash.ts";
import { DataError } from "./errors.ts";
import { mockNextRequest } from "./test-helpers.ts";

mockNextRequest();
const { createCashTransaction, getCashTransaction, updateCashTransaction, validateCashInput } =
  await import("./cash.ts");

const input = (overrides: Partial<CashInput> = {}): CashInput => ({
  type: "KELUAR",
  amount: "12500000",
  description: " Pembelian beras ",
  transactionDate: "2026-06-17",
  ...overrides,
});

const apiRow: ApiCashTransaction = {
  id: 7,
  type: "expense",
  amount: "12500000.00",
  description: "Pembelian beras",
  transaction_date: "2026-06-17",
  request_key: "k-1",
  created_by: 1,
  disaster_id: null,
  receipt_id: null,
  created_at: "2026-06-17T02:15:00.000Z",
  updated_at: "2026-06-17T02:15:00.000Z",
  deleted_at: null,
};

const realFetch = globalThis.fetch;
let calls: { url: string; init?: RequestInit }[] = [];
function stubFetch(status: number, body?: unknown) {
  calls = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
});

const rejectsWith = (promise: Promise<unknown>, code: DataError["code"]) =>
  assert.rejects(promise, (e) => e instanceof DataError && e.code === code);

test("A3: invalid input is rejected with field errors before calling the API", () => {
  for (const [bad, field] of [
    [{ amount: "0" }, "amount"],
    [{ amount: "-5" }, "amount"],
    [{ amount: "1.234" }, "amount"],
    [{ amount: "10000000000000" }, "amount"],
    [{ type: "income" }, "type"],
    [{ description: "   " }, "description"],
    [{ description: "x".repeat(1001) }, "description"],
    [{ transactionDate: "2026-02-30" }, "transactionDate"],
    [{ disasterId: "x" }, "disasterId"],
    [{ type: "MASUK", receiptId: "3" }, "receiptId"],
  ] as const) {
    assert.throws(
      () => validateCashInput(input(bad)),
      (e) => e instanceof DataError && e.code === "INVALID" && field in e.fieldErrors!,
    );
  }
});

test("valid input is normalised for the API", () => {
  assert.deepEqual(validateCashInput(input({ amount: "9999999999999.99" })), {
    type: "KELUAR",
    amount: "9999999999999.99",
    description: "Pembelian beras",
    transaction_date: "2026-06-17",
    disaster_id: null,
    receipt_id: null,
  });
  // Links: "none" clears, ids become numbers; a receipt only on an expense.
  assert.deepEqual(
    (({ disaster_id, receipt_id }) => ({ disaster_id, receipt_id }))(
      validateCashInput(input({ disasterId: "4", receiptId: "none" })),
    ),
    { disaster_id: 4, receipt_id: null },
  );
  assert.equal(validateCashInput(input({ receiptId: "3" })).receipt_id, 3);
});

test("create sends the API body and maps the response", async () => {
  stubFetch(201, { data: apiRow });
  const created = await createCashTransaction(input({ disasterId: "4" }), "k-1");

  assert.equal(calls[0].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
    type: "expense",
    amount: "12500000.00",
    description: "Pembelian beras",
    transaction_date: "2026-06-17",
    disaster_id: 4,
    receipt_id: null,
    request_key: "k-1",
  });
  assert.deepEqual(
    { id: created.id, type: created.type, amount: created.amount, createdBy: created.createdBy },
    { id: "7", type: "KELUAR", amount: 12500000, createdBy: 1 },
  );
});

test("A2/AC-19: a reused request key (409) becomes a clear conflict error", async () => {
  stubFetch(409, { message: "request_key sudah digunakan." });
  await rejectsWith(createCashTransaction(input(), "k-1"), "CONFLICT");
});

test("A4: update sends every attribute, including the type; the API writes the audit (KF-09)", async () => {
  stubFetch(200, { data: { ...apiRow, type: "income", disaster_id: 4 } });
  const updated = await updateCashTransaction("7", input({ type: "MASUK" }));
  assert.deepEqual(
    calls.map((c) => `${c.init?.method ?? "GET"} ${new URL(c.url).pathname}`),
    ["GET /api/cash-transactions/7", "PATCH /api/cash-transactions/7"],
  );
  assert.equal(JSON.parse(String(calls[1].init?.body)).type, "income");
  assert.equal((calls[1].init?.headers as Record<string, string>).Authorization, "Bearer test-token");
  assert.deepEqual([updated.type, updated.disasterId, updated.receiptId], ["MASUK", "4", null]);
});

test("A6: missing or malformed ids resolve to undefined; API outages surface", async () => {
  stubFetch(404, { message: "Transaksi kas tidak ditemukan." });
  assert.equal(await getCashTransaction("999"), undefined);
  assert.equal(await getCashTransaction("abc"), undefined);
  assert.equal(calls.length, 1);

  stubFetch(503, { message: "Database tidak tersedia" });
  await rejectsWith(getCashTransaction("1"), "UNAVAILABLE");
});
