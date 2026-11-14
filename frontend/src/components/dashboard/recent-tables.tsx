"use client";

import { Table } from "@heroui/react";
import type { ReactNode } from "react";
import { CashTypeChip, HandlingStatusChip } from "@/components/ui/status-chips";
import type { CashTransactionType, HandlingStatus } from "@/lib/types";

function TableSection({
  title,
  footer,
  children,
}: {
  title: string;
  footer: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <Table>
        <Table.ScrollContainer>{children}</Table.ScrollContainer>
        <Table.Footer>
          <span className="text-sm text-muted">{footer}</span>
        </Table.Footer>
      </Table>
    </section>
  );
}

const rangeLabel = (count: number, total: number) =>
  count === 0 ? "0 dari 0" : `1–${count} dari ${total}`;

export interface RecentDisasterRow {
  id: string;
  type: string;
  regency: string;
  status: HandlingStatus;
}

export function RecentDisastersTable({
  rows,
  total,
}: {
  rows: RecentDisasterRow[];
  total: number;
}) {
  return (
    <TableSection title="Bencana Terkini" footer={rangeLabel(rows.length, total)}>
      <Table.Content aria-label="Bencana terkini">
        <Table.Header>
          <Table.Column isRowHeader>Kejadian</Table.Column>
          <Table.Column>Wilayah</Table.Column>
          <Table.Column className="w-[88px]">Status</Table.Column>
        </Table.Header>
        <Table.Body renderEmptyState={() => "Belum ada data bencana."}>
          {rows.map((row) => (
            <Table.Row key={row.id} id={row.id}>
              <Table.Cell>{row.type}</Table.Cell>
              <Table.Cell>{row.regency}</Table.Cell>
              <Table.Cell>
                <HandlingStatusChip status={row.status} />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </TableSection>
  );
}

export interface RecentTransactionRow {
  id: string;
  description: string;
  type: CashTransactionType;
  /** Preformatted on the server, e.g. "Rp25.000.000". */
  amount: string;
}

export function RecentTransactionsTable({
  rows,
  total,
}: {
  rows: RecentTransactionRow[];
  total: number;
}) {
  return (
    <TableSection
      title="Transaksi Anggaran Terkini"
      footer={rangeLabel(rows.length, total)}
    >
      <Table.Content aria-label="Transaksi anggaran terkini">
        <Table.Header>
          <Table.Column isRowHeader>Keterangan</Table.Column>
          <Table.Column className="w-[88px]">Jenis</Table.Column>
          <Table.Column className="w-[180px] text-right">Nominal</Table.Column>
        </Table.Header>
        <Table.Body renderEmptyState={() => "Belum ada transaksi."}>
          {rows.map((row) => (
            <Table.Row key={row.id} id={row.id}>
              <Table.Cell>{row.description}</Table.Cell>
              <Table.Cell>
                <CashTypeChip type={row.type} />
              </Table.Cell>
              <Table.Cell className="text-right">{row.amount}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Content>
    </TableSection>
  );
}
