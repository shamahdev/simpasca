import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { GenerateReportDialogButton } from "@/components/laporan/report-buttons";
import { Pager } from "@/components/ui/pager";
import { SimpleTable } from "@/components/ui/simple-table";
import { listDisasters } from "@/lib/data/disasters";
import { listReports } from "@/lib/data/reports";
import { formatShortDateTime } from "@/lib/format";
import { disasterName } from "../bencana/disaster-view";

export const metadata: Metadata = {
  title: "Laporan",
};

/** Laporan tersimpan (UC-13, KF-10, design 07). */
export default function ReportListPage({ searchParams }: PageProps<"/laporan">) {
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Laporan" />
          <Skeleton className="h-96 rounded-3xl" />
        </>
      }
    >
      <ReportList searchParams={searchParams} />
    </Suspense>
  );
}

async function ReportList({ searchParams }: Pick<PageProps<"/laporan">, "searchParams">) {
  const page = Number((await searchParams).page) || 1;
  const [reports, disasters] = await Promise.all([listReports(page), listDisasters()]);

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Laporan per bencana tersimpan sebagai potret data saat dibuat dan tidak berubah meskipun data bencana diubah."
        actions={
          <GenerateReportDialogButton
            disasters={disasters.map((d) => ({ id: d.id, label: `${d.code} · ${disasterName(d)}` }))}
          />
        }
      />
      <SimpleTable
        label="Laporan tersimpan"
        empty="Belum ada laporan. Buat dari tombol Generate laporan atau dari halaman detail bencana."
        columns={[
          { label: "Laporan", className: "w-[120px]" },
          { label: "Bencana" },
          { label: "Dibuat oleh", className: "w-[200px]" },
          { label: "Waktu dibuat", className: "w-[180px]" },
        ]}
        rows={reports.rows.map((r) => ({
          id: r.id,
          cells: [
            <Link key="code" href={`/laporan/${r.id}`} className="text-accent hover:underline">
              {r.code}
            </Link>,
            `${r.snapshot.disaster.code} · ${disasterName(r.snapshot.disaster)}`,
            r.generatedByName,
            formatShortDateTime(r.generatedAt),
          ],
        }))}
        footer={
          <Pager
            page={reports.page}
            totalPages={reports.totalPages}
            total={reports.total}
            href={(p) => `/laporan?page=${p}`}
          />
        }
      />
    </>
  );
}
