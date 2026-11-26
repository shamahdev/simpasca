import { ChevronLeft, ChevronRight } from "lucide-react";
import { LinkButton } from "./link-button";

/** Previous / next links for server-paged lists. */
export function Pager({
  page,
  totalPages,
  total,
  href,
}: {
  page: number;
  totalPages: number;
  total: number;
  href: (page: number) => string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-sm text-muted">
        Halaman {page} dari {totalPages} · {total} data
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <LinkButton href={href(page - 1)} variant="ghost" size="sm" isIconOnly aria-label="Halaman sebelumnya">
            <ChevronLeft aria-hidden className="size-4" />
          </LinkButton>
        )}
        {page < totalPages && (
          <LinkButton href={href(page + 1)} variant="ghost" size="sm" isIconOnly aria-label="Halaman berikutnya">
            <ChevronRight aria-hidden className="size-4" />
          </LinkButton>
        )}
      </div>
    </div>
  );
}
