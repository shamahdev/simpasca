import { getRow, listAll, listPage } from "./api.ts";

/** Audit entries are written by the API in the same transaction as the change (KF-09.1). */
export type AuditAction = "UBAH" | "HAPUS" | "GENERATE_LAPORAN";
export type AuditEntityType =
  | "disasters"
  | "shipments"
  | "cash_transactions"
  | "inventory_items"
  | "stock_receipts"
  | "users";

export interface AuditEntry {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  occurred_at: string;
}

/** UBAH/HAPUS history of one row, oldest first. */
export async function listAuditEntries(entityType: string, entityId: string) {
  const rows = await listAll<AuditEntry>("/api/audit-logs", {
    entity_type: entityType,
    entity_id: entityId,
  });
  return rows.reverse();
}

/** One page of the whole audit trail, newest first (UC-14, KF-09.2). */
export function listAuditPage(page: number, filter: { action?: string; entityType?: string }) {
  return listPage<AuditEntry>("/api/audit-logs", page, {
    ...(filter.action && { action: filter.action }),
    ...(filter.entityType && { entity_type: filter.entityType }),
  });
}

export function getAuditEntry(id: string) {
  return getRow<AuditEntry>("/api/audit-logs", id);
}

export interface AuditChange {
  field: string;
  before: string;
  after: string;
}

const show = (value: unknown) =>
  value === undefined ? "—" : value === null ? "kosong" : typeof value === "object" ? JSON.stringify(value) : String(value);

/** Fields whose value differs between before and after; every field for a create or delete (AC-17). */
export function auditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditChange[] {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  return keys
    .filter((key) => !before || !after || show(before[key]) !== show(after[key]))
    .map((key) => ({
      field: key,
      before: before ? show(before[key]) : "—",
      after: after ? show(after[key]) : "—",
    }));
}
