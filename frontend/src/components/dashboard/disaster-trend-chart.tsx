import { CardRoot } from "@heroui/react";
import type { DisasterTrendPoint } from "@/lib/types";

type SeriesKey = Exclude<keyof DisasterTrendPoint, "month">;

const series: { key: SeriesKey; label: string; bar: string; text: string }[] = [
  { key: "banjir", label: "Banjir", bar: "bg-accent", text: "text-accent" },
  { key: "gempa", label: "Gempa", bar: "bg-danger", text: "text-danger" },
  { key: "longsor", label: "Longsor", bar: "bg-warning", text: "text-warning" },
  {
    key: "lainnya",
    label: "Lainnya",
    bar: "bg-foreground",
    text: "text-foreground",
  },
];

/** Grouped bar chart of disaster counts per month and type. */
export function DisasterTrendChart({
  title,
  subtitle,
  data,
  className = "",
}: {
  title: string;
  subtitle: string;
  data: DisasterTrendPoint[];
  className?: string;
}) {
  const max = Math.max(1, ...data.flatMap((p) => series.map((s) => p[s.key])));

  return (
    <CardRoot className={className}>
      <div className="flex flex-col gap-1">
        <h2 className="text-sm leading-6 font-medium">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      <div className="flex min-h-48 flex-1 gap-4">
        {data.map((point) => (
          <div
            key={point.month}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex w-full flex-1 gap-1 border-b border-separator">
              {series.map((s) => (
                <div
                  key={s.key}
                  role="img"
                  aria-label={`${s.label} ${point.month}: ${point[s.key]}`}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                >
                  <span aria-hidden className={`text-xs ${s.text}`}>
                    {point[s.key]}
                  </span>
                  <div
                    className={`w-full rounded-t-[3px] ${s.bar}`}
                    style={{ height: `${(point[s.key] / max) * 80}%` }}
                  />
                </div>
              ))}
            </div>
            <span className="text-xs text-muted">{point.month}</span>
          </div>
        ))}
      </div>

      <ul className="flex items-center gap-4">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1">
            <span aria-hidden className={`size-1.5 rounded-full ${s.bar}`} />
            <span className="text-xs text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </CardRoot>
  );
}
