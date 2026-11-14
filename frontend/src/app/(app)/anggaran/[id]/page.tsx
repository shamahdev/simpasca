import { CardRoot, Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CashDetailActions,
  CashTrailTable,
  type TrailRow,
} from "@/components/anggaran/cash-detail-actions";
import { PageHeader } from "@/components/layout/page-header";
import { CashTypeChip } from "@/components/ui/status-chips";
import { getUserName } from "@/lib/auth";
import { getCashTransaction } from "@/lib/data/cash";
import {
  formatDateTime,
  formatLongDate,
  formatRupiah,
  formatShortDateTime,
} from "@/lib/format";
import { cashTypeNoun } from "@/lib/labels";
import type { CashTransaction } from "@/lib/types";
import { toCashRow } from "../cash-row";

export const metadata: Metadata = {
  title: "Detail transaksi kas",
};

const summaryOf = (t: CashTransaction) =>
  `${cashTypeNoun[t.type].replace(/^./, (c) => c.toUpperCase())} ${formatRupiah(t.amount)}`;

// shortcut: the API has no audit_logs endpoint yet, so the trail shows creation and the last edit time only; list UBAH/HAPUS entries (KF-09) once it does.
function trailOf(t: CashTransaction): TrailRow[] {
  const rows: TrailRow[] = [
    {
      key: "created",
      time: formatShortDateTime(t.createdAt),
      user: getUserName(t.createdBy),
      action: "Dibuat",
      note: summaryOf(t),
    },
  ];
  if (t.updatedAt !== t.createdAt) {
    rows.push({
      key: "updated",
      time: formatShortDateTime(t.updatedAt),
      user: "–",
      action: "Diubah",
      note: "Perubahan terakhir",
    });
  }
  return rows;
}

/** Detail transaksi kas (design 05B). */
export default function CashDetailPage({
  params,
}: PageProps<"/anggaran/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Detail transaksi kas" />
          <Skeleton className="h-48 rounded-3xl" />
        </>
      }
    >
      <CashDetail params={params} />
    </Suspense>
  );
}

async function CashDetail({
  params,
}: Pick<PageProps<"/anggaran/[id]">, "params">) {
  const { id } = await params;
  const transaction = await getCashTransaction(id);
  if (!transaction) notFound();

  const fields = [
    ["Tanggal transaksi", formatLongDate(transaction.transactionDate)],
    ["Petugas pencatat", getUserName(transaction.createdBy)],
    ["Keterangan", transaction.description || "–"],
    ["Waktu pencatatan", formatDateTime(transaction.createdAt, ", ")],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title="Detail transaksi kas" />
        <CashDetailActions transaction={toCashRow(transaction)} />
      </div>

      <CardRoot>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{summaryOf(transaction)}</h2>
          <CashTypeChip type={transaction.type} />
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-xs leading-5 text-muted">{label}</dt>
              <dd className="text-sm leading-6 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </CardRoot>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Jejak pencatatan</h2>
        <CashTrailTable rows={trailOf(transaction)} />
      </section>
    </>
  );
}
