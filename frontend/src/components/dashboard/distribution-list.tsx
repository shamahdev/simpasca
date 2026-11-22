import { CardRoot } from "@heroui/react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { LinkButton } from "@/components/ui/link-button";
import { ShipmentStatusChip } from "@/components/ui/status-chips";
import { formatNumber, formatShortDate, shortRegencyName } from "@/lib/format";
import type { Disaster, InventoryItem, Shipment } from "@/lib/types";

export interface DistributionListEntry {
  key: string;
  shipment: Shipment;
  item: InventoryItem;
  quantity: number;
  disaster?: Disaster;
}

export function DistributionListItem({
  shipment,
  item,
  quantity,
  disaster,
}: Omit<DistributionListEntry, "key">) {
  const destination = disaster
    ? `${shipment.destination} · ${shortRegencyName(disaster.regencyCity)}`
    : shipment.destination;

  return (
    <li className="flex items-center gap-2 border-b border-separator py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm">{item.name}</span>
        <span className="truncate text-xs text-muted">{destination}</span>
        <span className="text-xs text-muted">
          {shipment.code} · {formatShortDate(shipment.shippedAt)}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-semibold">
          {formatNumber(quantity)} {item.stockUnit}
        </span>
        <ShipmentStatusChip status={shipment.status} />
      </div>
      <LinkButton
        href={`/distribusi/${shipment.id}`}
        variant="ghost"
        size="sm"
        isIconOnly
        aria-label={`Buka rincian ${shipment.code}`}
      >
        <ChevronRight aria-hidden className="size-4 text-muted" />
      </LinkButton>
    </li>
  );
}

export function DistributionList({
  entries,
  className = "",
}: {
  entries: DistributionListEntry[];
  className?: string;
}) {
  return (
    <CardRoot className={className}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm leading-6 font-medium">Distribusi Logistik</h2>
        <LinkButton
          href="/distribusi"
          variant="ghost"
          size="sm"
          className="text-accent-soft-foreground"
        >
          <ArrowUpRight aria-hidden className="size-3.5" />
          Lihat semua
        </LinkButton>
      </div>
      {entries.length > 0 ? (
        <ul className="flex flex-col">
          {entries.map(({ key, ...entry }) => (
            <DistributionListItem key={key} {...entry} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Belum ada pengiriman.</p>
      )}
    </CardRoot>
  );
}
