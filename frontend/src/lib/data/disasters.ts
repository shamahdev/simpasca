import { DISASTER_TYPES, HANDLING_SCALES, HANDLING_STATUSES } from "../options.ts";
import { findRegency, regions } from "../regions.ts";
import type { Disaster, HandlingScale, HandlingStatus } from "../types.ts";
import { cache } from "react";
import { deleteRow, getRow, listAll, patchJson, postJson } from "./api.ts";
import { DataError, invalidIfAny } from "./errors.ts";

/** Raw form values (all strings). */
export interface DisasterInput {
  disasterType: string;
  status: string;
  province: string;
  regencyCity: string;
  latitude: string;
  longitude: string;
  /** YYYY-MM-DDTHH:mm in WIB */
  occurredAt: string;
  handlingScale: string;
  affectedPeople: string;
  affectedHouseholds: string;
  locationDetails: string;
  impactNotes: string;
}

export const MAX_IMPACT_NOTES = 2000;
const MAX_LOCATION_DETAILS = 500;
const MAX_PEOPLE = 1_000_000_000;

const parseCount = (value: string) =>
  /^\d{1,10}$/.test(value.trim()) ? Number(value.trim()) : NaN;

type DisasterData = Omit<Disaster, "id" | "code" | "createdBy">;

/** Validates disaster form input (SKPL KF-03.1). */
export function validateDisasterInput(input: DisasterInput): DisasterData {
  const errors: Record<string, string> = {};

  if (!DISASTER_TYPES.includes(input.disasterType)) {
    errors.disasterType = "Pilih jenis bencana.";
  }
  if (!HANDLING_STATUSES.includes(input.status as HandlingStatus)) {
    errors.status = "Pilih status Aktif atau Selesai.";
  }
  if (!HANDLING_SCALES.includes(input.handlingScale as HandlingScale)) {
    errors.handlingScale = "Pilih skala penanganan.";
  }
  if (!regions[input.province]) {
    errors.province = "Pilih provinsi.";
  } else if (!findRegency(input.province, input.regencyCity)) {
    errors.regencyCity = "Pilih kabupaten/kota di provinsi tersebut.";
  }

  const lat = input.latitude.trim();
  const lng = input.longitude.trim();
  let latitude: number | null = null;
  let longitude: number | null = null;
  if (lat || lng) {
    latitude = Number(lat);
    longitude = Number(lng);
    if (!lat || Number.isNaN(latitude) || latitude < -11.5 || latitude > 6.5) {
      errors.latitude = "Lintang harus di antara −11,5 dan 6,5 (wilayah Indonesia).";
    }
    if (!lng || Number.isNaN(longitude) || longitude < 94.5 || longitude > 141.5) {
      errors.longitude = "Bujur harus di antara 94,5 dan 141,5 (wilayah Indonesia).";
    }
  }

  const occurred = new Date(`${input.occurredAt}:00+07:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input.occurredAt) ||
    Number.isNaN(occurred.getTime())
  ) {
    errors.occurredAt = "Tanggal dan waktu kejadian tidak valid.";
  }

  const affectedPeople = parseCount(input.affectedPeople);
  if (Number.isNaN(affectedPeople) || affectedPeople > MAX_PEOPLE) {
    errors.affectedPeople = "Isi bilangan bulat, minimal 0.";
  }
  let affectedHouseholds: number | null = null;
  if (input.affectedHouseholds.trim()) {
    affectedHouseholds = parseCount(input.affectedHouseholds);
    if (Number.isNaN(affectedHouseholds) || affectedHouseholds > MAX_PEOPLE) {
      errors.affectedHouseholds = "Isi bilangan bulat, minimal 0.";
    } else if (!errors.affectedPeople && affectedHouseholds > affectedPeople) {
      errors.affectedHouseholds = "Tidak boleh melebihi jumlah penduduk terdampak.";
    }
  }

  const locationDetails = input.locationDetails.trim();
  if (locationDetails.length > MAX_LOCATION_DETAILS) {
    errors.locationDetails = `Paling banyak ${MAX_LOCATION_DETAILS} karakter.`;
  }
  const impactNotes = input.impactNotes.trim();
  if (impactNotes.length > MAX_IMPACT_NOTES) {
    errors.impactNotes = `Paling banyak ${MAX_IMPACT_NOTES} karakter.`;
  }

  invalidIfAny(errors, "Periksa kembali isian data bencana.");
  return {
    disasterType: input.disasterType,
    province: input.province,
    regencyCity: input.regencyCity,
    latitude,
    longitude,
    locationDetails,
    status: input.status as HandlingStatus,
    handlingScale: input.handlingScale as HandlingScale,
    occurredAt: `${input.occurredAt}:00+07:00`,
    affectedPeople,
    affectedHouseholds,
    impactNotes,
  };
}

// --- API ------------------------------------------------------------------

export interface ApiDisaster {
  id: number;
  disaster_type: string;
  province: string;
  regency_city: string;
  latitude: string | null;
  longitude: string | null;
  location_details: string | null;
  status: string;
  handling_scale: string;
  occurred_at: string;
  affected_people: number;
  affected_households: number | null;
  impact_notes: string | null;
  created_by: number;
}

const toNumber = (value: string | null) => (value === null ? null : Number(value));

export function fromApi(d: ApiDisaster): Disaster {
  return {
    id: String(d.id),
    code: `BCN-${String(d.id).padStart(4, "0")}`,
    disasterType: d.disaster_type,
    province: d.province,
    regencyCity: d.regency_city,
    latitude: toNumber(d.latitude),
    longitude: toNumber(d.longitude),
    locationDetails: d.location_details ?? "",
    status: d.status as HandlingStatus,
    handlingScale: d.handling_scale as HandlingScale,
    occurredAt: d.occurred_at,
    affectedPeople: d.affected_people,
    affectedHouseholds: d.affected_households,
    impactNotes: d.impact_notes ?? "",
    createdBy: d.created_by,
  };
}

const toApi = (d: DisasterData) => ({
  disaster_type: d.disasterType,
  province: d.province,
  regency_city: d.regencyCity,
  latitude: d.latitude === null ? null : d.latitude.toFixed(7),
  longitude: d.longitude === null ? null : d.longitude.toFixed(7),
  location_details: d.locationDetails || null,
  status: d.status,
  handling_scale: d.handlingScale,
  occurred_at: d.occurredAt,
  affected_people: d.affectedPeople,
  // The API column is not nullable; an unknown household count is sent as 0.
  affected_households: d.affectedHouseholds ?? 0,
  impact_notes: d.impactNotes || null,
});

const PATH = "/api/disasters";

/** Disasters, newest occurrence first. Once per request. */
export const listDisasters = cache(async (): Promise<Disaster[]> => {
  const rows = await listAll<ApiDisaster>(PATH);
  return rows.map(fromApi).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
});

export async function getDisaster(id: string): Promise<Disaster | undefined> {
  const row = await getRow<ApiDisaster>(PATH, id);
  return row && fromApi(row);
}

async function requireDisaster(id: string) {
  const row = await getRow<ApiDisaster>(PATH, id);
  if (!row) throw new DataError("NOT_FOUND", "Data bencana tidak ditemukan atau sudah dihapus.");
  return row;
}

export async function createDisaster(input: DisasterInput): Promise<Disaster> {
  return fromApi(await postJson<ApiDisaster>(PATH, toApi(validateDisasterInput(input))));
}

/** Updates a disaster; recommendations follow because they are computed on read (KF-05.2). Audited by the API (KF-09). */
export async function updateDisaster(id: string, input: DisasterInput): Promise<Disaster> {
  const data = validateDisasterInput(input);
  await requireDisaster(id);
  return fromApi(await patchJson<ApiDisaster>(`${PATH}/${id}`, toApi(data)));
}

/** Soft delete: shipments, cash and reports keep pointing at it (AC-18). Audited by the API (KF-09). */
export async function deleteDisaster(id: string): Promise<void> {
  await requireDisaster(id);
  await deleteRow(`${PATH}/${id}`);
}
