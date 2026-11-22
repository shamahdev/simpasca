import { CardRoot } from "@heroui/react";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  indonesiaPath,
  MAP_HEIGHT,
  MAP_WIDTH,
  neighborPaths,
  projectToPercent,
} from "@/lib/map/indonesia";
import { findRegency } from "@/lib/regions";
import type { Disaster } from "@/lib/types";
import { DisasterMapPanel, type MapMarker } from "./disaster-map-markers";

const MIN_MARKER_SIZE = 8;
const MAX_MARKER_SIZE = 20;

/** Stored coordinates, else the regency centre; none means list-only (AC-27). */
function positionOf(d: Disaster) {
  if (d.latitude !== null && d.longitude !== null) {
    return projectToPercent(d.longitude, d.latitude);
  }
  const regency = findRegency(d.province, d.regencyCity);
  return regency ? projectToPercent(regency.longitude, regency.latitude) : null;
}

function toMarkers(disasters: Disaster[]): MapMarker[] {
  const maxPeople = Math.max(1, ...disasters.map((d) => d.affectedPeople));

  return disasters.flatMap((d) => {
    const position = positionOf(d);
    if (!position) return [];

    // Marker area grows with the number of affected people (KF-02.3).
    const size =
      MIN_MARKER_SIZE +
      (MAX_MARKER_SIZE - MIN_MARKER_SIZE) *
        Math.sqrt(d.affectedPeople / maxPeople);

    return [
      {
        id: d.id,
        ...position,
        size,
        scale: d.handlingScale,
        status: d.status,
        title: `${d.disasterType} · ${d.regencyCity.replace(/^Kab\./, "Kabupaten")}`,
        location: `${d.locationDetails || d.regencyCity}, ${d.province}`,
        occurredAt: formatDateTime(d.occurredAt),
        affectedPeople: `${formatNumber(d.affectedPeople)} jiwa`,
        affectedFamilies:
          d.affectedHouseholds === null
            ? "–"
            : `${formatNumber(d.affectedHouseholds)} KK`,
        href: `/bencana/${d.id}`,
      },
    ];
  });
}

/** Sebaran Bencana: one point per disaster, active only by default (KF-02.3, UC-04). */
export function DisasterMapCard({ disasters }: { disasters: Disaster[] }) {
  return (
    <CardRoot>
      <DisasterMapPanel markers={toMarkers(disasters)}>
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="size-full"
          aria-hidden
        >
          {neighborPaths.map((d, i) => (
            <path
              key={i}
              d={d}
              className="fill-map-land-muted stroke-map-border"
              strokeWidth={0.5}
            />
          ))}
          <path
            d={indonesiaPath}
            className="fill-map-land stroke-map-border"
            strokeWidth={0.5}
          />
        </svg>
      </DisasterMapPanel>
    </CardRoot>
  );
}
