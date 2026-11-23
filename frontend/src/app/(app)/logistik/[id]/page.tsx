import { CardRoot, Skeleton } from "@heroui/react";
import { Package, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { ItemDetailActions, MovementTable, ReceiptTable } from "@/components/logistik/item-detail";
import { StockFlags } from "@/components/logistik/item-table";
import { listDisasters } from "@/lib/data/disasters";
import { getInventoryItem, listInventoryItems, listItemMovements } from "@/lib/data/inventory";
import { listReceipts } from "@/lib/data/receipts";
import { formatLongDate, formatNumber, formatShortDate } from "@/lib/format";
import { movementTypeLabel, needTypeLabel } from "@/lib/labels";
import { disasterName } from "../../bencana/disaster-view";
import { ratioText, toItemRow } from "../item-view";

export const metadata: Metadata = {
  title: "Detail barang",
};

/** Detail barang: data, penerimaan and stock ledger (design 04B, UC-07/08/11). */
export default function ItemDetailPage({ params }: PageProps<"/logistik/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: Pick<PageProps<"/logistik/[id]">, "params">) {
  const { id } = await params;
  const item = await getInventoryItem(id);
  if (!item) notFound();

  const [movements, receipts, items, disasters] = await Promise.all([
    listItemMovements(id),
    listReceipts(id),
    listInventoryItems(),
    listDisasters(),
  ]);
  const stock = movements.at(-1)?.balance ?? 0;
  const row = toItemRow(item, stock);
  const qty = (n: number) => `${formatNumber(n)} ${item.stockUnit}`;
  const disasterById = new Map(disasters.map((d) => [d.id, d]));

  const fields: [string, React.ReactNode][] = [
    ["Kategori", row.categoryText],
    ["Satuan stok", item.stockUnit],
    ["Rasio kebutuhan", ratioText(item)],
    ["Jenis kebutuhan", item.needType ? needTypeLabel[item.needType] : "—"],
    ["Dasar rasio", item.ratioBasis || "—"],
    [
      "Tanggal kedaluwarsa",
      item.category === "PANGAN" ? (item.expirationDate ? formatLongDate(item.expirationDate) : "Tidak diisi") : "Bukan pangan",
    ],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <PageHeader title={item.name} />
          <StockFlags row={row} />
        </div>
        <ItemDetailActions item={row} items={items.map((i) => ({ id: i.id, name: i.name, unit: i.stockUnit }))} />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Stok terkini" value={qty(stock)} icon={Package} tone={stock <= 10 ? "danger" : "default"} />
        <StatCard label="Stok awal" value={qty(item.initialStock)} icon={Package} />
        <StatCard
          label="Total diterima"
          value={qty(receipts.reduce((sum, r) => sum + r.quantity, 0))}
          icon={PackageCheck}
          note={`${formatNumber(receipts.length)} kali penerimaan`}
        />
      </section>

      <CardRoot>
        <h2 className="text-sm leading-6 font-medium">Informasi barang</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-xs leading-5 text-muted">{label}</dt>
              <dd className="text-sm leading-6">{value}</dd>
            </div>
          ))}
        </dl>
      </CardRoot>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Penerimaan barang</h2>
        <ReceiptTable
          items={items.map((i) => ({ id: i.id, name: i.name, unit: i.stockUnit }))}
          rows={receipts.map((r) => ({ ...r, dateText: formatShortDate(r.receiptDate), quantityText: qty(r.quantity) }))}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Riwayat pergerakan stok</h2>
        <MovementTable
          rows={movements.toReversed().map((m) => {
            const disaster = m.disasterId ? disasterById.get(m.disasterId) : undefined;
            return {
              id: m.id,
              dateText: formatShortDate(m.movementDate),
              typeText: movementTypeLabel[m.movementType] ?? m.movementType,
              inText: m.quantityIn ? formatNumber(m.quantityIn) : "—",
              outText: m.quantityOut ? formatNumber(m.quantityOut) : "—",
              balanceText: formatNumber(m.balance),
              note: m.notes,
              disaster: disaster && { href: `/bencana/${disaster.id}`, label: disasterName(disaster) },
            };
          })}
        />
        <p className="text-xs text-muted">
          Stok terkini = jumlah masuk − jumlah keluar dari seluruh riwayat. Riwayat tidak dapat diubah atau dihapus.
        </p>
      </section>
    </>
  );
}
