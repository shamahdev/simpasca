"use client";

import { Button, Dropdown, Label, SearchField, Table } from "@heroui/react";
import { Ellipsis, Eye, PackageCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FilterSelect } from "@/components/bencana/disaster-table";
import { ShipmentStatusChip } from "@/components/ui/status-chips";
import { shipmentStatusLabel } from "@/lib/labels";
import type { ShipmentStatus } from "@/lib/types";
import {
  ShipmentDialog,
  type ShipmentFormOptions,
  type ShipmentFormValues,
} from "./shipment-dialog";
import { ConfirmReceiptDialog, DeleteShipmentDialog } from "./shipment-status-dialogs";

/** A shipment with server-formatted display strings. */
export interface ShipmentRow extends ShipmentFormValues {
  code: string;
  status: ShipmentStatus;
  /** "Banjir Bandung" */
  disasterLabel: string;
  shippedAtText: string;
  receivedAtText: string;
}

const ALL = "semua";
const STATUSES: ShipmentStatus[] = ["DIKIRIM", "DITERIMA"];

export function AddShipmentButton({ options }: { options: ShipmentFormOptions }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Buat pengiriman
      </Button>
      <ShipmentDialog options={options} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

type DialogKind = "edit" | "receive" | "delete";

/** Distribusi Bantuan list (design 06, UC-09/UC-10). */
export function ShipmentTable({
  rows,
  options,
}: {
  rows: ShipmentRow[];
  options: ShipmentFormOptions;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(ALL);
  const [disaster, setDisaster] = useState(ALL);
  const [target, setTarget] = useState<ShipmentRow>();
  const [openDialog, setOpenDialog] = useState<DialogKind>();

  const disasterOptions = [...new Map(rows.map((r) => [r.disasterId, r.disasterLabel]))];
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (!needle || `${r.code} ${r.destination} ${r.disasterLabel}`.toLowerCase().includes(needle)) &&
      (status === ALL || r.status === status) &&
      (disaster === ALL || r.disasterId === disaster),
  );

  const onAction = (row: ShipmentRow, key: React.Key) => {
    if (key === "detail") return router.push(`/distribusi/${row.id}`);
    setTarget(row);
    setOpenDialog(key as DialogKind);
  };
  const dialogProps = (kind: DialogKind) => ({
    isOpen: openDialog === kind,
    onOpenChange: (open: boolean) => setOpenDialog(open ? kind : undefined),
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <SearchField
          aria-label="Cari pengiriman atau tujuan"
          value={query}
          onChange={setQuery}
          className="min-w-64 flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari pengiriman atau tujuan…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[[ALL, "Semua status"], ...STATUSES.map((s) => [s, shipmentStatusLabel[s]] as [string, string])]}
        />
        <FilterSelect
          label="Bencana"
          value={disaster}
          onChange={setDisaster}
          options={[[ALL, "Semua bencana"], ...disasterOptions]}
          className="w-56"
        />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Pengiriman bantuan">
            <Table.Header>
              <Table.Column isRowHeader className="w-[140px]">Pengiriman</Table.Column>
              <Table.Column>Bencana / tujuan</Table.Column>
              <Table.Column className="w-[130px]">Tanggal kirim</Table.Column>
              <Table.Column className="w-[130px]">Penerimaan</Table.Column>
              <Table.Column className="w-[100px]">Status</Table.Column>
              <Table.Column className="w-16">Aksi</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                rows.length === 0 ? "Belum ada pengiriman." : "Tidak ada pengiriman yang cocok dengan filter."
              }
            >
              {visible.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>{row.code}</Table.Cell>
                  <Table.Cell>{`${row.disasterLabel} · ${row.destination}`}</Table.Cell>
                  <Table.Cell>{row.shippedAtText}</Table.Cell>
                  <Table.Cell>{row.receivedAtText}</Table.Cell>
                  <Table.Cell>
                    <ShipmentStatusChip status={row.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Dropdown>
                      <Button variant="ghost" size="sm" isIconOnly aria-label={`Aksi untuk ${row.code}`}>
                        <Ellipsis aria-hidden className="size-4" />
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          onAction={(key) => onAction(row, key)}
                          disabledKeys={row.status === "DITERIMA" ? ["receive"] : []}
                        >
                          <Dropdown.Item id="detail" textValue="Lihat detail">
                            <Eye aria-hidden className="size-4" />
                            <Label>Lihat detail</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="edit" textValue="Ubah data">
                            <Pencil aria-hidden className="size-4" />
                            <Label>Ubah data</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="receive" textValue="Konfirmasi penerimaan">
                            <PackageCheck aria-hidden className="size-4" />
                            <Label>Konfirmasi penerimaan</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                            <Trash2 aria-hidden className="size-4" />
                            <Label>Hapus</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer>
          <span className="text-sm text-muted">
            {visible.length === 0 ? `0 dari ${rows.length}` : `1–${visible.length} dari ${rows.length}`}
          </span>
        </Table.Footer>
      </Table>

      {target && (
        <>
          <ShipmentDialog shipment={target} options={options} {...dialogProps("edit")} />
          <ConfirmReceiptDialog shipment={target} {...dialogProps("receive")} />
          <DeleteShipmentDialog shipment={target} {...dialogProps("delete")} />
        </>
      )}
    </section>
  );
}
