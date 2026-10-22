import { buttonVariants, type ButtonVariants } from "@heroui/styles";
import Link from "next/link";
import type { ComponentProps } from "react";

type LinkButtonProps = ComponentProps<typeof Link> & ButtonVariants;

/** A Next.js `Link` styled as a HeroUI Button. Use for navigation actions. */
export function LinkButton({
  variant,
  size,
  isIconOnly,
  fullWidth,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={buttonVariants({
        variant,
        size,
        isIconOnly,
        fullWidth,
        className,
      })}
      {...props}
    />
  );
}
