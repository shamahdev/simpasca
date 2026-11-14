"use client";

import { Button, Table } from "@heroui/react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkButton } from "@/components/ui/link-button";
import { CashTransactionDialog } from "./cash-transaction-dialog";
import type { CashRow } from "./cash-book-table";
import { DeleteCashTransactionDialog } from "./delete-cash-transaction-dialog";

/** Kembali / Ubah data / Hapus buttons on the detail page (design 05B). */
export function CashDetailActions({ transaction }: { transaction: CashRow }) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete">();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LinkButton href="/anggaran" variant="outline">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali
      </LinkButton>
      <Button variant="outline" onPress={() => setOpenDialog("edit")}>
        <Pencil aria-hidden className="size-4" />
        Ubah data
      </Button>
      <Button variant="danger-soft" onPress={() => setOpenDialog("delete")}>
        <Trash2 aria-hidden className="size-4" />
        Hapus
      </Button>

      <CashTransactionDialog
        transaction={transaction}
        isOpen={openDialog === "edit"}
        onOpenChange={(open) => setOpenDialog(open ? "edit" : undefined)}
      />
      <DeleteCashTransactionDialog
        transaction={transaction}
        isOpen={openDialog === "delete"}
        onOpenChange={(open) => setOpenDialog(open ? "delete" : undefined)}
        onDeleted={() => router.push("/anggaran")}
      />
    </div>
  );
}

export interface TrailRow {
  key: string;
  time: string;
  user: string;
  action: string;
  note: string;
}

/** "Jejak pencatatan" table: creation plus UBAH/HAPUS audit entries (KF-09). */
export function CashTrailTable({ rows }: { rows: TrailRow[] }) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label="Jejak pencatatan">
          <Table.Header>
            <Table.Column className="w-[180px]">Waktu</Table.Column>
            <Table.Column className="w-[200px]">Petugas</Table.Column>
            <Table.Column className="w-[120px]">Tindakan</Table.Column>
            <Table.Column isRowHeader>Catatan</Table.Column>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.key} id={row.key}>
                <Table.Cell>{row.time}</Table.Cell>
                <Table.Cell>{row.user}</Table.Cell>
                <Table.Cell>{row.action}</Table.Cell>
                <Table.Cell>{row.note}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
