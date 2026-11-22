import { Skeleton } from "@heroui/react";
import { Activity, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AddDisasterButton, DisasterTable } from "@/components/bencana/disaster-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { listDisasters } from "@/lib/data/disasters";
import { formatNumber } from "@/lib/format";
import { toDisasterRow } from "./disaster-view";

export const metadata: Metadata = {
  title: "Data Bencana",
};

/** Data Bencana (SKPL KF-03, UC-05, design 03). */
export default function DisasterListPage() {
  return (
    <>
      <PageHeader title="Data Bencana" actions={<AddDisasterButton />} />
      <Suspense fallback={<Skeleton className="h-[104px] rounded-3xl" />}>
        <Summary />
      </Suspense>
      {/* The table reads ?status= from the URL, so it streams after the static shell. */}
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <Table />
      </Suspense>
    </>
  );
}

async function Table() {
  return <DisasterTable rows={(await listDisasters()).map(toDisasterRow)} />;
}

async function Summary() {
  const summary = await getDashboardSummary();
  return (
      <section aria-label="Ringkasan bencana" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Total kejadian" value={formatNumber(summary.disasterCount)} icon={MapPin} />
        <StatCard
          label="Penanganan aktif"
          value={formatNumber(summary.activeDisasterCount)}
          icon={Activity}
        />
        <StatCard
          label="Penduduk terdampak"
          value={formatNumber(summary.affectedPeople)}
          icon={Users}
        />
      </section>
  );
}
