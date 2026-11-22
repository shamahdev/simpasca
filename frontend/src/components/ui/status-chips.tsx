import { Chip } from "@heroui/react";
import {
  cashTypeLabel,
  fulfillmentLabel,
  handlingScaleLabel,
  handlingStatusLabel,
  shipmentStatusLabel,
} from "@/lib/labels";
import type {
  CashTransactionType,
  HandlingScale,
  HandlingStatus,
  ShipmentStatus,
} from "@/lib/types";

type ChipColor = "accent" | "default" | "success" | "warning" | "danger";

function SoftChip({
  color,
  className,
  children,
}: {
  color: ChipColor;
  className?: string;
  children: string;
}) {
  return (
    <Chip size="sm" variant="soft" color={color} className={className}>
      {children}
    </Chip>
  );
}

export function HandlingStatusChip({ status }: { status: HandlingStatus }) {
  return (
    <SoftChip color={status === "AKTIF" ? "success" : "warning"}>
      {handlingStatusLabel[status]}
    </SoftChip>
  );
}

const scaleChipColor: Record<HandlingScale, ChipColor> = {
  KABUPATEN_KOTA: "accent",
  PROVINSI: "warning",
  NASIONAL: "default",
};

export function HandlingScaleChip({ scale }: { scale: HandlingScale }) {
  return (
    <SoftChip
      color={scaleChipColor[scale]}
      className={
        scale === "NASIONAL"
          ? "bg-scale-national/15 text-scale-national"
          : undefined
      }
    >
      {`Skala ${handlingScaleLabel[scale]}`}
    </SoftChip>
  );
}

export function ShipmentStatusChip({ status }: { status: ShipmentStatus }) {
  return (
    <SoftChip color={status === "DITERIMA" ? "success" : "warning"}>
      {shipmentStatusLabel[status]}
    </SoftChip>
  );
}

const fulfillmentColor: Record<keyof typeof fulfillmentLabel, ChipColor> = {
  TERPENUHI: "success",
  KURANG: "warning",
  TANPA_RASIO: "default",
};

/** Indikator pemenuhan (KF-05.1). */
export function FulfillmentChip({
  status,
}: {
  status: keyof typeof fulfillmentLabel;
}) {
  return (
    <SoftChip color={fulfillmentColor[status]}>{fulfillmentLabel[status]}</SoftChip>
  );
}

export function CashTypeChip({ type }: { type: CashTransactionType }) {
  return (
    <SoftChip color={type === "MASUK" ? "success" : "warning"}>
      {cashTypeLabel[type]}
    </SoftChip>
  );
}
