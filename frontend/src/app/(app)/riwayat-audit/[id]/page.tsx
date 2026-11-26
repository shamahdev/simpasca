import { CardRoot, Skeleton } from "@heroui/react";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import { SimpleTable } from "@/components/ui/simple-table";
import { getUserName } from "@/lib/auth";
import { auditChanges, getAuditEntry } from "@/lib/data/audit";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, auditEntityLabel } from "@/lib/labels";
import { auditHref, auditSubject } from "../audit-view";

export const metadata: Metadata = {
  title: "Detail audit",
};

/** One audit entry with its before/after values (AC-17). */
export default function AuditDetailPage({ params }: PageProps<"/riwayat-audit/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <AuditDetail params={params} />
    </Suspense>
  );
}

async function AuditDetail({ params }: Pick<PageProps<"/riwayat-audit/[id]">, "params">) {
  const { id } = await params;
  const entry = await getAuditEntry(id);
  if (!entry) notFound();
  const target = auditHref(entry);
  const changes = auditChanges(entry.before_data, entry.after_data);

  const fields: [string, React.ReactNode][] = [
    ["Waktu", formatDateTime(entry.occurred_at, ", ")],
    ["Petugas", await getUserName(entry.user_id)],
    ["Tindakan", auditActionLabel[entry.action] ?? entry.action],
    ["Data", `${auditEntityLabel[entry.entity_type] ?? entry.entity_type} #${entry.entity_id}`],
    [
      "Rincian",
      target ? (
        <Link key="t" href={target} className="text-accent hover:underline">
          {auditSubject(entry)}
        </Link>
      ) : (
        auditSubject(entry)
      ),
    ],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title={`Audit #${entry.id}`} />
        <LinkButton href="/riwayat-audit" variant="outline" className="self-start">
          <ArrowLeft aria-hidden className="size-4" />
          Kembali
        </LinkButton>
      </div>
      <CardRoot>
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
        <h2 className="text-base font-semibold">
          {entry.action === "UBAH" ? "Nilai yang berubah" : "Isi data"}
        </h2>
        <SimpleTable
          label="Nilai sebelum dan sesudah"
          empty="Tidak ada nilai yang berubah."
          columns={[{ label: "Kolom", className: "w-[200px]" }, { label: "Sebelum" }, { label: "Sesudah" }]}
          rows={changes.map((c) => ({
            id: c.field,
            cells: [c.field, <span key="b" className="break-all">{c.before}</span>, <span key="a" className="break-all">{c.after}</span>],
          }))}
        />
      </section>
    </>
  );
}
