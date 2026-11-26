import type { AuditEntry } from "@/lib/data/audit";

const data = (e: AuditEntry) => e.after_data ?? e.before_data ?? {};

/** A short human label for the affected record, from whatever name-like field it has. */
export function auditSubject(e: AuditEntry): string {
  const d = data(e);
  if (e.action === "GENERATE_LAPORAN") return `Laporan ${String(d.code ?? "")} · ${String(d.disaster_type ?? "")} ${String(d.regency_city ?? "")}`.trim();
  for (const key of ["name", "description", "destination", "source_giver", "username"]) {
    if (typeof d[key] === "string" && d[key]) return String(d[key]);
  }
  if (typeof d.disaster_type === "string") return `${d.disaster_type} · ${String(d.regency_city ?? "")}`;
  return `#${e.entity_id}`;
}

/** Where the affected record can be opened; none once it is deleted. */
export function auditHref(e: AuditEntry): string | undefined {
  if (e.action === "GENERATE_LAPORAN") return e.after_data?.report_id ? `/laporan/${e.after_data.report_id}` : undefined;
  if (e.action === "HAPUS") return undefined;
  switch (e.entity_type) {
    case "disasters":
      return `/bencana/${e.entity_id}`;
    case "shipments":
      return `/distribusi/${e.entity_id}`;
    case "cash_transactions":
      return `/anggaran/${e.entity_id}`;
    case "inventory_items":
      return `/logistik/${e.entity_id}`;
    case "stock_receipts":
      return e.after_data?.item_id ? `/logistik/${e.after_data.item_id}` : undefined;
    case "users":
      return "/pengguna";
  }
}
