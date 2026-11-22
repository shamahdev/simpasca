"use client";

import { removeCashTransaction } from "@/app/(app)/anggaran/actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
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
  ...props
}: DeleteCashTransactionDialogProps) {
  return (
    <ConfirmDeleteDialog
      heading="Hapus transaksi kas?"
      confirmLabel="Hapus transaksi"
      onConfirm={() => removeCashTransaction(transaction.id)}
      {...props}
    >
      Hapus {cashTypeNoun[transaction.type]} {transaction.amountText}? Saldo kas
      akan disesuaikan. Stok tidak berubah.
    </ConfirmDeleteDialog>
  );
}
