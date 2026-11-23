import assert from "node:assert/strict";
import { test } from "node:test";
import { matchRegion } from "./regions.ts";

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

test("areas outside the sample region list are left for the user to pick", () => {
  const notListed = matchRegion({ county: "Kabupaten Sumedang", state: "Jawa Barat", "ISO3166-2-lvl4": "ID-JB" });
  assert.deepEqual([notListed.province, notListed.regencyCity], ["Jawa Barat", undefined]);
  const otherProvince = matchRegion({ city: "Makassar", state: "Sulawesi Selatan", "ISO3166-2-lvl4": "ID-SN" });
  assert.deepEqual([otherProvince.province, otherProvince.regencyCity], [undefined, undefined]);
});
