import assert from "node:assert/strict";
import { test } from "node:test";
import { findRegency, matchRegion, regions } from "./regions.ts";

test("OpenStreetMap addresses map to the form's province and kabupaten/kota", () => {
  // Real Nominatim responses (abridged).
  assert.deepEqual(
    matchRegion({ village: "Pamekaran", county: "Kabupaten Bandung", state: "Jawa Barat", "ISO3166-2-lvl4": "ID-JB" }),
    { province: "Jawa Barat", regencyCity: "Kab. Bandung", details: "Pamekaran", label: "Kabupaten Bandung, Jawa Barat" },
  );
  assert.deepEqual(
    matchRegion({ suburb: "Merdeka", district: "Sumur Bandung", city: "Kota Bandung", state: "Jawa Barat", "ISO3166-2-lvl4": "ID-JB" }),
    { province: "Jawa Barat", regencyCity: "Kota Bandung", details: "Merdeka, Kec. Sumur Bandung", label: "Kota Bandung, Jawa Barat" },
  );
  assert.equal(matchRegion({ city: "Palembang", city_district: "Bukit Kecil", "ISO3166-2-lvl4": "ID-SS" }).regencyCity, "Kota Palembang");
  assert.equal(matchRegion({ county: "Agam", state: "Sumatera Barat", "ISO3166-2-lvl4": "ID-SB" }).regencyCity, "Kab. Agam");
});

test("the full Kemendagri list covers areas the old sample missed", () => {
  const sumedang = matchRegion({ county: "Kabupaten Sumedang", state: "Jawa Barat", "ISO3166-2-lvl4": "ID-JB" });
  assert.deepEqual([sumedang.province, sumedang.regencyCity], ["Jawa Barat", "Kab. Sumedang"]);
  const makassar = matchRegion({ city: "Makassar", state: "Sulawesi Selatan", "ISO3166-2-lvl4": "ID-SN" });
  assert.deepEqual([makassar.province, makassar.regencyCity], ["Sulawesi Selatan", "Kota Makassar"]);
  const nabire = matchRegion({ county: "Nabire", "ISO3166-2-lvl4": "ID-PT" });
  assert.deepEqual([nabire.province, nabire.regencyCity], ["Papua Tengah", "Kab. Nabire"]);
});

test("region data: 38 provinces, 514 kabupaten/kota inside Indonesia, unique names per province", () => {
  const provinces = Object.keys(regions);
  const all = Object.values(regions).flat();
  assert.equal(provinces.length, 38);
  assert.equal(all.length, 514);
  for (const [province, list] of Object.entries(regions)) {
    assert.equal(new Set(list.map((r) => r.name)).size, list.length, province);
  }
  // Same bounding box the disaster form enforces for coordinates.
  assert.ok(all.every((r) => r.latitude >= -11.5 && r.latitude <= 6.5 && r.longitude >= 94.5 && r.longitude <= 141.5));
  // Names the app already stores keep working.
  for (const [p, r] of [["Jawa Barat", "Kab. Bandung"], ["DKI Jakarta", "Kota Jakarta Timur"], ["Sumatera Selatan", "Kota Palembang"]]) {
    assert.ok(findRegency(p, r), `${p} / ${r}`);
  }
});
