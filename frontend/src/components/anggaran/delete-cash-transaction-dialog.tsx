"use client";

import { AlertDialog, Button } from "@heroui/react";
import { useState, useTransition } from "react";
import { removeCashTransaction } from "@/app/(app)/anggaran/actions";
import { cashTypeNoun } from "@/lib/labels";
import type { CashTransactionType } from "@/lib/types";

interface DeleteCashTransactionDialogProps {
  transaction: { id: string; type: CashTransactionType; amountText: string };
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted?: () => void;
}

/** Hapus transaksi kas confirmation (design 05E, UC-12 A5). */
export function DeleteCashTransactionDialog({
  transaction,
  isOpen,
  onOpenChange,
  onDeleted,
}: DeleteCashTransactionDialogProps) {
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await removeCashTransaction(transaction.id);
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
            <AlertDialog.Heading>Hapus transaksi kas?</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-2">
            <p>
              Hapus {cashTypeNoun[transaction.type]} {transaction.amountText}?
              Saldo kas akan disesuaikan. Stok tidak berubah.
            </p>
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
              Hapus transaksi
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
