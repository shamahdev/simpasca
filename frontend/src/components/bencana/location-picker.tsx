"use client";

import "leaflet/dist/leaflet.css";
import { Button, Input, Label, TextField } from "@heroui/react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { MapPin, Search } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PlaceAddress } from "@/lib/regions";

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: PlaceAddress;
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

/** Indonesia, slightly padded; the map cannot be panned far outside it. */
const INDONESIA: [[number, number], [number, number]] = [
  [-12.5, 93.5],
  [7.5, 142.5],
];
const round6 = (n: number) => Number(n.toFixed(6));

const pinIcon = (L: typeof import("leaflet")) =>
  L.divIcon({
    className: "",
    html: '<div class="size-5 rounded-full border-[3px] border-white bg-accent shadow-md"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

/**
 * Search a place, then click or drag the pin for the exact point (like a maps
 * app). The lintang/bujur inputs stay the source of truth: `value` moves the
 * pin, and picking on the map calls `onChange`, then `onPlace` with the
 * address of the point so the form can fill in the region.
 * Search uses OpenStreetMap Nominatim, tiles come from OpenStreetMap.
 */
export function LocationPicker({
  value,
  fallbackCenter,
  onChange,
  onPlace,
}: {
  value: LatLng | null;
  /** Where to look when there is no pin yet, e.g. the selected regency. */
  fallbackCenter: LatLng | null;
  onChange: (value: LatLng) => void;
  onPlace: (address: PlaceAddress) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap>(null);
  const markerRef = useRef<Marker>(null);
  const leafletRef = useRef<typeof import("leaflet")>(null);
  const [isReady, setIsReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const lookup = useRef(0);

  /** Sets the point; the address follows from `address` or a reverse lookup. */
  async function setPoint(lat: number, lng: number, address?: PlaceAddress) {
    onChange({ latitude: round6(lat), longitude: round6(lng) });
    const request = ++lookup.current;
    if (!address) {
      try {
        const params = new URLSearchParams({ lat: String(lat), lon: String(lng), format: "jsonv2", zoom: "14", "accept-language": "id" });
        const response = await fetch(`${NOMINATIM}/reverse?${params}`);
        address = response.ok ? (await response.json()).address : undefined;
      } catch {
        // Without an address the user picks the region by hand.
      }
    }
    // A later click wins over a slow earlier lookup.
    if (address && request === lookup.current) onPlace(address);
  }

  const pick = useEffectEvent((lat: number, lng: number) => {
    setPoint(lat, lng);
  });
  const initialView = useEffectEvent(() => ({ value, fallbackCenter }));

  // Leaflet needs `window`, so it is loaded in the browser only.
  useEffect(() => {
    let map: LeafletMap | undefined;
    let cancelled = false;
    const resize = new ResizeObserver(() => map?.invalidateSize());
    import("leaflet").then(({ default: L }) => {
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      map = L.map(containerRef.current, { maxBounds: INDONESIA, minZoom: 4 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const { value: start, fallbackCenter: area } = initialView();
      if (start) map.setView([start.latitude, start.longitude], 15);
      else if (area) map.setView([area.latitude, area.longitude], 11);
      else map.fitBounds(INDONESIA);
      map.on("click", (e) => pick(e.latlng.lat, e.latlng.lng));
      mapRef.current = map;
      resize.observe(containerRef.current);
      setIsReady(true);
    });
    return () => {
      cancelled = true;
      resize.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Pin follows the value, including values typed into the lintang/bujur inputs.
  const latitude = value?.latitude;
  const longitude = value?.longitude;
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!isReady || !map || !L) return;
    if (latitude === undefined || longitude === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([latitude, longitude], { icon: pinIcon(L), draggable: true })
        .on("dragend", (e) => {
          const at = (e.target as Marker).getLatLng();
          pick(at.lat, at.lng);
        })
        .addTo(map);
    } else {
      markerRef.current.setLatLng([latitude, longitude]);
    }
    if (!map.getBounds().contains([latitude, longitude])) map.panTo([latitude, longitude]);
  }, [isReady, latitude, longitude]);

  // Without a pin, show the selected regency.
  const areaLat = fallbackCenter?.latitude;
  const areaLng = fallbackCenter?.longitude;
  useEffect(() => {
    if (!isReady || markerRef.current || areaLat === undefined || areaLng === undefined) return;
    mapRef.current?.flyTo([areaLat, areaLng], 11);
  }, [isReady, areaLat, areaLng]);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const params = new URLSearchParams({
        q,
        format: "jsonv2",
        countrycodes: "id",
        limit: "5",
        "accept-language": "id",
        addressdetails: "1",
      });
      const response = await fetch(`${NOMINATIM}/search?${params}`);
      if (!response.ok) throw new Error(String(response.status));
      const found: PlaceResult[] = await response.json();
      setResults(found);
      if (found.length === 0) setSearchError("Tempat tidak ditemukan. Coba nama kecamatan atau desa.");
    } catch {
      setResults(undefined);
      setSearchError("Pencarian tempat sedang tidak tersedia. Klik langsung pada peta.");
    } finally {
      setIsSearching(false);
    }
  }

  function choose(place: PlaceResult) {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    mapRef.current?.setView([lat, lng], 16);
    setPoint(lat, lng, place.address);
    setResults(undefined);
  }

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="flex items-end gap-2">
        <TextField className="flex-1" value={query} onChange={setQuery}>
          <Label>Titik lokasi</Label>
          <Input
            placeholder="Cari tempat, mis. Dayeuhkolot, Bandung"
            onKeyDown={(e) => {
              // Enter searches instead of submitting the disaster form.
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
          />
        </TextField>
        <Button variant="outline" onPress={search} isPending={isSearching}>
          <Search aria-hidden className="size-4" />
          Cari
        </Button>
      </div>

      {results && results.length > 0 && (
        <ul aria-label="Hasil pencarian tempat" className="flex flex-col rounded-2xl bg-surface-secondary p-1">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-default"
              >
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                {place.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && <p className="text-xs text-danger">{searchError}</p>}

      {/* isolate keeps Leaflet's own z-indexes below the dialog's popovers. */}
      <div
        ref={containerRef}
        role="application"
        aria-label="Peta pemilihan titik lokasi"
        className="isolate h-64 overflow-hidden rounded-2xl bg-surface-secondary"
      />
      <p className="text-xs text-muted">
        Klik peta atau geser penanda untuk titik yang tepat. Wilayah, lintang, dan bujur terisi otomatis.
      </p>
    </div>
  );
}
