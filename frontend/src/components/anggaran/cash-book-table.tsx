"use client";

import {
  Button,
  Dropdown,
  Label,
  ListBox,
  SearchField,
  Select,
  Table,
} from "@heroui/react";
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { CashTypeChip } from "@/components/ui/status-chips";
import { cashTypeLabel } from "@/lib/labels";
import type { CashTransactionType } from "@/lib/types";
import {
  CashTransactionDialog,
  type CashFormValues,
} from "./cash-transaction-dialog";
import { DeleteCashTransactionDialog } from "./delete-cash-transaction-dialog";
import { useCanEdit } from "@/components/ui/editor-only";

/** A cash transaction with server-formatted display strings. */
export interface CashRow extends CashFormValues {
  dateText: string;
  amountText: string;
}

/** List filters, kept in the URL as `?jenis=&periode=&halaman=`. */
export interface CashFilters {
  type?: CashTransactionType;
  /** YYYY-MM */
  period?: string;
  page: number;
}

const ALL = "semua";

function hrefFor({ type, period, page }: CashFilters) {
  const params = new URLSearchParams();
  if (type) params.set("jenis", type);
  if (period) params.set("periode", period);
  if (page > 1) params.set("halaman", String(page));
  const query = params.toString();
  return query ? `/anggaran?${query}` : "/anggaran";
}

export function AddCashTransactionButton() {
  const canEdit = useCanEdit();
  const [isOpen, setIsOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Tambah transaksi
      </Button>
      <CashTransactionDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

interface CashBookTableProps {
  rows: CashRow[];
  filters: CashFilters;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  periodOptions: [string, string][];
}

/** Buku Bantu Kas list (design 05). Filters narrow the list only; totals stay global (finding T4). */
export function CashBookTable({
  rows,
  filters,
  page,
  limit,
  total,
  totalPages,
  periodOptions,
}: CashBookTableProps) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<CashRow>();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  // shortcut: the API has no text search, so search only filters the loaded page; move it server-side when the API supports it.
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((r) => r.description.toLowerCase().includes(needle))
    : rows;

  const setFilter = (change: Partial<CashFilters>) =>
    router.push(hrefFor({ ...filters, ...change, page: 1 }));

  const onAction = (row: CashRow, key: React.Key) => {
    if (key === "detail") return router.push(`/anggaran/${row.id}`);
    setTarget(row);
    setOpenDialog(key === "edit" ? "edit" : "delete");
  };

  const firstIndex = (page - 1) * limit + 1;
  const rangeText =
    rows.length === 0
      ? `0 dari ${total}`
      : `${firstIndex}–${firstIndex + rows.length - 1} dari ${total}`;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <SearchField
          aria-label="Cari keterangan transaksi"
          value={query}
          onChange={setQuery}
          className="min-w-64 flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari keterangan transaksi…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <FilterSelect
          label="Jenis"
          value={filters.type ?? ALL}
          onChange={(v) =>
            setFilter({ type: v === ALL ? undefined : (v as CashTransactionType) })
          }
          options={[
            [ALL, "Semua jenis"],
            ...(Object.keys(cashTypeLabel) as CashTransactionType[]).map(
              (t) => [t, cashTypeLabel[t]] as [string, string],
            ),
          ]}
        />
        <FilterSelect
          label="Periode"
          value={filters.period ?? ALL}
          onChange={(v) => setFilter({ period: v === ALL ? undefined : v })}
          options={[[ALL, "Semua periode"], ...periodOptions]}
        />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Transaksi kas">
            <Table.Header>
              <Table.Column className="w-[140px]">Tanggal</Table.Column>
              <Table.Column isRowHeader>Keterangan</Table.Column>
              <Table.Column className="w-[88px]">Jenis</Table.Column>
              <Table.Column className="w-[180px] text-right">Nominal</Table.Column>
              <Table.Column className="w-16">Aksi</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                total === 0 && !filters.type && !filters.period
                  ? "Belum ada transaksi."
                  : "Tidak ada transaksi yang cocok dengan filter."
              }
            >
              {visible.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>{row.dateText}</Table.Cell>
                  <Table.Cell>{row.description}</Table.Cell>
                  <Table.Cell>
                    <CashTypeChip type={row.type} />
                  </Table.Cell>
                  <Table.Cell className="text-right">{row.amountText}</Table.Cell>
                  <Table.Cell>
                    {canEdit ? (
                    <Dropdown>
                      <Button
                        variant="ghost"
                        size="sm"
                        isIconOnly
                        aria-label={`Aksi untuk ${row.description}`}
                      >
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
                          <Dropdown.Item
                            id="delete"
                            textValue="Hapus"
                            variant="danger"
                          >
                            <Trash2 aria-hidden className="size-4" />
                            <Label>Hapus</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                    ) : (
                      <LinkButton href={`/anggaran/${row.id}`} variant="ghost" size="sm" isIconOnly aria-label={`Lihat detail ${row.description}`}>
                        <Eye aria-hidden className="size-4" />
                      </LinkButton>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer className="flex items-center justify-between gap-4">
          <span className="text-sm text-muted">{rangeText}</span>
          {totalPages > 1 && (
            <nav aria-label="Halaman" className="flex items-center gap-2">
              <PageLink
                href={hrefFor({ ...filters, page: page - 1 })}
                isDisabled={page <= 1}
                label="Halaman sebelumnya"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </PageLink>
              <span className="text-sm text-muted">
                {page} / {totalPages}
              </span>
              <PageLink
                href={hrefFor({ ...filters, page: page + 1 })}
                isDisabled={page >= totalPages}
                label="Halaman berikutnya"
              >
                <ChevronRight aria-hidden className="size-4" />
              </PageLink>
            </nav>
          )}
        </Table.Footer>
      </Table>

      {target && (
        <>
          <CashTransactionDialog
            transaction={target}
            isOpen={openDialog === "edit"}
            onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
          />
          <DeleteCashTransactionDialog
            transaction={target}
            isOpen={openDialog === "delete"}
            onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
          />
        </>
      )}
    </section>
  );
}

function PageLink({
  href,
  isDisabled,
  label,
  children,
}: {
  href: string;
  isDisabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (isDisabled) {
    return (
      <Button variant="ghost" size="sm" isIconOnly isDisabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <LinkButton href={href} variant="ghost" size="sm" isIconOnly aria-label={label}>
      {children}
    </LinkButton>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <Select
      value={value}
      onChange={(key) => onChange(String(key))}
      className="w-48"
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
