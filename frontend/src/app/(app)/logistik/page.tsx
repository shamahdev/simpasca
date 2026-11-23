import { Skeleton } from "@heroui/react";
import { CalendarX, Package, PackageX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { AddItemButton, AddReceiptButton, ItemTable } from "@/components/logistik/item-table";
import { listStock, LOW_STOCK_THRESHOLD } from "@/lib/data/inventory";
import { formatNumber, todayIsoDate } from "@/lib/format";
import { toItemRow } from "./item-view";

export const metadata: Metadata = {
  title: "Logistik",
};

/** Logistik (SKPL KF-04, KF-06, UC-07/UC-08, design 04). */
export default function LogistikPage() {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Logistik" />
          <Skeleton className="h-96 rounded-3xl" />
        </>
      }
    >
      <ItemList />
    </Suspense>
  );
}

async function ItemList() {
  const stock = await listStock();
  const rows = stock.map(({ item, stock }) => toItemRow(item, stock));
  const options = stock.map(({ item }) => ({ id: item.id, name: item.name, unit: item.stockUnit }));
  const today = todayIsoDate();
  const lowStock = rows.filter((r) => r.stock <= LOW_STOCK_THRESHOLD).length;
  const expired = rows.filter((r) => r.category === "PANGAN" && r.expirationDate && r.expirationDate < today).length;

  return (
    <>
      <PageHeader
        title="Logistik"
        actions={
          <>
            <AddReceiptButton items={options} />
            <AddItemButton />
          </>
        }
      />
      <section aria-label="Ringkasan logistik" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Jenis barang" value={formatNumber(rows.length)} icon={Package} />
        <StatCard
          label={`Stok kritis (≤ ${LOW_STOCK_THRESHOLD})`}
          value={`${formatNumber(lowStock)} barang`}
          icon={PackageX}
          tone={lowStock > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Pangan kedaluwarsa"
          value={`${formatNumber(expired)} barang`}
          icon={CalendarX}
          note="Tidak dapat dikirim."
        />
      </section>
      <ItemTable rows={rows} />
    </>
  );
}
