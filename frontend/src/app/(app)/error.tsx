"use client";

import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  AlertTitle,
  Button,
} from "@heroui/react";
import { useEffect } from "react";

/** Shown when a page fails to load, e.g. the SIMPASCA API is unreachable. */
export default function AppError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AlertRoot status="danger">
      <AlertIndicator />
      <AlertContent>
        <AlertTitle>Data tidak dapat dimuat</AlertTitle>
        <AlertDescription>
          Server SIMPASCA sedang tidak dapat dihubungi atau terjadi kesalahan.
          Coba lagi beberapa saat lagi.
        </AlertDescription>
      </AlertContent>
      <Button size="sm" variant="outline" onPress={retry}>
        Coba lagi
      </Button>
    </AlertRoot>
  );
}
