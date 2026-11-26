"use client";

import { CloseButton, Label, Switch } from "@heroui/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LinkButton } from "@/components/ui/link-button";
import {
  HandlingScaleChip,
  HandlingStatusChip,
} from "@/components/ui/status-chips";
import type { HandlingScale, HandlingStatus } from "@/lib/types";
import { ScaleLegend, scaleDotClass } from "./scale-legend";

export interface MapMarker {
  id: string;
  /** Position in percent of the map box. */
  x: number;
  y: number;
  /** Diameter in pixels. */
  size: number;
  scale: HandlingScale;
  status: HandlingStatus;
  title: string;
  location: string;
  occurredAt: string;
  affectedPeople: string;
  affectedFamilies: string;
  href: string;
}

const haloClass: Record<HandlingScale, string> = {
  KABUPATEN_KOTA: "bg-scale-regency/20 border-scale-regency",
  PROVINSI: "bg-scale-province/20 border-scale-province",
  NASIONAL: "bg-scale-national/20 border-scale-national",
};

/** Card body: title, Aktif/Semua switch (UC-04), map with markers, legend. `children` is the land SVG. */
export function DisasterMapPanel({
  markers: allMarkers,
  children,
}: {
  markers: MapMarker[];
  children: ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const markers = showAll
    ? allMarkers
    : allMarkers.filter((m) => m.status === "AKTIF");

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Sebaran Bencana</h2>
        <Switch isSelected={showAll} onChange={setShowAll} size="sm">
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-xs text-muted">
              Tampilkan bencana selesai
            </Label>
          </Switch.Content>
        </Switch>
      </div>
      <div className="relative aspect-1000/330 w-full">
        <div className="absolute inset-0 overflow-hidden rounded-xl bg-map-water">
          {children}
        </div>
        <DisasterMapMarkers markers={markers} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ScaleLegend />
        <span className="text-xs text-muted">
          {markers.length} titik {showAll ? "(semua bencana)" : "(bencana aktif)"}
        </span>
      </div>
    </>
  );
}

function DisasterMapMarkers({ markers }: { markers: MapMarker[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = markers.find((m) => m.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {markers.map((marker) => {
        const isSelected = marker.id === selectedId;
        return (
          <button
            key={marker.id}
            type="button"
            aria-label={marker.title}
            aria-pressed={isSelected}
            onClick={() => setSelectedId(isSelected ? null : marker.id)}
            className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
            style={{
              left: `${marker.x}%`,
              top: `${marker.y}%`,
              width: Math.max(marker.size + 14, 26),
              height: Math.max(marker.size + 14, 26),
            }}
          >
            {isSelected && (
              <span
                aria-hidden
                className={`absolute inset-0 rounded-full border ${haloClass[marker.scale]}`}
              />
            )}
            <span
              aria-hidden
              className={`relative rounded-full border-2 border-overlay shadow-sm ${scaleDotClass[marker.scale]}`}
              style={{ width: marker.size, height: marker.size }}
            />
          </button>
        );
      })}

      {selected && (
        <MarkerPopover
          marker={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function MarkerPopover({
  marker,
  onClose,
}: {
  marker: MapMarker;
  onClose: () => void;
}) {
  const opensLeft = marker.x > 60;

  return (
    <div
      role="dialog"
      aria-label={marker.title}
      className="pointer-events-auto absolute z-10 flex w-80 flex-col gap-3 rounded-3xl bg-overlay p-4 shadow-overlay"
      style={{
        top: `clamp(8px, calc(${marker.y}% - 110px), calc(100% - 248px))`,
        ...(opensLeft
          ? { right: `calc(${100 - marker.x}% + 24px)` }
          : { left: `calc(${marker.x}% + 24px)` }),
      }}
    >
      <div className="flex gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-medium">{marker.title}</p>
          <p className="text-xs text-muted">{marker.location}</p>
        </div>
        <CloseButton aria-label="Tutup" onPress={onClose} />
      </div>

      <div className="flex items-center gap-2">
        <HandlingStatusChip status={marker.status} />
        <HandlingScaleChip scale={marker.scale} />
      </div>

      <p className="text-xs text-muted">{marker.occurredAt}</p>

      <dl className="flex gap-4 border-t border-separator pt-3">
        <div className="flex flex-1 flex-col gap-1">
          <dt className="text-xs text-muted">Penduduk terdampak</dt>
          <dd className="text-sm font-semibold">{marker.affectedPeople}</dd>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <dt className="text-xs text-muted">Kepala keluarga</dt>
          <dd className="text-sm font-semibold">{marker.affectedFamilies}</dd>
        </div>
      </dl>

      <LinkButton href={marker.href} size="sm" fullWidth>
        <ArrowUpRight aria-hidden className="size-3.5" />
        Lihat detail bencana
      </LinkButton>
    </div>
  );
}
