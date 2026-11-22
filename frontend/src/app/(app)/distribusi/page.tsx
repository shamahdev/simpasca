import { PackageCheck, Truck } from "lucide-react";
import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AddShipmentButton, ShipmentTable } from "@/components/distribusi/shipment-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { listShipments } from "@/lib/data/shipments";
import { formatNumber } from "@/lib/format";
import { getShipmentFormOptions, toShipmentRow } from "./shipment-view";

export const metadata: Metadata = {
  title: "Distribusi Bantuan",
};

/** Distribusi Bantuan (SKPL KF-07, UC-09/UC-10, design 06). */
export default function ShipmentListPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Distribusi Bantuan" />
          <Skeleton className="h-96 rounded-3xl" />
        </>
      }
    >
      <ShipmentList />
    </Suspense>
  );
}

async function ShipmentList() {
  const [shipments, options] = await Promise.all([listShipments(), getShipmentFormOptions()]);
  const inTransit = shipments.filter((s) => s.status === "DIKIRIM").length;
  const rows = await Promise.all(shipments.map(toShipmentRow));

  return (
    <>
      <PageHeader title="Distribusi Bantuan" actions={<AddShipmentButton options={options} />} />
      <section aria-label="Ringkasan pengiriman" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total pengiriman" value={formatNumber(shipments.length)} icon={Truck} />
        <StatCard label="Dalam pengiriman" value={formatNumber(inTransit)} icon={Truck} />
        <StatCard
          label="Telah diterima"
          value={formatNumber(shipments.length - inTransit)}
          icon={PackageCheck}
        />
      </section>
      <ShipmentTable rows={rows} options={options} />
    </>
  );
}
