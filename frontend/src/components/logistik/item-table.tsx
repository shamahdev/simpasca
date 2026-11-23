"use client";

import { Button, Chip, Dropdown, Label, SearchField, Table } from "@heroui/react";
import { Ellipsis, Eye, PackagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeItem } from "@/app/(app)/logistik/actions";
import { FilterSelect } from "@/components/bencana/disaster-table";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { useCanEdit } from "@/components/ui/editor-only";
import { LinkButton } from "@/components/ui/link-button";
import { todayIsoDate } from "@/lib/format";
import { itemCategoryLabel } from "@/lib/labels";
import { ITEM_CATEGORIES } from "@/lib/options";
import { ItemDialog, type ItemFormValues } from "./item-dialog";
import { ReceiptDialog, type ReceiptItemOption } from "./receipt-dialog";

/** An item with its current stock and server-formatted display strings. */
export interface ItemRow extends ItemFormValues {
  stock: number;
  categoryText: string;
  /** "4.500 kg" */
  stockText: string;
  ratioText: string;
  expiryText: string;
}

const ALL = "semua";
/** Same threshold as the dashboard's low-stock panel (KF-02.5). */
const LOW_STOCK = 10;

export const isExpired = (row: Pick<ItemRow, "category" | "expirationDate">, today: string) =>
  row.category === "PANGAN" && row.expirationDate !== null && row.expirationDate < today;

/** Stock and expiry flags shown next to an item. */
export function StockFlags({ row }: { row: Pick<ItemRow, "stock" | "category" | "expirationDate"> }) {
  return (
    <span className="flex flex-wrap gap-1">
      {row.stock <= LOW_STOCK && (
        <Chip size="sm" color="danger" variant="soft">
          Stok kritis
        </Chip>
      )}
      {isExpired(row, todayIsoDate()) && (
        <Chip size="sm" color="warning" variant="soft">
          Kedaluwarsa
        </Chip>
      )}
    </span>
  );
}

export function AddItemButton() {
  const canEdit = useCanEdit();
  const [isOpen, setIsOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Tambah barang
      </Button>
      <ItemDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export function AddReceiptButton({
  items,
  itemId,
  variant = "outline",
}: {
  items: ReceiptItemOption[];
  itemId?: string;
  variant?: "primary" | "outline";
}) {
  const canEdit = useCanEdit();
  const [isOpen, setIsOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button variant={variant} onPress={() => setIsOpen(true)}>
        <PackagePlus aria-hidden className="size-4" />
        Catat penerimaan
      </Button>
      <ReceiptDialog items={items} itemId={itemId} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export function DeleteItemDialog({
  item,
  ...props
}: {
  item: Pick<ItemRow, "id" | "name">;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted?: () => void;
}) {
  return (
    <ConfirmDeleteDialog
      heading="Hapus barang logistik?"
      confirmLabel="Hapus barang"
      onConfirm={() => removeItem(item.id)}
      {...props}
    >
      Hapus {item.name} dari daftar barang? Barang yang sudah memiliki riwayat stok tidak dapat
      dihapus agar riwayatnya tetap utuh.
    </ConfirmDeleteDialog>
  );
}

/** Logistik list (design 04, UC-07). */
export function ItemTable({ rows }: { rows: ItemRow[] }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const [target, setTarget] = useState<ItemRow>();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (!needle || `${r.name} ${r.categoryText}`.toLowerCase().includes(needle)) &&
      (category === ALL || r.category === category),
  );

  const onAction = (row: ItemRow, key: React.Key) => {
    if (key === "detail") return router.push(`/logistik/${row.id}`);
    setTarget(row);
    setOpenDialog(key === "edit" ? "edit" : "delete");
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <SearchField aria-label="Cari barang" value={query} onChange={setQuery} className="min-w-64 flex-1">
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari nama barang…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterSelect
          label="Kategori"
          value={category}
          onChange={setCategory}
          options={[[ALL, "Semua kategori"], ...ITEM_CATEGORIES.map((c) => [c, itemCategoryLabel[c]] as [string, string])]}
        />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Barang logistik">
            <Table.Header>
              <Table.Column isRowHeader>Barang</Table.Column>
              <Table.Column className="w-[150px]">Kategori</Table.Column>
              <Table.Column className="w-[140px] text-right">Stok terkini</Table.Column>
              <Table.Column>Rasio kebutuhan</Table.Column>
              <Table.Column className="w-[130px]">Kedaluwarsa</Table.Column>
              <Table.Column className="w-16">Aksi</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                rows.length === 0 ? "Belum ada barang logistik." : "Tidak ada barang yang cocok dengan filter."
              }
            >
              {visible.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>
                    <span className="flex flex-col gap-1">
                      {row.name}
                      <StockFlags row={row} />
                    </span>
                  </Table.Cell>
                  <Table.Cell>{row.categoryText}</Table.Cell>
                  <Table.Cell className="text-right">{row.stockText}</Table.Cell>
                  <Table.Cell>{row.ratioText}</Table.Cell>
                  <Table.Cell>{row.expiryText}</Table.Cell>
                  <Table.Cell>
                    {canEdit ? (
                      <Dropdown>
                        <Button variant="ghost" size="sm" isIconOnly aria-label={`Aksi untuk ${row.name}`}>
                          <Ellipsis aria-hidden className="size-4" />
                        </Button>
                        <Dropdown.Popover>
                          <Dropdown.Menu onAction={(key) => onAction(row, key)}>
                            <Dropdown.Item id="detail" textValue="Lihat detail">
                              <Eye aria-hidden className="size-4" />
                              <Label>Lihat detail</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="edit" textValue="Ubah data">
                              <Pencil aria-hidden className="size-4" />
                              <Label>Ubah data</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                              <Trash2 aria-hidden className="size-4" />
                              <Label>Hapus</Label>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    ) : (
                      <LinkButton href={`/logistik/${row.id}`} variant="ghost" size="sm" isIconOnly aria-label={`Lihat detail ${row.name}`}>
                        <Eye aria-hidden className="size-4" />
                      </LinkButton>
                    )}
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
          <ItemDialog
            item={target}
            isOpen={openDialog === "edit"}
            onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
          />
          <DeleteItemDialog
            item={target}
            isOpen={openDialog === "delete"}
            onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
          />
        </>
      )}
    </section>
  );
}
