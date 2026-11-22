import { CardRoot, Skeleton } from "@heroui/react";
import { Activity, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  DisasterDetailActions,
  FulfillmentTable,
  RelatedShipmentsTable,
} from "@/components/bencana/disaster-detail";
import { StatCard } from "@/components/dashboard/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { getDisaster } from "@/lib/data/disasters";
import { PLANNING_DAYS } from "@/lib/data/inventory";
import { getFulfillment, listShipments } from "@/lib/data/shipments";
import { formatDateTime, formatNumber, formatShortDate } from "@/lib/format";
import { handlingScaleLabel, handlingStatusLabel } from "@/lib/labels";
import { disasterName, toDisasterRow } from "../disaster-view";

export const metadata: Metadata = {
  title: "Detail bencana",
};

const coordinate = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 6 });
const qty = (n: number | null, unit: string) =>
  n === null ? "—" : `${formatNumber(n)} ${unit}`;

/** Detail bencana (KF-03.2, design 03B). */
export default function DisasterDetailPage({ params }: PageProps<"/bencana/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
      <DisasterDetail params={params} />
    </Suspense>
  );
}

async function DisasterDetail({ params }: Pick<PageProps<"/bencana/[id]">, "params">) {
  const { id } = await params;
  const disaster = await getDisaster(id);
  if (!disaster) notFound();

  const [fulfillmentRows, shipments] = await Promise.all([getFulfillment(disaster), listShipments()]);
  const fulfillment = fulfillmentRows.map(({ item, recommended, shipped, remaining, stock, status }) => ({
    id: item.id,
    basis:
      recommended === null
        ? `${item.name} · tanpa rasio`
        : `${item.name} · ${formatNumber(disaster.affectedPeople)} × ${formatNumber(item.needRatio!)}${item.needType === "HARIAN" ? ` × ${PLANNING_DAYS}` : ""}`,
    recommended: qty(recommended, item.stockUnit),
    shipped: qty(shipped, item.stockUnit),
    remaining: qty(remaining, item.stockUnit),
    stock: qty(stock, item.stockUnit),
    status,
  }));
  const related = shipments
    .filter((s) => s.disasterId === disaster.id)
    .map((s) => ({
      id: s.id,
      code: s.code,
      shippedAt: formatShortDate(s.shippedAt),
      destination: s.destination,
      status: s.status,
    }));

  const fields = [
    ["Jenis bencana", disaster.disasterType],
    ["Waktu kejadian", formatDateTime(disaster.occurredAt, ", ")],
    ["Provinsi", disaster.province],
    ["Kabupaten/Kota", disaster.regencyCity.replace(/^Kab\./, "Kabupaten")],
    [
      "Lintang / bujur",
      disaster.latitude === null || disaster.longitude === null
        ? "Tidak diisi (peta memakai titik tengah wilayah)"
        : `${coordinate.format(disaster.latitude)} / ${coordinate.format(disaster.longitude)}`,
    ],
    ["Lokasi tambahan", disaster.locationDetails || "—"],
    ["Skala penanganan", handlingScaleLabel[disaster.handlingScale]],
    ["Kode", disaster.code],
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <PageHeader title={disasterName(disaster)} />
        <DisasterDetailActions disaster={toDisasterRow(disaster)} />
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Penduduk terdampak" value={`${formatNumber(disaster.affectedPeople)} jiwa`} icon={Users} />
        <StatCard
          label="Kepala keluarga"
          value={disaster.affectedHouseholds === null ? "—" : `${formatNumber(disaster.affectedHouseholds)} KK`}
          icon={Users}
        />
        <StatCard label="Status penanganan" value={handlingStatusLabel[disaster.status]} icon={Activity} />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <CardRoot>
          <h2 className="text-sm leading-6 font-medium">Informasi kejadian</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs leading-5 text-muted">{label}</dt>
                <dd className="text-sm leading-6 wrap-break-word">{value}</dd>
              </div>
            ))}
          </dl>
        </CardRoot>
        <CardRoot>
          <h2 className="text-sm leading-6 font-medium">Kronologi dan dampak</h2>
          <p className="text-sm leading-6 whitespace-pre-line text-muted">
            {disaster.impactNotes || "Belum ada catatan dampak."}
          </p>
        </CardRoot>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Rekomendasi & pemenuhan</h2>
        <FulfillmentTable rows={fulfillment} />
        <p className="text-xs text-muted">
          Rekomendasi bersifat pertimbangan: pangan dihitung untuk {PLANNING_DAYS} hari, barang lain
          satu kali, lalu dibulatkan ke atas.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Pengiriman terkait</h2>
        <RelatedShipmentsTable rows={related} />
      </section>
    </>
  );
}
