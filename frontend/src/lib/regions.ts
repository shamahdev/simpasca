import { PROVINCES } from "./regions-data.ts";

/** A kabupaten/kota with its approximate centre, used when a disaster has no coordinates (AC-27). */
export interface Regency {
  /** Kemendagri code, e.g. "32.04". */
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** All 38 provinces and 514 kabupaten/kota (Kemendagri), generated into regions-data.ts. */
export const regions: Record<string, Regency[]> = Object.fromEntries(
  PROVINCES.map((p) => [p.name, p.regencies]),
);

export function findRegency(province: string, regencyCity: string) {
  return regions[province]?.find((r) => r.name === regencyCity);
}

/** ISO 3166-2 code (as OpenStreetMap reports it) → province name. */
const PROVINCE_CODES: Record<string, string> = Object.fromEntries(PROVINCES.map((p) => [p.iso, p.name]));

/** Address of a point from OpenStreetMap Nominatim (only the fields used here). */
export interface PlaceAddress {
  "ISO3166-2-lvl4"?: string;
  state?: string;
  /** Kabupaten, with or without the "Kabupaten" prefix. */
  county?: string;
  /** Kota, with or without the "Kota" prefix. */
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  hamlet?: string;
  district?: string;
  city_district?: string;
}

const coreName = (name: string) =>
  name.replace(/^(Kabupaten|Kab\.|Kota)\s+/i, "").trim().toLowerCase();

/**
 * Maps an OpenStreetMap address to the form's province, kabupaten/kota and
 * location details. Province or regency stay undefined when they are not in the
 * region list, so the user picks them by hand.
 */
export function matchRegion(address: PlaceAddress) {
  const province =
    PROVINCE_CODES[address["ISO3166-2-lvl4"] ?? ""] ??
    Object.keys(regions).find((p) => p.toLowerCase() === address.state?.toLowerCase());

  // OSM puts a kabupaten in `county` and a kota in `city`; the kind matters (Kab. vs Kota Bandung).
  const area = address.county ?? address.city;
  const kind = address.county ? "Kab." : "Kota";
  const candidates = area && province ? regions[province].filter((r) => coreName(r.name) === coreName(area)) : [];
  const regencyCity = (candidates.find((r) => r.name.startsWith(kind)) ?? (candidates.length === 1 ? candidates[0] : undefined))?.name;

  const place = address.village ?? address.suburb ?? address.town ?? address.hamlet;
  const district = address.district ?? address.city_district;
  const details = [place, district && `Kec. ${district}`].filter(Boolean).join(", ");
  const label = [area && (address.county && !/^Kab/i.test(area) ? `Kabupaten ${area}` : area), address.state]
    .filter(Boolean)
    .join(", ");

  return { province, regencyCity, details, label };
}
