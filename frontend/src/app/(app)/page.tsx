import { Skeleton } from "@heroui/react";
import { MapPin, PackageX, Plus, Users, Wallet } from "lucide-react";
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
import { EditorOnly } from "@/components/ui/editor-only";
import { LinkButton } from "@/components/ui/link-button";
import { getCashSummary } from "@/lib/data/cash";
import {
  getDashboardSummary,
  getDisasterTrend,
  getLowStockItems,
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
  return (
    <>
      <PageHeader
        title="Dasbor"
        actions={
          <EditorOnly>
            <LinkButton href="/bencana">
              <Plus aria-hidden className="size-4" />
              Catat
            </LinkButton>
          </EditorOnly>
        }
      />

      <section
        aria-label="Ringkasan"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <Suspense fallback={<CardSkeletons count={2} />}>
          <DisasterCards />
        </Suspense>
        <Suspense fallback={<CardSkeletons count={1} />}>
          <ExpenseCard />
        </Suspense>
        <Suspense fallback={<CardSkeletons count={1} />}>
          <LowStockCard />
        </Suspense>
      </section>

      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <MapSection />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-[468px] rounded-3xl" />}>
          <TrendSection />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[468px] rounded-3xl" />}>
          <DistributionSection />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
          <RecentDisasters />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-80 rounded-3xl" />}>
          <RecentTransactions />
        </Suspense>
      </div>
    </>
  );
}

function CardSkeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <Skeleton key={i} className="h-[104px] rounded-3xl" />
  ));
}

async function DisasterCards() {
  const summary = await getDashboardSummary();
  return (
    <>
      <StatCard
        label="Bencana Aktif"
        value={formatNumber(summary.activeDisasterCount)}
        icon={MapPin}
        href="/bencana?status=AKTIF"
      />
      <StatCard
        label="Penduduk Terdampak"
        value={formatNumber(summary.affectedPeople)}
        icon={Users}
        href="/bencana"
      />
    </>
  );
}

async function LowStockCard() {
  const lowStock = await getLowStockItems();
  return (
    <StatCard
      label="Stok Kritis (≤ 10)"
      value={`${formatNumber(lowStock.length)} barang`}
      icon={PackageX}
      href="/logistik"
      tone={lowStock.length > 0 ? "danger" : "default"}
      note={
        lowStock.length > 0
          ? lowStock
              .map(({ item, stock }) => `${item.name} ${formatNumber(stock)} ${item.stockUnit}`)
              .join(", ")
          : "Semua stok di atas ambang."
      }
    />
  );
}

async function MapSection() {
  return <DisasterMapCard disasters={await getMapDisasters()} />;
}

async function TrendSection() {
  const trend = await getDisasterTrend();
  return (
    <DisasterTrendChart
      title="Tren Bencana 6 Bulan Terakhir"
      subtitle={trend.label}
      data={trend.points}
      className="xl:h-[468px]"
    />
  );
}

async function DistributionSection() {
  return <DistributionList entries={await getRecentDistributions()} className="xl:h-[468px]" />;
}

async function RecentDisasters() {
  const recentDisasters = await getRecentDisasters();
  return (
    <RecentDisastersTable
      total={recentDisasters.length}
      rows={recentDisasters.map((d) => ({
        id: d.id,
        type: d.disasterType,
        regency: d.regencyCity,
        status: d.status,
      }))}
    />
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
