import { CardRoot, Skeleton } from "@heroui/react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportActions } from "@/components/laporan/report-buttons";
import { getReport, reportText } from "@/lib/data/reports";
import { formatDateTime, formatLongDate, formatNumber } from "@/lib/format";
import {
  fulfillmentLabel,
  handlingScaleLabel,
  handlingStatusLabel,
  itemCategoryLabel,
  shipmentStatusLabel,
} from "@/lib/labels";
import { disasterName } from "../../bencana/disaster-view";

export const metadata: Metadata = {
  title: "Laporan bencana",
};

/** A saved report, rendered only from its snapshot (AB-05.2, AC-33). */
export default function ReportPage({ params }: PageProps<"/laporan/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <Report params={params} />
    </Suspense>
  );
}

const coordinate = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 });

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex break-inside-avoid flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Plain HTML table: prints cleanly and needs no client code. */
function ReportTable({ head, rows, empty }: { head: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-separator">
      <table className="w-full text-sm">
        <thead className="bg-surface-secondary text-left text-xs text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-3 py-3 text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-t border-separator">
                {cells.map((c, j) => (
                  <td key={j} className="px-3 py-2 align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

async function Report({ params }: Pick<PageProps<"/laporan/[id]">, "params">) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  const s = report.snapshot;
  const d = s.disaster;
  const qty = (n: number | null, unit: string) => (n === null ? "—" : `${formatNumber(n)} ${unit}`);

  const identity: [string, string][] = [
    ["Jenis bencana", d.disasterType],
    ["Wilayah", `${d.regencyCity}, ${d.province}`],
    ["Lokasi tambahan", d.locationDetails || "—"],
    [
      "Koordinat",
      d.latitude === null || d.longitude === null
        ? "Tidak diisi"
        : `${coordinate.format(d.latitude)}, ${coordinate.format(d.longitude)}`,
    ],
    ["Skala penanganan", handlingScaleLabel[d.handlingScale]],
    ["Status penanganan", handlingStatusLabel[d.status]],
    ["Waktu kejadian", formatDateTime(d.occurredAt, ", ")],
    ["Penduduk terdampak", `${formatNumber(d.affectedPeople)} jiwa`],
    ["Kepala keluarga terdampak", d.affectedHouseholds === null ? "—" : `${formatNumber(d.affectedHouseholds)} KK`],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader
          title={`Laporan ${d.code} · ${disasterName(d)}`}
          description={`${report.code} · dibuat oleh ${s.generatedByName}, ${formatDateTime(s.generatedAt, ", ")}. Isi laporan adalah potret data saat dibuat.`}
        />
        <ReportActions text={reportText(s)} />
      </div>

      <CardRoot className="break-inside-avoid">
        <h2 className="text-sm leading-6 font-medium">Identitas kejadian dan korban terdampak</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {identity.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-xs leading-5 text-muted">{label}</dt>
              <dd className="text-sm leading-6">{value}</dd>
            </div>
          ))}
        </dl>
      </CardRoot>

      <Section title="Kronologi dan dampak">
        <p className="text-sm leading-6 whitespace-pre-line">{d.impactNotes || "Tidak ada catatan."}</p>
      </Section>

      <Section title="Rekap kebutuhan dan pemenuhan">
        <ReportTable
          head={["Barang", "Rekomendasi", "Telah dikirim", "Sisa kebutuhan", "Pemenuhan"]}
          empty="Tidak ada barang dengan rasio kebutuhan."
          rows={s.needs.map((n) => [
            n.name,
            qty(n.recommended, n.unit),
            qty(n.shipped, n.unit),
            qty(n.remaining, n.unit),
            fulfillmentLabel[n.status],
          ])}
        />
      </Section>

      <Section title="Rekap distribusi per barang">
        <ReportTable
          head={["Pengiriman", "Barang", "Jumlah keluar", "Tgl. kirim", "Tgl. terima", "Status", "Tujuan", "Penanggung jawab"]}
          empty="Belum ada pengiriman untuk bencana ini (jumlah keluar 0)."
          rows={s.distributions.map((x) => [
            x.shipmentCode,
            x.itemName,
            qty(x.quantity, x.unit),
            formatLongDate(x.shippedAt),
            x.receivedAt ? formatLongDate(x.receivedAt) : "—",
            shipmentStatusLabel[x.status],
            x.destination,
            x.personInCharge,
          ])}
        />
      </Section>

      <Section title="Jumlah keluar per kategori">
        <ReportTable
          head={["Kategori", "Jumlah keluar"]}
          empty="0 — belum ada barang keluar."
          rows={s.categoryTotals.map((c) => [itemCategoryLabel[c.category], qty(c.quantity, c.unit)])}
        />
      </Section>
    </>
  );
}
