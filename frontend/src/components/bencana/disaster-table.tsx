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
import { Ellipsis, Eye, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useGenerateReport } from "@/components/laporan/report-buttons";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { removeDisaster } from "@/app/(app)/bencana/actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { HandlingStatusChip } from "@/components/ui/status-chips";
import { handlingScaleLabel, handlingStatusLabel } from "@/lib/labels";
import { HANDLING_SCALES, HANDLING_STATUSES } from "@/lib/options";
import { DisasterDialog, type DisasterFormValues } from "./disaster-dialog";
import { useCanEdit } from "@/components/ui/editor-only";
import { LinkButton } from "@/components/ui/link-button";

/** A disaster with server-formatted display strings. */
export interface DisasterRow extends DisasterFormValues {
  /** "Banjir · 16 Jun 2026" */
  title: string;
  /** "Banjir · Kabupaten Bandung" */
  name: string;
  affectedText: string;
}

const ALL = "semua";

export function AddDisasterButton() {
  const canEdit = useCanEdit();
  const [isOpen, setIsOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>
        <Plus aria-hidden className="size-4" />
        Tambah bencana
      </Button>
      <DisasterDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export function DeleteDisasterDialog({
  disaster,
  ...props
}: {
  disaster: Pick<DisasterRow, "id" | "name">;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted?: () => void;
}) {
  return (
    <ConfirmDeleteDialog
      heading="Hapus data bencana?"
      confirmLabel="Hapus bencana"
      onConfirm={() => removeDisaster(disaster.id)}
      {...props}
    >
      Hapus catatan {disaster.name}? Pengiriman terkait tetap tercatat dan dapat
      ditelusuri.
    </ConfirmDeleteDialog>
  );
}

/** Data Bencana list (design 03, UC-05). */
export function DisasterTable({ rows }: { rows: DisasterRow[] }) {
  const router = useRouter();
  const canEdit = useCanEdit();
  const initialStatus = useSearchParams().get("status");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(
    HANDLING_STATUSES.includes(initialStatus as never) ? initialStatus! : ALL,
  );
  const [scale, setScale] = useState(ALL);
  const [target, setTarget] = useState<DisasterRow>();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (!needle ||
        `${r.disasterType} ${r.regencyCity} ${r.province}`.toLowerCase().includes(needle)) &&
      (status === ALL || r.status === status) &&
      (scale === ALL || r.handlingScale === scale),
  );

  const report = useGenerateReport();

  const onAction = (row: DisasterRow, key: React.Key) => {
    if (key === "detail") return router.push(`/bencana/${row.id}`);
    if (key === "report") return report.generate(row.id);
    setTarget(row);
    setOpenDialog(key === "edit" ? "edit" : "delete");
  };

  return (
    <section className="flex flex-col gap-4">
      {report.isPending && <p className="text-sm text-muted">Membuat laporan…</p>}
      {report.error && (
        <p role="alert" className="text-sm text-danger">
          {report.error}
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        <SearchField
          aria-label="Cari jenis atau wilayah"
          value={query}
          onChange={setQuery}
          className="min-w-64 flex-1"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Cari jenis atau wilayah…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={[[ALL, "Semua status"], ...HANDLING_STATUSES.map((s) => [s, handlingStatusLabel[s]] as [string, string])]}
        />
        <FilterSelect
          label="Skala"
          value={scale}
          onChange={setScale}
          options={[[ALL, "Semua skala"], ...HANDLING_SCALES.map((s) => [s, handlingScaleLabel[s]] as [string, string])]}
        />
      </div>

      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Data bencana">
            <Table.Header>
              <Table.Column isRowHeader>Kejadian / tanggal</Table.Column>
              <Table.Column>Wilayah</Table.Column>
              <Table.Column className="w-[150px]">Skala</Table.Column>
              <Table.Column className="w-[120px] text-right">Terdampak</Table.Column>
              <Table.Column className="w-[100px]">Status</Table.Column>
              <Table.Column className="w-16">Aksi</Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                rows.length === 0 ? "Belum ada data bencana." : "Tidak ada bencana yang cocok dengan filter."
              }
            >
              {visible.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>{row.title}</Table.Cell>
                  <Table.Cell>{row.regencyCity}</Table.Cell>
                  <Table.Cell>{handlingScaleLabel[row.handlingScale]}</Table.Cell>
                  <Table.Cell className="text-right">{row.affectedText}</Table.Cell>
                  <Table.Cell>
                    <HandlingStatusChip status={row.status} />
                  </Table.Cell>
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
                          <Dropdown.Item id="report" textValue="Generate laporan">
                            <FileText aria-hidden className="size-4" />
                            <Label>Generate laporan</Label>
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
                      <LinkButton href={`/bencana/${row.id}`} variant="ghost" size="sm" isIconOnly aria-label={`Lihat detail ${row.name}`}>
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
          <DisasterDialog
            disaster={target}
            isOpen={openDialog === "edit"}
            onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
          />
          <DeleteDisasterDialog
            disaster={target}
            isOpen={openDialog === "delete"}
            onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
          />
        </>
      )}
    </section>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className = "w-48",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
  className?: string;
}) {
  return (
    <Select value={value} onChange={(key) => onChange(String(key))} className={className}>
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
