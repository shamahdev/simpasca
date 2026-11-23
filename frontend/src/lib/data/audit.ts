import { listAll, postJson } from "./api.ts";

/**
 * Records a change in audit_logs (KF-09). The API does not audit on its own,
 * so every update and delete calls this after the change succeeded.
 * A failed audit write is logged instead of failing a change that already happened.
 */
export async function recordAudit(entry: {
  userId: number;
  action: "UBAH" | "HAPUS";
  entityType: "disasters" | "shipments" | "cash_transactions" | "inventory_items" | "stock_receipts";
  entityId: string;
  before: object;
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
