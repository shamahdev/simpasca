import { Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AuditFilters } from "@/components/riwayat-audit/audit-filters";
import { Pager } from "@/components/ui/pager";
import { SimpleTable } from "@/components/ui/simple-table";
import { getUserName } from "@/lib/auth";
import { listAuditPage } from "@/lib/data/audit";
import { formatShortDateTime } from "@/lib/format";
import { auditActionLabel, auditEntityLabel } from "@/lib/labels";
import { auditHref, auditSubject } from "./audit-view";

export const metadata: Metadata = {
  title: "Riwayat Audit",
};

/** Riwayat perubahan, penghapusan dan pembuatan laporan (UC-14, KF-09). */
export default function AuditPage({ searchParams }: PageProps<"/riwayat-audit">) {
  return (
    <>
      <PageHeader
        title="Riwayat Audit"
        description="Setiap perubahan, penghapusan, dan pembuatan laporan tercatat permanen beserta petugas, waktu, dan nilai sebelum serta sesudahnya."
      />
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <AuditList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

async function AuditList({ searchParams }: Pick<PageProps<"/riwayat-audit">, "searchParams">) {
  const query = await searchParams;
  const action = one(query.action);
  const entityType = one(query.entity);
  const page = Number(one(query.page)) || 1;
  const result = await listAuditPage(page, { action, entityType });
  const names = new Map(
    await Promise.all(
      [...new Set(result.rows.map((e) => e.user_id))].map(async (id) => [id, await getUserName(id)] as const),
    ),
  );
  const href = (p: number) => {
    const params = new URLSearchParams({ ...(action && { action }), ...(entityType && { entity: entityType }), page: String(p) });
    return `/riwayat-audit?${params}`;
  };

  return (
    <>
      <AuditFilters action={action} entityType={entityType} />
      <SimpleTable
        label="Riwayat audit"
        empty="Belum ada catatan audit yang cocok."
        columns={[
          { label: "Waktu", className: "w-[160px]" },
          { label: "Petugas", className: "w-[180px]" },
          { label: "Tindakan", className: "w-[150px]" },
          { label: "Data", className: "w-[170px]" },
          { label: "Rincian" },
          { label: "", className: "w-20" },
        ]}
        rows={result.rows.map((e) => {
          const target = auditHref(e);
          return {
            id: String(e.id),
            cells: [
              formatShortDateTime(e.occurred_at),
              names.get(e.user_id) ?? `Pengguna #${e.user_id}`,
              auditActionLabel[e.action] ?? e.action,
              auditEntityLabel[e.entity_type] ?? e.entity_type,
              target ? (
                <Link key="t" href={target} className="text-accent hover:underline">
                  {auditSubject(e)}
                </Link>
              ) : (
                auditSubject(e)
              ),
              <Link key="d" href={`/riwayat-audit/${e.id}`} className="text-accent hover:underline">
                Lihat
              </Link>,
            ],
          };
        })}
        footer={<Pager page={result.page} totalPages={result.totalPages} total={result.total} href={href} />}
      />
    </>
  );
}
