"use client";

import { Button, Dropdown, Label, Table } from "@heroui/react";
import { ArrowLeft, Ellipsis, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeReceipt } from "@/app/(app)/logistik/actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useCanEdit } from "@/components/ui/editor-only";
import { LinkButton } from "@/components/ui/link-button";
import { ItemDialog } from "./item-dialog";
import { AddReceiptButton, DeleteItemDialog, type ItemRow } from "./item-table";
import { ReceiptDialog, type ReceiptFormValues, type ReceiptItemOption } from "./receipt-dialog";

/** Kembali / Catat penerimaan / Ubah data / Hapus (design 04B). */
export function ItemDetailActions({ item, items }: { item: ItemRow; items: ReceiptItemOption[] }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/logistik" variant="outline">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali
      </LinkButton>
      <AddReceiptButton items={items} itemId={item.id} />
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
      <ItemDialog
        item={item}
        isOpen={openDialog === "edit"}
        onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
      />
      <DeleteItemDialog
        item={item}
        isOpen={openDialog === "delete"}
        onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
        onDeleted={() => router.push("/logistik")}
      />
    </div>
  );
}

export interface MovementRow {
  id: string;
  dateText: string;
  typeText: string;
  inText: string;
  outText: string;
  balanceText: string;
  note: string;
  disaster?: { href: string; label: string };
}

/** Riwayat pergerakan stok, newest first (UC-11, KF-06.2). */
export function MovementTable({ rows }: { rows: MovementRow[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Riwayat pergerakan stok">
          <Table.Header>
            <Table.Column isRowHeader className="w-[120px]">Tanggal</Table.Column>
            <Table.Column className="w-[120px]">Jenis</Table.Column>
            <Table.Column className="w-[100px] text-right">Masuk</Table.Column>
            <Table.Column className="w-[100px] text-right">Keluar</Table.Column>
            <Table.Column className="w-[110px] text-right">Stok</Table.Column>
            <Table.Column>Keterangan</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "Belum ada pergerakan stok."}>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                <Table.Cell>{row.dateText}</Table.Cell>
                <Table.Cell>{row.typeText}</Table.Cell>
                <Table.Cell className="text-right">{row.inText}</Table.Cell>
                <Table.Cell className="text-right">{row.outText}</Table.Cell>
                <Table.Cell className="text-right font-medium">{row.balanceText}</Table.Cell>
                <Table.Cell>
                  {row.note}
                  {row.disaster && (
                    <>
                      {row.note && " · "}
                      <Link href={row.disaster.href} className="text-accent hover:underline">
                        {row.disaster.label}
                      </Link>
                    </>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}

export interface ReceiptRow extends ReceiptFormValues {
  dateText: string;
  quantityText: string;
}

/** Penerimaan barang with Koreksi / Hapus for staff (UC-08). */
export function ReceiptTable({ rows, items }: { rows: ReceiptRow[]; items: ReceiptItemOption[] }) {
  const canEdit = useCanEdit();
  const [target, setTarget] = useState<ReceiptRow>();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  return (
    <>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Penerimaan barang">
            <Table.Header>
              <Table.Column isRowHeader className="w-[120px]">Tanggal</Table.Column>
              <Table.Column className="w-[110px] text-right">Jumlah</Table.Column>
              <Table.Column>Sumber / pemberi</Table.Column>
              <Table.Column className="w-[130px]">Kondisi</Table.Column>
              <Table.Column>Catatan</Table.Column>
              <Table.Column className="w-16">{canEdit ? "Aksi" : ""}</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => "Belum ada penerimaan untuk barang ini."}>
              {rows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>{row.dateText}</Table.Cell>
                  <Table.Cell className="text-right">{row.quantityText}</Table.Cell>
                  <Table.Cell>{row.sourceGiver}</Table.Cell>
                  <Table.Cell>{row.itemCondition}</Table.Cell>
                  <Table.Cell>{row.notes || "—"}</Table.Cell>
                  <Table.Cell>
                    {canEdit && (
                      <Dropdown>
                        <Button variant="ghost" size="sm" isIconOnly aria-label={`Aksi untuk penerimaan ${row.dateText}`}>
                          <Ellipsis aria-hidden className="size-4" />
                        </Button>
                        <Dropdown.Popover>
                          <Dropdown.Menu
                            onAction={(key) => {
                              setTarget(row);
                              setOpenDialog(key === "edit" ? "edit" : "delete");
                            }}
                          >
                            <Dropdown.Item id="edit" textValue="Koreksi">
                              <Pencil aria-hidden className="size-4" />
                              <Label>Koreksi</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                              <Trash2 aria-hidden className="size-4" />
                              <Label>Hapus</Label>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      {target && (
        <>
          <ReceiptDialog
            items={items}
            receipt={target}
            isOpen={openDialog === "edit"}
            onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
          />
          <ConfirmDeleteDialog
            heading="Hapus penerimaan?"
            confirmLabel="Hapus penerimaan"
            onConfirm={() => removeReceipt(target.id)}
            isOpen={openDialog === "delete"}
            onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
          >
            Hapus penerimaan {target.quantityText} dari {target.sourceGiver}? Jumlahnya dikurangkan
            dari stok sebagai koreksi, dan ditolak bila stok tidak mencukupi.
          </ConfirmDeleteDialog>
        </>
      )}
    </>
  );
}
