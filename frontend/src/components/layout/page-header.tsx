import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-4">
      <div className="flex flex-1 flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && (
          <p className="text-sm leading-6 text-muted">{description}</p>
        )}
      </div>
      {actions}
    </header>
  );
}
