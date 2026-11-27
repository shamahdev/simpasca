import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { Disaster, InventoryItem, Shipment, User } from "../types.ts";
import { mockNextRequest, page, stubApi } from "./test-helpers.ts";

mockNextRequest();
const { buildSnapshot, generateReport, reportText } = await import("./reports.ts");
const { auditChanges } = await import("./audit.ts");
const { deleteUser, validateUserInput } = await import("./users.ts");
const { DataError } = await import("./errors.ts");

let restore = () => {};
afterEach(() => restore());

const disaster = (id: string, people = 250) =>
  ({
    id, code: `BCN-000${id}`, disasterType: "Banjir", province: "Jawa Barat", regencyCity: "Kab. Bandung",
    latitude: -7.02, longitude: 107.51, locationDetails: "Dayeuhkolot", status: "AKTIF", handlingScale: "PROVINSI",
    occurredAt: "2026-11-16T01:30:00.000Z", affectedPeople: people, affectedHouseholds: 65, impactNotes: "Banjir", createdBy: 1,
  }) as Disaster;
const items = [
  { id: "1", name: "Beras", category: "PANGAN", stockUnit: "kg", initialStock: 0, needRatio: 0.5, needType: "HARIAN", ratioBasis: null, expirationDate: null },
  { id: "2", name: "Tenda", category: "PAPAN", stockUnit: "unit", initialStock: 0, needRatio: 0.05, needType: "SATU_KALI", ratioBasis: null, expirationDate: null },
] as InventoryItem[];
const shipment = (id: string, disasterId: string, lines: [string, number][]) =>
  ({
    id, code: `DST-000${id}`, disasterId, status: "DIKIRIM", shippedAt: "2026-11-17", receivedAt: null,
    destination: "Posko", personInCharge: "Budi", requestKey: "k", createdBy: 1, createdAt: "", updatedAt: "",
    items: lines.map(([itemId, quantity], i) => ({ id: `${id}${i}`, itemId, quantity })),
  }) as Shipment;

test("AC-29/AC-31: a report holds one disaster's needs, distributions and category totals only", () => {
  const s = buildSnapshot(
    disaster("1"), items, new Map(),
    [shipment("1", "1", [["1", 1000], ["2", 13]]), shipment("2", "1", [["1", 500]]), shipment("3", "9", [["1", 777]])],
    "Shaddam", "2026-11-26T03:00:00.000Z",
  );
  assert.equal(s.disaster.code, "BCN-0001");
  assert.deepEqual(s.needs.map((n) => [n.name, n.recommended, n.shipped, n.status]), [
    ["Beras", 3750, 1500, "KURANG"],
    ["Tenda", 13, 13, "TERPENUHI"],
  ]);
  assert.equal(s.distributions.length, 3); // the other disaster's 777 kg is left out
  assert.deepEqual(s.categoryTotals, [
    { category: "PANGAN", unit: "kg", quantity: 1500 },
    { category: "PAPAN", unit: "unit", quantity: 13 },
  ]);
  assert.match(reportText(s), /Rekap distribusi:\n- DST-0001 Beras 1\.000 kg/);
});

test("AC-30: without shipments the report still builds, all needs Kurang, totals zero", () => {
  const s = buildSnapshot(disaster("1"), items, new Map(), [], "Shaddam", "2026-11-26T03:00:00.000Z");
  assert.deepEqual(s.needs.map((n) => n.status), ["KURANG", "KURANG"]);
  assert.deepEqual([s.distributions, s.categoryTotals], [[], []]);
  assert.match(reportText(s), /Belum ada pengiriman \(jumlah keluar 0\)/);
});

test("AC-32: generating writes only the report; the API adds author and GENERATE_LAPORAN audit", async () => {
  const api = stubApi((call) => {
    const route = `${call.method} ${call.path}`;
    if (route === "GET /api/disasters/1") {
      return [200, { data: { id: 1, disaster_type: "Banjir", province: "Jawa Barat", regency_city: "Kab. Bandung", latitude: null, longitude: null, location_details: null, status: "AKTIF", handling_scale: "PROVINSI", occurred_at: "2026-11-16T01:30:00.000Z", affected_people: 10, affected_households: 2, impact_notes: null, created_by: 1 } }];
    }
    if (call.method === "GET") return [200, page([])];
    if (route === "POST /api/generated-reports") return [201, { data: { id: 5, generated_by: 3, generated_by_name: "Rina", ...call.body } }];
    return [201, { data: { id: 1 } }];
  });
  restore = api.restore;
  const user = { id: 3, name: "Rina", username: "rina", role: "PETUGAS" } as User;
  const report = await generateReport("1", user);
  const writes = api.calls.filter((c) => c.method !== "GET");
  assert.deepEqual(writes.map((c) => c.path), ["/api/generated-reports"]);
  assert.deepEqual(Object.keys(writes[0].body).sort(), ["disaster_id", "report_snapshot"]);
  assert.equal(writes[0].body.report_snapshot.generatedByName, "Rina");
  assert.equal(report.code, "LAP-0005");
});

test("AC-17: audit detail lists changed fields, or every field for a delete", () => {
  assert.deepEqual(auditChanges({ amount: "10", type: "income" }, { amount: "15", type: "income" }), [
    { field: "amount", before: "10", after: "15" },
  ]);
  assert.deepEqual(auditChanges({ name: "Beras", ratio: null }, null).map((c) => [c.field, c.before, c.after]), [
    ["name", "Beras", "—"],
    ["ratio", "kosong", "—"],
  ]);
});

test("KF-01.4: account input rules and no self-delete", async () => {
  const valid = { name: "Rina", username: "rina.p", role: "PETUGAS", password: "sandi-rahasia-1" };
  assert.throws(() => validateUserInput({ ...valid, password: "pendek" }, true), DataError);
  assert.throws(() => validateUserInput({ ...valid, role: "ADMIN" }, true), DataError);
  assert.throws(() => validateUserInput({ ...valid, username: "a b" }, true), DataError);
  // Editing without a new password keeps the current one.
  assert.equal("password" in validateUserInput({ ...valid, password: "" }, false), false);
  await assert.rejects(deleteUser("3", { id: 3, name: "Rina", username: "rina", role: "SUPERADMIN" }), DataError);
});
