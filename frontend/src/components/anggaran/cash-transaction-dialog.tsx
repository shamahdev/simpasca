"use client";

import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  Button,
  Description,
  FieldError,
  Form,
  I18nProvider,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  TextArea,
  TextField,
} from "@heroui/react";
import { Check, Wallet } from "lucide-react";
import { useActionState, useState } from "react";
import {
  saveCashTransaction,
  type CashActionState,
} from "@/app/(app)/anggaran/actions";
import { cashTypeLabel } from "@/lib/labels";
import { todayIsoDate } from "@/lib/format";
import type { CashTransaction, CashTransactionType } from "@/lib/types";
import { submitAction } from "@/lib/submit-action";

export type CashFormValues = Pick<
  CashTransaction,
  "id" | "type" | "amount" | "description" | "transactionDate"
>;

interface CashTransactionDialogProps {
  /** Omit to create a new transaction. */
  transaction?: CashFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Tambah / Ubah transaksi kas dialog (design 05C / 05D). */
export function CashTransactionDialog({
  transaction,
  isOpen,
  onOpenChange,
}: CashTransactionDialogProps) {
  const isEdit = Boolean(transaction);

  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container>
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <Wallet aria-hidden className="size-5" />
            </span>
            <Modal.Heading>
              {isEdit ? "Ubah transaksi kas" : "Tambah transaksi kas"}
            </Modal.Heading>
          </Modal.Header>
          {/* Mounted per opening, so each opening gets a fresh request key. */}
          {isOpen && (
            <CashTransactionForm
              transaction={transaction}
              onSaved={() => onOpenChange(false)}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function CashTransactionForm({
  transaction,
  onSaved,
}: {
  transaction?: CashFormValues;
  onSaved: () => void;
}) {
  // One key per opened form: double clicks and resubmits reuse it (AB-03.4).
  const [requestKey] = useState(() => crypto.randomUUID());
  const [state, formAction, isPending] = useActionState(
    async (prev: CashActionState, formData: FormData) => {
      const result = await saveCashTransaction(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;

  return (
    <I18nProvider locale="id-ID">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
        <input type="hidden" name="id" value={transaction?.id ?? ""} />
        <input type="hidden" name="requestKey" value={requestKey} />

        <Modal.Body className="flex flex-col gap-4">
          <h3 className="text-sm leading-6 font-medium">Informasi transaksi</h3>

          {error && !error.fieldErrors && (
            <AlertRoot status="danger">
              <AlertIndicator />
              <AlertContent>
                <AlertDescription>{error.message}</AlertDescription>
              </AlertContent>
            </AlertRoot>
          )}

          <Select
            name="type"
            isRequired
            placeholder="Pilih jenis transaksi"
            defaultValue={transaction?.type}
          >
            <Label>Jenis transaksi</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <FieldError />
            <Select.Popover>
              <ListBox>
                {(Object.keys(cashTypeLabel) as CashTransactionType[]).map(
                  (type) => (
                    <ListBox.Item key={type} id={type} textValue={cashTypeLabel[type]}>
                      {cashTypeLabel[type]}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ),
                )}
              </ListBox>
            </Select.Popover>
          </Select>

          <NumberField
            name="amount"
            isRequired
            minValue={0.01}
            formatOptions={{ maximumFractionDigits: 2 }}
            defaultValue={transaction?.amount}
          >
            <Label>Nominal (Rp)</Label>
            <NumberField.Group>
              <NumberField.Input placeholder="12.500.000" />
            </NumberField.Group>
            <Description>Masukkan nominal positif dalam rupiah</Description>
            <FieldError />
          </NumberField>

          <TextField
            name="transactionDate"
            isRequired
            defaultValue={transaction?.transactionDate ?? todayIsoDate()}
          >
            <Label>Tanggal transaksi</Label>
            <Input type="date" />
            <FieldError />
          </TextField>

          <TextField
            name="description"
            isRequired
            maxLength={1000}
            defaultValue={transaction?.description}
          >
            <Label>Keterangan</Label>
            <TextArea
              rows={3}
              placeholder="Pembelian beras untuk kebutuhan bantuan"
            />
            <Description>Maks. 1000 karakter.</Description>
            <FieldError />
          </TextField>
        </Modal.Body>

        <Modal.Footer>
          <Button slot="close" variant="tertiary">
            Batal
          </Button>
          <Button type="submit" isPending={isPending}>
            <Check aria-hidden className="size-4" />
            {transaction ? "Simpan perubahan" : "Simpan transaksi"}
          </Button>
        </Modal.Footer>
      </Form>
    </I18nProvider>
  );
}
