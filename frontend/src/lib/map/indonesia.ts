import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopology from "world-atlas/countries-50m.json";

/** SVG viewBox size of the dashboard map. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 330;
const MAP_PADDING = 16;

// ISO 3166-1 numeric codes used by world-atlas.
const INDONESIA_ID = "360";
const NEIGHBOR_IDS = new Set(["458", "096", "626", "598", "608"]);

const topology = countriesTopology as unknown as Topology<{
  countries: GeometryCollection;
}>;
const countries = feature(topology, topology.objects.countries).features;
const indonesia = countries.find((c) => c.id === INDONESIA_ID)!;

const projection = geoMercator().fitExtent(
  [
    [MAP_PADDING, MAP_PADDING],
    [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
  ],
  indonesia,
);
const toPath = geoPath(projection).digits(1);

export const indonesiaPath = toPath(indonesia) ?? "";

export const neighborPaths = countries
  .filter((c) => NEIGHBOR_IDS.has(String(c.id)))
  .map((c) => toPath(c) ?? "");

/** Projects a coordinate to a position in percent of the map box. */
export function projectToPercent(longitude: number, latitude: number) {
  const point = projection([longitude, latitude]);
  if (!point) return null;
  return {
    x: (point[0] / MAP_WIDTH) * 100,
    y: (point[1] / MAP_HEIGHT) * 100,
  };
}
