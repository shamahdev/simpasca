import type { DisasterRow } from "@/components/bencana/disaster-table";
import { formatNumber, formatShortDate } from "@/lib/format";
import type { Disaster } from "@/lib/types";

/** "2026-06-16T08:30:00+07:00" → "2026-06-16T08:30" (WIB) for datetime-local inputs. */
const toLocalInput = (iso: string) =>
  new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
    .slice(0, 16)
    .replace(" ", "T");

/** "Banjir · Kabupaten Bandung" */
export const disasterName = (d: Pick<Disaster, "disasterType" | "regencyCity">) =>
  `${d.disasterType} · ${d.regencyCity.replace(/^Kab\./, "Kabupaten")}`;

/** Formats a disaster on the server for client tables and dialogs. */
export function toDisasterRow(d: Disaster): DisasterRow {
  return {
    id: d.id,
    disasterType: d.disasterType,
    status: d.status,
    province: d.province,
    regencyCity: d.regencyCity,
    latitude: d.latitude,
    longitude: d.longitude,
    occurredAtLocal: toLocalInput(d.occurredAt),
    handlingScale: d.handlingScale,
    affectedPeople: d.affectedPeople,
    affectedHouseholds: d.affectedHouseholds,
    locationDetails: d.locationDetails,
    impactNotes: d.impactNotes,
    title: `${d.disasterType} · ${formatShortDate(d.occurredAt)}`,
    name: disasterName(d),
    affectedText: `${formatNumber(d.affectedPeople)} jiwa`,
  };
}
