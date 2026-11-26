"use client";

import { Button, Table } from "@heroui/react";
import { ArrowLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { FulfillmentChip, ShipmentStatusChip } from "@/components/ui/status-chips";
import type { FulfillmentStatus } from "@/lib/data/shipments";
import type { ShipmentStatus } from "@/lib/types";
import { DisasterDialog } from "./disaster-dialog";
import { DeleteDisasterDialog, type DisasterRow } from "./disaster-table";
import { useCanEdit } from "@/components/ui/editor-only";
import { GenerateReportButton } from "@/components/laporan/report-buttons";

/** Kembali / Ubah data / Hapus (design 03B). */
export function DisasterDetailActions({ disaster }: { disaster: DisasterRow }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/bencana" variant="outline">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali
      </LinkButton>
      <GenerateReportButton disasterId={disaster.id} />
      {canEdit && (
        <>
          <Button variant="outline" onPress={() => setOpenDialog("edit")}>
            <Pencil aria-hidden className="size-4" />
            Ubah data
          </Button>
          <Button variant="danger-soft" onPress={() => setOpenDialog("delete")}>
            <Trash2 aria-hidden className="size-4" />
            Hapus
          </Button>
        </>
      )}

      <DisasterDialog
        disaster={disaster}
        isOpen={openDialog === "edit"}
        onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
      />
      <DeleteDisasterDialog
        disaster={disaster}
        isOpen={openDialog === "delete"}
        onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
        onDeleted={() => router.push("/bencana")}
      />
    </div>
  );
}

export interface FulfillmentRowView {
  id: string;
  /** "Beras · 250 × 0,5 × 30" */
  basis: string;
  recommended: string;
  shipped: string;
  remaining: string;
  stock: string;
  status: FulfillmentStatus;
}

/** Rekomendasi & pemenuhan (KF-05, AC-11). */
export function FulfillmentTable({ rows }: { rows: FulfillmentRowView[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Rekomendasi dan pemenuhan">
          <Table.Header>
            <Table.Column isRowHeader>Barang / dasar</Table.Column>
            <Table.Column className="text-right">Rekomendasi</Table.Column>
            <Table.Column className="text-right">Dikirim</Table.Column>
            <Table.Column className="text-right">Sisa</Table.Column>
            <Table.Column className="text-right">Stok gudang</Table.Column>
            <Table.Column className="w-[120px]">Pemenuhan</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "Belum ada barang dengan rasio kebutuhan."}>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                <Table.Cell>{row.basis}</Table.Cell>
                <Table.Cell className="text-right">{row.recommended}</Table.Cell>
                <Table.Cell className="text-right">{row.shipped}</Table.Cell>
                <Table.Cell className="text-right">{row.remaining}</Table.Cell>
                <Table.Cell className="text-right">{row.stock}</Table.Cell>
                <Table.Cell>
                  <FulfillmentChip status={row.status} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export interface RelatedShipmentRow {
  id: string;
  code: string;
  shippedAt: string;
  destination: string;
  status: ShipmentStatus;
}

/** Pengiriman terkait (KF-03.2). */
export function RelatedShipmentsTable({ rows }: { rows: RelatedShipmentRow[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Pengiriman terkait">
          <Table.Header>
            <Table.Column isRowHeader>Pengiriman</Table.Column>
            <Table.Column>Tanggal kirim</Table.Column>
            <Table.Column>Tujuan</Table.Column>
            <Table.Column className="w-[100px]">Status</Table.Column>
            <Table.Column className="w-16">Aksi</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "Belum ada pengiriman untuk bencana ini."}>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                <Table.Cell>{row.code}</Table.Cell>
                <Table.Cell>{row.shippedAt}</Table.Cell>
                <Table.Cell>{row.destination}</Table.Cell>
                <Table.Cell>
                  <ShipmentStatusChip status={row.status} />
                </Table.Cell>
                <Table.Cell>
                  <LinkButton
                    href={`/distribusi/${row.id}`}
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={`Buka rincian ${row.code}`}
                  >
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </LinkButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
