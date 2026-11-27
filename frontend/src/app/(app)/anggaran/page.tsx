import { Skeleton } from "@heroui/react";
import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AddCashTransactionButton,
  CashBookTable,
} from "@/components/anggaran/cash-book-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { getCashSummary, listCashTransactions } from "@/lib/data/cash";
import { formatRupiah } from "@/lib/format";
import {
  getCashLinkOptions,
  parseCashFilters,
  periodOptions,
  periodRange,
  toCashRow,
} from "./cash-row";

export const metadata: Metadata = {
  title: "Anggaran",
};

/** Buku Bantu Kas (SKPL KF-08, UC-12, design 05). */
export default function AnggaranPage({ searchParams }: PageProps<"/anggaran">) {
  return (
    <>
      <Suspense fallback={<PageHeader title="Anggaran" />}>
        <CashHeader />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[104px] rounded-3xl" />
            ))}
          </div>
        }
      >
        <CashSummaryCards />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <CashList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function CashHeader() {
  return <PageHeader title="Anggaran" actions={<AddCashTransactionButton options={await getCashLinkOptions()} />} />;
}

/** Totals over every transaction, independent of the list filters (finding T4). */
async function CashSummaryCards() {
  const summary = await getCashSummary();
  return (
    <section
      aria-label="Ringkasan kas"
      className="grid grid-cols-1 gap-4 md:grid-cols-3"
    >
      <StatCard
        label="Total pemasukan"
        value={formatRupiah(summary.totalIncome)}
        icon={Wallet}
      />
      <StatCard
        label="Total pengeluaran"
        value={formatRupiah(summary.totalExpense)}
        icon={Wallet}
      />
      <StatCard
        label="Saldo terkini"
        value={formatRupiah(summary.balance)}
        icon={Wallet}
        {...(summary.balance < 0 && {
          tone: "danger",
          note: "Saldo negatif, perlu pemeriksaan.",
        })}
      />
    </section>
  );
}

async function CashList({
  searchParams,
}: Pick<PageProps<"/anggaran">, "searchParams">) {
  const filters = parseCashFilters(await searchParams);
  const [result, options] = await Promise.all([
    listCashTransactions({ page: filters.page, type: filters.type, ...periodRange(filters.period) }),
    getCashLinkOptions(),
  ]);

  return (
    <CashBookTable
      rows={result.rows.map(toCashRow)}
      filters={filters}
      page={result.page}
      limit={result.limit}
      total={result.total}
      totalPages={result.totalPages}
      periodOptions={periodOptions(12, filters.period)}
      options={options}
    />
  );
}
