import type { ShipmentFormOptions } from "@/components/distribusi/shipment-dialog";
import type { ShipmentRow } from "@/components/distribusi/shipment-table";
import { listDisasters } from "@/lib/data/disasters";
import { listStock, recommendedQuantity } from "@/lib/data/inventory";
import { formatShortDate, shortRegencyName } from "@/lib/format";
import type { Disaster, Shipment } from "@/lib/types";
import { disasterName } from "../bencana/disaster-view";

/** "Banjir Bandung". */
export const shipmentDisasterLabel = (d: Disaster) =>
  `${d.disasterType} ${shortRegencyName(d.regencyCity)}`;

export async function toShipmentRow(s: Shipment): Promise<ShipmentRow> {
  // Disasters cannot be deleted while shipments reference them (AC-18), so a miss means stale data.
  const disaster = (await listDisasters()).find((d) => d.id === s.disasterId);
  return {
    id: s.id,
    code: s.code,
    status: s.status,
    disasterId: s.disasterId,
    shippedAt: s.shippedAt,
    destination: s.destination,
    personInCharge: s.personInCharge,
    items: s.items,
    disasterLabel: disaster ? shipmentDisasterLabel(disaster) : "Bencana tidak dikenal",
    shippedAtText: formatShortDate(s.shippedAt),
    receivedAtText: s.receivedAt ? formatShortDate(s.receivedAt) : "—",
  };
}

/** Disasters, items with stock and recommendations for the shipment form. */
export async function getShipmentFormOptions(): Promise<ShipmentFormOptions> {
  const [disasters, stock] = await Promise.all([listDisasters(), listStock()]);
  return {
    disasters: disasters.map((d) => ({ id: d.id, label: disasterName(d) })),
    items: stock.map(({ item, stock }) => ({
      id: item.id,
      name: item.name,
      unit: item.stockUnit,
      stock,
      // Compared with today in the dialog, so the prerendered page never freezes the date.
      foodExpiresOn: item.category === "PANGAN" ? item.expirationDate : null,
    })),
    recommendations: Object.fromEntries(
      disasters.map((d) => [
        d.id,
        Object.fromEntries(
          stock.map(({ item }) => [item.id, recommendedQuantity(item, d.affectedPeople)]),
        ),
      ]),
    ),
  };
}
