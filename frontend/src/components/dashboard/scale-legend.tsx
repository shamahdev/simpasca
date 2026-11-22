import { handlingScaleLabel } from "@/lib/labels";
import type { HandlingScale } from "@/lib/types";

export const scaleDotClass: Record<HandlingScale, string> = {
  KABUPATEN_KOTA: "bg-scale-regency",
  PROVINSI: "bg-scale-province",
  NASIONAL: "bg-scale-national",
};

export function ScaleLegend() {
  return (
    <ul aria-label="Skala penanganan" className="flex items-center gap-5">
      {(Object.keys(handlingScaleLabel) as HandlingScale[]).map((scale) => (
        <li key={scale} className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-2 rounded-full ${scaleDotClass[scale]}`}
          />
          <span className="text-xs text-muted">
            {handlingScaleLabel[scale]}
          </span>
        </li>
      ))}
    </ul>
  );
}
