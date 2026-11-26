"use client";

import { Table } from "@heroui/react";
import type { ReactNode } from "react";

export interface SimpleColumn {
  label: string;
  className?: string;
}

/** Read-only table whose cells are rendered on the server and passed in. */
export function SimpleTable({
  label,
  columns,
  rows,
  empty,
  footer,
}: {
  label: string;
  columns: SimpleColumn[];
  rows: { id: string; cells: ReactNode[] }[];
  empty: string;
  footer?: ReactNode;
}) {
  return (
    <Table>
      <Table.ScrollContainer>
        <Table.Content aria-label={label}>
          <Table.Header>
            {columns.map((c, i) => (
              <Table.Column key={c.label || i} isRowHeader={i === 0} className={c.className}>
                {c.label}
              </Table.Column>
            ))}
          </Table.Header>
          <Table.Body renderEmptyState={() => empty}>
            {rows.map((row) => (
              <Table.Row key={row.id} id={row.id}>
                {row.cells.map((cell, i) => (
                  <Table.Cell key={i} className={columns[i]?.className}>
                    {cell}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
      {footer && <Table.Footer>{footer}</Table.Footer>}
    </Table>
  );
}
