import { Skeleton } from "@heroui/react";
import { MapPin, Plus, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DisasterMapCard } from "@/components/dashboard/disaster-map";
import { DisasterTrendChart } from "@/components/dashboard/disaster-trend-chart";
import { DistributionList } from "@/components/dashboard/distribution-list";
import {
  RecentDisastersTable,
  RecentTransactionsTable,
} from "@/components/dashboard/recent-tables";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { getCashSummary } from "@/lib/data/cash";
import {
  getDashboardSummary,
  getDisasterTrend,
  getMapDisasters,
  getRecentCashTransactions,
  getRecentDisasters,
  getRecentDistributions,
} from "@/lib/data/dashboard";
import { formatNumber, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Dasbor",
};

export default function DashboardPage() {
  const summary = getDashboardSummary();
  const recentDisasters = getRecentDisasters();

  return (
    <>
      <PageHeader
        title="Dasbor"
        actions={
          <LinkButton href="/bencana">
            <Plus aria-hidden className="size-4" />
            Catat
          </LinkButton>
        }
      />

      <section
        aria-label="Ringkasan"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatCard
          label="Bencana Aktif"
          value={formatNumber(summary.activeDisasterCount)}
          icon={MapPin}
          href="/bencana"
        />
        <StatCard
          label="Penduduk Terdampak"
          value={formatNumber(summary.affectedPeople)}
          icon={Users}
          href="/bencana"
        />
        <Suspense fallback={<Skeleton className="h-[104px] rounded-3xl" />}>
          <ExpenseCard />
        </Suspense>
      </section>

      <DisasterMapCard disasters={getMapDisasters()} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DisasterTrendChart
          title="Tren Bencana 6 Bulan Terakhir"
          subtitle="Jan–Jun 2026"
          data={getDisasterTrend()}
          className="xl:h-[468px]"
        />
        <DistributionList
          entries={getRecentDistributions()}
          className="xl:h-[468px]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RecentDisastersTable
          total={recentDisasters.length}
          rows={recentDisasters.map((d) => ({
            id: d.id,
            type: d.type,
            regency: d.regency,
            status: d.status,
          }))}
        />
        <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
          <RecentTransactions />
        </Suspense>
      </div>
    </>
  );
}

async function ExpenseCard() {
  const { totalExpense } = await getCashSummary();
  return (
    <StatCard
      label="Total Pengeluaran"
      value={formatRupiah(totalExpense)}
      icon={Wallet}
      href="/anggaran"
    />
  );
}

async function RecentTransactions() {
  const transactions = await getRecentCashTransactions();
  return (
    <RecentTransactionsTable
      total={transactions.length}
      rows={transactions.map((t) => ({
        id: t.id,
        description: t.description,
        type: t.type,
        amount: formatRupiah(t.amount),
      }))}
    />
  );
}
