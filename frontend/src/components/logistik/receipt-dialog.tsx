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
  Modal,
  NumberField,
  TextArea,
  TextField,
} from "@heroui/react";
import { Check, PackagePlus } from "lucide-react";
import { useActionState, useState } from "react";
import { saveReceipt } from "@/app/(app)/logistik/actions";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionState } from "@/lib/action-state";
import { todayIsoDate } from "@/lib/format";
import { ITEM_CONDITIONS } from "@/lib/options";
import { submitAction } from "@/lib/submit-action";

export interface ReceiptFormValues {
  id: string;
  itemId: string;
  quantity: number;
  /** YYYY-MM-DD */
  receiptDate: string;
  sourceGiver: string;
  itemCondition: string;
  notes: string;
}

export interface ReceiptItemOption {
  id: string;
  name: string;
  unit: string;
}

interface ReceiptDialogProps {
  items: ReceiptItemOption[];
  /** Omit to record a new receipt. */
  receipt?: ReceiptFormValues;
  /** Preselected item for a new receipt (from an item's detail page). */
  itemId?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Catat / Koreksi penerimaan barang (UC-08, KF-06.1). */
export function ReceiptDialog({ items, receipt, itemId, isOpen, onOpenChange }: ReceiptDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="md" scroll="outside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <PackagePlus aria-hidden className="size-5" />
            </span>
            <Modal.Heading>{receipt ? "Koreksi penerimaan" : "Catat penerimaan"}</Modal.Heading>
          </Modal.Header>
          {isOpen && (
            <ReceiptForm
              items={items}
              receipt={receipt}
              itemId={itemId}
              onSaved={() => onOpenChange(false)}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ReceiptForm({
  items,
  receipt,
  itemId,
  onSaved,
}: Pick<ReceiptDialogProps, "items" | "receipt" | "itemId"> & { onSaved: () => void }) {
  // One key per opened form: double clicks and resubmits reuse it (AC-19).
  const [requestKey] = useState(() => crypto.randomUUID());
  const [selected, setSelected] = useState(receipt?.itemId ?? itemId ?? "");
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveReceipt(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;
  const today = todayIsoDate();
  const unit = items.find((i) => i.id === selected)?.unit;

  return (
    <I18nProvider locale="id-ID">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
        <input type="hidden" name="id" value={receipt?.id ?? ""} />
        <input type="hidden" name="requestKey" value={requestKey} />
        {/* A disabled select is not submitted; the item of an existing receipt cannot change. */}
        {receipt && <input type="hidden" name="itemId" value={receipt.itemId} />}
        <Modal.Body className="flex flex-col gap-4">
          {error && !error.fieldErrors && (
            <AlertRoot status="danger">
              <AlertIndicator />
              <AlertContent>
                <AlertDescription>{error.message}</AlertDescription>
              </AlertContent>
            </AlertRoot>
          )}
          <OptionSelect
            name="itemId"
            label="Barang"
            placeholder="Pilih barang"
            options={items.map((i) => [i.id, `${i.name} · ${i.unit}`])}
            value={selected || undefined}
            onChange={setSelected}
            isDisabled={Boolean(receipt)}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              name="quantity"
              isRequired
              minValue={1}
              formatOptions={{ maximumFractionDigits: 0 }}
              defaultValue={receipt?.quantity}
            >
              <Label>{unit ? `Jumlah (${unit})` : "Jumlah"}</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="0" />
              </NumberField.Group>
              {receipt && <Description>Selisihnya dicatat sebagai koreksi stok.</Description>}
              <FieldError />
            </NumberField>
            <TextField name="receiptDate" isRequired defaultValue={receipt?.receiptDate ?? today}>
              <Label>Tanggal penerimaan</Label>
              <Input type="date" max={today} />
              <FieldError />
            </TextField>
            <TextField name="sourceGiver" isRequired maxLength={150} defaultValue={receipt?.sourceGiver}>
              <Label>Sumber / pemberi</Label>
              <Input placeholder="Contoh: Donasi PT Sejahtera" />
              <FieldError />
            </TextField>
            <OptionSelect
              name="itemCondition"
              label="Kondisi barang"
              placeholder="Pilih kondisi"
              options={ITEM_CONDITIONS.map((c) => [c, c])}
              defaultValue={receipt?.itemCondition ?? "Baik"}
            />
          </div>
          <TextField name="notes" maxLength={1000} defaultValue={receipt?.notes}>
            <Label>Catatan</Label>
            <TextArea rows={2} placeholder="Opsional" />
            <FieldError />
          </TextField>
        </Modal.Body>
        <Modal.Footer>
          <Button slot="close" variant="tertiary">
            Batal
          </Button>
          <Button type="submit" isPending={isPending}>
            <Check aria-hidden className="size-4" />
            {receipt ? "Simpan koreksi" : "Catat penerimaan"}
          </Button>
        </Modal.Footer>
      </Form>
    </I18nProvider>
  );
}
