import { CardRoot } from "@heroui/react";
import { formatDateTime, formatNumber } from "@/lib/format";
import {
  indonesiaPath,
  MAP_HEIGHT,
  MAP_WIDTH,
  neighborPaths,
  projectToPercent,
} from "@/lib/map/indonesia";
import type { Disaster } from "@/lib/types";
import { DisasterMapMarkers, type MapMarker } from "./disaster-map-markers";
import { ScaleLegend } from "./scale-legend";

const MIN_MARKER_SIZE = 8;
const MAX_MARKER_SIZE = 20;

function toMarkers(disasters: Disaster[]): MapMarker[] {
  const maxPeople = Math.max(1, ...disasters.map((d) => d.affectedPeople));

  return disasters.flatMap((d) => {
    if (d.latitude === null || d.longitude === null) return [];
    const position = projectToPercent(d.longitude, d.latitude);
    if (!position) return [];

    // Marker area grows with the number of affected people (PRD KF-02).
    const size =
      MIN_MARKER_SIZE +
      (MAX_MARKER_SIZE - MIN_MARKER_SIZE) *
        Math.sqrt(d.affectedPeople / maxPeople);

    return [
      {
        id: d.id,
        ...position,
        size,
        scale: d.scale,
        status: d.status,
        title: `${d.type} · ${d.regency.replace(/^Kab\./, "Kabupaten")}`,
        location: `${d.locationNote}, ${d.province}`,
        occurredAt: formatDateTime(d.occurredAt),
        affectedPeople: `${formatNumber(d.affectedPeople)} jiwa`,
        affectedFamilies:
          d.affectedFamilies === null
            ? "–"
            : `${formatNumber(d.affectedFamilies)} KK`,
        href: `/bencana/${d.id}`,
      },
    ];
  });
}

/** Map of Indonesia with one point per disaster (PRD KF-02). */
export function DisasterMap({ disasters }: { disasters: Disaster[] }) {
  return (
    <div className="relative aspect-1000/330 w-full">
      <div className="absolute inset-0 overflow-hidden rounded-xl bg-map-water">
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
      </div>
      <DisasterMapMarkers markers={toMarkers(disasters)} />
    </div>
  );
}

export function DisasterMapCard({ disasters }: { disasters: Disaster[] }) {
  return (
    <CardRoot>
      <h2 className="text-base font-semibold">Sebaran Bencana</h2>
      <DisasterMap disasters={disasters} />
      <ScaleLegend />
    </CardRoot>
  );
}
