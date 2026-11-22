"use client";

import { Button, FieldError, Form, Input, Label, Modal, TextField } from "@heroui/react";
import { Check, PackageCheck } from "lucide-react";
import { useActionState } from "react";
import { confirmReceipt, removeShipment } from "@/app/(app)/distribusi/actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import type { ActionState } from "@/lib/action-state";
import { todayIsoDate } from "@/lib/format";
import { submitAction } from "@/lib/submit-action";

interface ShipmentRef {
  id: string;
  code: string;
  /** YYYY-MM-DD */
  shippedAt: string;
}

interface DialogProps {
  shipment: ShipmentRef;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Konfirmasi penerimaan (design 06E): stores the receipt date only, stock stays (AC-10). */
export function ConfirmReceiptDialog({ shipment, isOpen, onOpenChange }: DialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <PackageCheck aria-hidden className="size-5" />
            </span>
            <Modal.Heading>Konfirmasi penerimaan</Modal.Heading>
          </Modal.Header>
          {isOpen && <ReceiptForm shipment={shipment} onSaved={() => onOpenChange(false)} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ReceiptForm({ shipment, onSaved }: { shipment: ShipmentRef; onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await confirmReceipt(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;
  const today = todayIsoDate();

  return (
    <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
      <input type="hidden" name="id" value={shipment.id} />
      <Modal.Body className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {shipment.code} dikirim {shipment.shippedAt}. Stok tidak berubah saat penerimaan dikonfirmasi.
        </p>
        <TextField name="receivedAt" isRequired defaultValue={today}>
          <Label>Tanggal penerimaan</Label>
          <Input type="date" min={shipment.shippedAt} max={today} />
          <FieldError />
        </TextField>
        {error && !error.fieldErrors && (
          <p role="alert" className="text-sm text-danger">
            {error.message}
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button slot="close" variant="tertiary">
          Batal
        </Button>
        <Button type="submit" isPending={isPending}>
          <Check aria-hidden className="size-4" />
          Tandai Diterima
        </Button>
      </Modal.Footer>
    </Form>
  );
}

/** Hapus pengiriman (design 06F). */
export function DeleteShipmentDialog({
  shipment,
  ...props
}: DialogProps & { onDeleted?: () => void }) {
  return (
    <ConfirmDeleteDialog
      heading="Hapus pengiriman?"
      confirmLabel="Hapus pengiriman"
      onConfirm={() => removeShipment(shipment.id)}
      {...props}
    >
      Hapus {shipment.code}? Stok dan total pengiriman akan disesuaikan.
    </ConfirmDeleteDialog>
  );
}
