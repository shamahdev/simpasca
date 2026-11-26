"use client";

import { useRouter } from "next/navigation";
import { FilterSelect } from "@/components/bencana/disaster-table";
import { auditActionLabel, auditEntityLabel } from "@/lib/labels";

const ALL = "semua";

/** Tindakan / Data filters; they live in the URL so the server pages the filtered list. */
export function AuditFilters({ action, entityType }: { action: string; entityType: string }) {
  const router = useRouter();
  const go = (next: { action: string; entityType: string }) => {
    const params = new URLSearchParams();
    if (next.action !== ALL) params.set("action", next.action);
    if (next.entityType !== ALL) params.set("entity", next.entityType);
    router.push(params.size ? `/riwayat-audit?${params}` : "/riwayat-audit");
  };
  return (
    <div className="flex flex-wrap items-end gap-4">
      <FilterSelect
        label="Tindakan"
        value={action || ALL}
        onChange={(value) => go({ action: value, entityType: entityType || ALL })}
        options={[[ALL, "Semua tindakan"], ...Object.entries(auditActionLabel)]}
      />
      <FilterSelect
        label="Data"
        className="w-56"
        value={entityType || ALL}
        onChange={(value) => go({ action: action || ALL, entityType: value })}
        options={[[ALL, "Semua data"], ...Object.entries(auditEntityLabel)]}
      />
    </div>
  );
}
