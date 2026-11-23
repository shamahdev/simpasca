"use client";

import { Button, Table } from "@heroui/react";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { ShipmentStatusChip } from "@/components/ui/status-chips";
import type { ShipmentStatus } from "@/lib/types";
import { ShipmentDialog, type ShipmentFormOptions } from "./shipment-dialog";
import { ConfirmReceiptDialog, DeleteShipmentDialog } from "./shipment-status-dialogs";
import type { ShipmentRow } from "./shipment-table";
import { useCanEdit } from "@/components/ui/editor-only";

type DialogKind = "edit" | "receive" | "delete";

/** Kembali / Ubah data / Hapus / Konfirmasi penerimaan (design 06B). */
export function ShipmentDetailActions({
  shipment,
  options,
}: {
  shipment: ShipmentRow;
  options: ShipmentFormOptions;
}) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [openDialog, setOpenDialog] = useState<DialogKind>();
  const dialogProps = (kind: DialogKind) => ({
    isOpen: openDialog === kind,
    onOpenChange: (open: boolean) => setOpenDialog(open ? kind : undefined),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/distribusi" variant="outline">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali
      </LinkButton>
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
      {canEdit && shipment.status === "DIKIRIM" && (
        <Button onPress={() => setOpenDialog("receive")}>
          <Check aria-hidden className="size-4" />
          Konfirmasi penerimaan
        </Button>
      )}

      <ShipmentDialog shipment={shipment} options={options} {...dialogProps("edit")} />
      <ConfirmReceiptDialog shipment={shipment} {...dialogProps("receive")} />
      <DeleteShipmentDialog
        shipment={shipment}
        {...dialogProps("delete")}
        onDeleted={() => router.push("/distribusi")}
      />
    </div>
  );
}

export interface ShipmentItemRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
}

/** Rincian barang: every item shares the shipment's status (KF-07.2). */
export function ShipmentItemsTable({
  rows,
  status,
}: {
  rows: ShipmentItemRow[];
  status: ShipmentStatus;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Rincian barang">
          <Table.Header>
            <Table.Column isRowHeader>Barang</Table.Column>
            <Table.Column>Kategori</Table.Column>
            <Table.Column className="text-right">Jumlah keluar</Table.Column>
            <Table.Column className="w-[100px]">Status</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                <Table.Cell>{row.name}</Table.Cell>
                <Table.Cell>{row.category}</Table.Cell>
                <Table.Cell className="text-right">{row.quantity}</Table.Cell>
                <Table.Cell>
                  <ShipmentStatusChip status={status} />
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
