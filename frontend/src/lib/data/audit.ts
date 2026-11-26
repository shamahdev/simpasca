import { listAll, listPage, postJson, getRow } from "./api.ts";

export type AuditAction = "UBAH" | "HAPUS" | "GENERATE_LAPORAN";
export type AuditEntityType =
  | "disasters"
  | "shipments"
  | "cash_transactions"
  | "inventory_items"
  | "stock_receipts"
  | "users";

/**
 * Records a change in audit_logs (KF-09.1). The API does not audit on its own,
 * so every update, delete and report generation calls this after it succeeded.
 * A failed audit write is logged instead of failing a change that already happened.
 */
export async function recordAudit(entry: {
  userId: number;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before: object | null;
  after: object | null;
}) {
  try {
    await postJson("/api/audit-logs", {
      user_id: entry.userId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: Number(entry.entityId),
      before_data: entry.before,
      after_data: entry.after,
    });
  } catch (error) {
    console.error("audit log gagal dicatat", entry.entityType, entry.entityId, error);
  }
}

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
