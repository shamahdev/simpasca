import { CardRoot, Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ShipmentDetailActions,
  ShipmentItemsTable,
} from "@/components/distribusi/shipment-detail";
import { PageHeader } from "@/components/layout/page-header";
import { ShipmentStatusChip } from "@/components/ui/status-chips";
import { getDisaster } from "@/lib/data/disasters";
import { listInventoryItems } from "@/lib/data/inventory";
import { getShipment } from "@/lib/data/shipments";
import { formatLongDate, formatNumber } from "@/lib/format";
import { itemCategoryLabel } from "@/lib/labels";
import { getShipmentFormOptions, shipmentDisasterLabel, toShipmentRow } from "../shipment-view";

export const metadata: Metadata = {
  title: "Detail pengiriman",
};

/** Detail pengiriman (design 06B). */
export default function ShipmentDetailPage({ params }: PageProps<"/distribusi/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <ShipmentDetail params={params} />
    </Suspense>
  );
}

async function ShipmentDetail({ params }: Pick<PageProps<"/distribusi/[id]">, "params">) {
  const { id } = await params;
  const shipment = await getShipment(id);
  if (!shipment) notFound();

  const [disaster, inventory, row, options] = await Promise.all([
    getDisaster(shipment.disasterId),
    listInventoryItems(),
    toShipmentRow(shipment),
    getShipmentFormOptions(),
  ]);
  const items = shipment.items.map(({ itemId, quantity }) => {
    const item = inventory.find((i) => i.id === itemId);
    return {
      id: itemId,
      name: item?.name ?? itemId,
      category: item ? itemCategoryLabel[item.category] : "—",
      quantity: `${formatNumber(quantity)} ${item?.stockUnit ?? ""}`.trim(),
    };
  });

  const fields: [string, React.ReactNode][] = [
    ["Status", <ShipmentStatusChip key="status" status={shipment.status} />],
    ["Tanggal pengiriman", formatLongDate(shipment.shippedAt)],
    [
      "Lokasi tujuan",
      disaster
        ? `${shipment.destination}, ${disaster.regencyCity.replace(/^Kab\./, "Kabupaten")}`
        : shipment.destination,
    ],
    ["Penanggung jawab", shipment.personInCharge],
    [
      "Bencana terkait",
      disaster ? (
        <Link key="disaster" href={`/bencana/${disaster.id}`} className="text-accent hover:underline">
          {`${disaster.code} · ${shipmentDisasterLabel(disaster)}`}
        </Link>
      ) : (
        row.disasterLabel
      ),
    ],
    ["Tanggal penerimaan", shipment.receivedAt ? formatLongDate(shipment.receivedAt) : "Belum diterima"],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title={`Pengiriman ${shipment.code}`} />
        <ShipmentDetailActions shipment={row} options={options} />
      </div>

      <CardRoot>
        <h2 className="text-sm leading-6 font-medium">Informasi pengiriman</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col items-start gap-1">
              <dt className="text-xs leading-5 text-muted">{label}</dt>
              <dd className="text-sm leading-6">{value}</dd>
            </div>
          ))}
        </dl>
      </CardRoot>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Rincian barang</h2>
        <ShipmentItemsTable rows={items} status={shipment.status} />
      </section>
    </>
  );
}
