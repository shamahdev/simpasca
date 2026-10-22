import { Chip } from "@heroui/react";
import {
  cashKindLabel,
  handlingScaleLabel,
  handlingStatusLabel,
  shipmentStatusLabel,
} from "@/lib/labels";
import type {
  CashTransactionKind,
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
    <SoftChip color={status === "aktif" ? "success" : "warning"}>
      {handlingStatusLabel[status]}
    </SoftChip>
  );
}

const scaleChipColor: Record<HandlingScale, ChipColor> = {
  kabupaten: "accent",
  provinsi: "warning",
  nasional: "default",
};

export function HandlingScaleChip({ scale }: { scale: HandlingScale }) {
  return (
    <SoftChip
      color={scaleChipColor[scale]}
      className={
        scale === "nasional"
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
    <SoftChip color={status === "diterima" ? "success" : "warning"}>
      {shipmentStatusLabel[status]}
    </SoftChip>
  );
}

export function CashKindChip({ kind }: { kind: CashTransactionKind }) {
  return (
    <SoftChip color={kind === "masuk" ? "success" : "warning"}>
      {cashKindLabel[kind]}
    </SoftChip>
  );
}
