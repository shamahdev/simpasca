import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  AlertTitle,
  Button,
  CloseButton,
  Skeleton,
} from "@heroui/react";
import { ArrowUpRight, MapPin, Plus, Trash2, Users, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { DisasterMapCard } from "@/components/dashboard/disaster-map";
import { DisasterTrendChart } from "@/components/dashboard/disaster-trend-chart";
import { DistributionList } from "@/components/dashboard/distribution-list";
import {
  RecentDisastersTable,
  RecentTransactionsTable,
} from "@/components/dashboard/recent-tables";
import { ScaleLegend } from "@/components/dashboard/scale-legend";
import { StatCard } from "@/components/dashboard/stat-card";
import { AppSidebar, SidebarAccount } from "@/components/layout/app-sidebar";
import { NavItem } from "@/components/layout/nav-item";
import { PageHeader } from "@/components/layout/page-header";
import { LinkButton } from "@/components/ui/link-button";
import {
  CashTypeChip,
  FulfillmentChip,
  HandlingScaleChip,
  HandlingStatusChip,
  ShipmentStatusChip,
} from "@/components/ui/status-chips";
import {
  getDisasterTrend,
  getMapDisasters,
  getRecentDistributions,
} from "@/lib/data/dashboard";

export const metadata: Metadata = {
  title: "Katalog Komponen",
};

function Specimen({
  title,
  source,
  children,
}: {
  title: string;
  /** File that implements the component. */
  source: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <code className="font-mono text-xs text-muted">{source}</code>
      </div>
      <div className="rounded-3xl border border-dashed border-border-secondary p-6">
        {children}
      </div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-muted">{label}</span>
      {children}
    </div>
  );
}

const colorTokens = [
  ["background", "bg-background"],
  ["surface", "bg-surface"],
  ["surface-secondary", "bg-surface-secondary"],
  ["default", "bg-default"],
  ["accent", "bg-accent"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["foreground", "bg-foreground"],
  ["muted", "bg-muted"],
  ["scale-national", "bg-scale-national"],
] as const;

const typeScale = [
  ["Halaman / metrik", "text-2xl font-semibold", "24/32 · semibold"],
  ["Judul seksi", "text-base font-semibold", "16/24 · semibold"],
  ["Judul kartu", "text-sm leading-6 font-medium", "14/24 · medium"],
  ["Isi / navigasi", "text-sm leading-6", "14/24 · normal"],
  ["Keterangan", "text-xs leading-5 text-muted", "12/20 · normal"],
] as const;

const buttonVariants = [
  "primary",
  "secondary",
  "tertiary",
  "outline",
  "ghost",
  "danger",
  "danger-soft",
] as const;

export default function ComponentCatalogPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
      <PageHeader
        title="Katalog Komponen"
        description="Komponen SIMPASCA berbasis HeroUI v3 dan desain simpasca.pen."
        actions={
          <LinkButton href="/" variant="outline">
            Ke Dasbor
          </LinkButton>
        }
      />

      <AlertRoot status="warning">
        <AlertIndicator />
        <AlertContent>
          <AlertTitle>Halaman pengembangan</AlertTitle>
          <AlertDescription>
            Halaman ini hanya untuk pengembang dan tidak termasuk navigasi
            aplikasi. Data yang tampil adalah data contoh.
          </AlertDescription>
        </AlertContent>
      </AlertRoot>

      <Specimen title="Warna" source="src/app/globals.css · @heroui/styles">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {colorTokens.map(([name, className]) => (
            <div key={name} className="flex flex-col gap-2">
              <div
                className={`h-14 rounded-xl border border-separator ${className}`}
              />
              <span className="font-mono text-xs text-muted">{name}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Tipografi" source="Tailwind · font Inter">
        <div className="flex flex-col gap-3">
          {typeScale.map(([role, className, spec]) => (
            <div key={role} className="flex items-baseline gap-4">
              <span className="w-32 shrink-0 font-mono text-xs text-muted">
                {spec}
              </span>
              <span className={className}>{role}</span>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Tombol" source="@heroui/react Button · ui/link-button.tsx">
        <div className="flex flex-col gap-4">
          {(["sm", "md", "lg"] as const).map((size) => (
            <Row key={size} label={`size="${size}"`}>
              {buttonVariants.map((variant) => (
                <Button key={variant} variant={variant} size={size}>
                  {variant}
                </Button>
              ))}
            </Row>
          ))}
          <Row label="Ikon">
            <Button>
              <Plus aria-hidden className="size-4" />
              Catat
            </Button>
            <Button variant="danger-soft" isIconOnly aria-label="Hapus">
              <Trash2 aria-hidden className="size-4" />
            </Button>
            <CloseButton aria-label="Tutup" />
          </Row>
          <Row label="LinkButton">
            <LinkButton href="/" size="sm">
              <ArrowUpRight aria-hidden className="size-3.5" />
              Lihat detail bencana
            </LinkButton>
            <LinkButton
              href="/"
              variant="ghost"
              size="sm"
              className="text-accent-soft-foreground"
            >
              <ArrowUpRight aria-hidden className="size-3.5" />
              Lihat semua
            </LinkButton>
          </Row>
        </div>
      </Specimen>

      <Specimen title="Chip status" source="ui/status-chips.tsx">
        <div className="flex flex-col gap-4">
          <Row label="Penanganan">
            <HandlingStatusChip status="AKTIF" />
            <HandlingStatusChip status="SELESAI" />
          </Row>
          <Row label="Skala">
            <HandlingScaleChip scale="KABUPATEN_KOTA" />
            <HandlingScaleChip scale="PROVINSI" />
            <HandlingScaleChip scale="NASIONAL" />
          </Row>
          <Row label="Pengiriman">
            <ShipmentStatusChip status="DIKIRIM" />
            <ShipmentStatusChip status="DITERIMA" />
          </Row>
          <Row label="Kas">
            <CashTypeChip type="MASUK" />
            <CashTypeChip type="KELUAR" />
          </Row>
          <Row label="Pemenuhan">
            <FulfillmentChip status="TERPENUHI" />
            <FulfillmentChip status="KURANG" />
            <FulfillmentChip status="TANPA_RASIO" />
          </Row>
          <Row label="Legenda">
            <ScaleLegend />
          </Row>
        </div>
      </Specimen>

      <Specimen
        title="Navigasi"
        source="layout/app-sidebar.tsx · layout/nav-item.tsx"
      >
        <div className="flex gap-6">
          <AppSidebar className="h-[560px] rounded-2xl border" account={<SidebarAccount name="Shaddam Amru" />} />
          <div className="flex w-60 flex-col gap-1">
            <span className="text-xs text-muted">NavItem</span>
            <NavItem href="#" label="Default" icon={MapPin} />
            <NavItem href="#" label="Aktif" icon={MapPin} isActive />
          </div>
        </div>
      </Specimen>

      <Specimen title="Kartu ringkasan" source="dashboard/stat-card.tsx">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Bencana Aktif" value="5" icon={MapPin} href="#" />
          <StatCard
            label="Penduduk Terdampak"
            value="1.850"
            icon={Users}
            href="#"
          />
          <StatCard
            label="Total Pengeluaran"
            value="Rp47.500.000"
            icon={Wallet}
            href="#"
          />
        </div>
      </Specimen>

      <Specimen title="Peta sebaran bencana" source="dashboard/disaster-map.tsx">
        <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
          <LiveMap />
        </Suspense>
      </Specimen>

      <Specimen
        title="Grafik dan daftar distribusi"
        source="dashboard/disaster-trend-chart.tsx · dashboard/distribution-list.tsx"
      >
        <Suspense fallback={<Skeleton className="h-[468px] rounded-3xl" />}>
          <LiveCharts />
        </Suspense>
      </Specimen>

      <Specimen title="Tabel" source="dashboard/recent-tables.tsx">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecentDisastersTable
            total={2}
            rows={[
              { id: "1", type: "Banjir", regency: "Kab. Bandung", status: "AKTIF" },
              {
                id: "2",
                type: "Gempa bumi",
                regency: "Kab. Cianjur",
                status: "SELESAI",
              },
            ]}
          />
          <RecentTransactionsTable total={0} rows={[]} />
        </div>
      </Specimen>
    </main>
  );
}

/** Live API data (needs a session), so these specimens stream in. */
async function LiveMap() {
  return <DisasterMapCard disasters={await getMapDisasters()} />;
}

async function LiveCharts() {
  const [trend, distributions] = await Promise.all([getDisasterTrend(), getRecentDistributions(3)]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DisasterTrendChart
        title="Tren Bencana 6 Bulan Terakhir"
        subtitle={trend.label}
        data={trend.points}
        className="h-[468px]"
      />
      <DistributionList entries={distributions} className="h-[468px]" />
    </div>
  );
}
