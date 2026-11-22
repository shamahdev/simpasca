"use client";

import { AlertDialog, Button } from "@heroui/react";
import { useState, useTransition, type ReactNode } from "react";

interface ConfirmDeleteDialogProps {
  heading: string;
  children: ReactNode;
  confirmLabel: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Runs the delete; an error result keeps the dialog open with the message. */
  onConfirm: () => Promise<{ status: string; message?: string }>;
  onDeleted?: () => void;
}

/** Danger confirmation used by every "Hapus" action (designs 03E, 05E, 06F). */
export function ConfirmDeleteDialog({
  heading,
  children,
  confirmLabel,
  isOpen,
  onOpenChange,
  onConfirm,
  onDeleted,
}: ConfirmDeleteDialogProps) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await onConfirm();
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      onOpenChange(false);
      onDeleted?.();
    });

  return (
    <AlertDialog.Backdrop
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) setError(undefined);
        onOpenChange(open);
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.CloseTrigger />
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{heading}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-2">
            <p>{children}</p>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary">
              Batal
            </Button>
            <Button variant="danger" isPending={isPending} onPress={confirm}>
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
