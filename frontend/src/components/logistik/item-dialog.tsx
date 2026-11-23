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
  TextField,
} from "@heroui/react";
import { Check, Package } from "lucide-react";
import { useActionState, useState } from "react";
import { saveItem } from "@/app/(app)/logistik/actions";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionState } from "@/lib/action-state";
import { itemCategoryLabel, needTypeLabel } from "@/lib/labels";
import { defaultNeedType, ITEM_CATEGORIES, NEED_TYPES } from "@/lib/options";
import { submitAction } from "@/lib/submit-action";
import type { ItemCategory, NeedType } from "@/lib/types";

export interface ItemFormValues {
  id: string;
  name: string;
  category: ItemCategory;
  stockUnit: string;
  initialStock: number;
  needRatio: number | null;
  needType: NeedType | null;
  ratioBasis: string;
  /** YYYY-MM-DD */
  expirationDate: string | null;
}

interface ItemDialogProps {
  /** Omit to register a new item. */
  item?: ItemFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Tambah / Ubah barang logistik (designs 04C / 04D, UC-07). */
export function ItemDialog({ item, isOpen, onOpenChange }: ItemDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="outside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <Package aria-hidden className="size-5" />
            </span>
            <Modal.Heading>{item ? "Ubah barang logistik" : "Tambah barang logistik"}</Modal.Heading>
          </Modal.Header>
          {isOpen && <ItemForm item={item} onSaved={() => onOpenChange(false)} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ItemForm({ item, onSaved }: { item?: ItemFormValues; onSaved: () => void }) {
  const [category, setCategory] = useState<ItemCategory | "">(item?.category ?? "");
  const [needType, setNeedType] = useState<NeedType | "">(item?.needType ?? "");
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveItem(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;

  return (
    <I18nProvider locale="id-ID">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
        <input type="hidden" name="id" value={item?.id ?? ""} />
        <Modal.Body className="flex flex-col gap-4">
          {error && !error.fieldErrors && (
            <AlertRoot status="danger">
              <AlertIndicator />
              <AlertContent>
                <AlertDescription>{error.message}</AlertDescription>
              </AlertContent>
            </AlertRoot>
          )}

          <h3 className="text-sm leading-6 font-medium">Identitas barang</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="name" isRequired maxLength={150} defaultValue={item?.name} className="sm:col-span-2">
              <Label>Nama barang</Label>
              <Input placeholder="Contoh: Beras" />
              <FieldError />
            </TextField>
            <OptionSelect
              name="category"
              label="Kategori"
              placeholder="Pilih kategori"
              options={ITEM_CATEGORIES.map((c) => [c, itemCategoryLabel[c]])}
              value={category || undefined}
              onChange={(c) => {
                setCategory(c);
                // Follow the category's default until the user picks a need type (KF-04.1).
                if (!needType || needType === defaultNeedType(category || c)) setNeedType(defaultNeedType(c));
              }}
            />
            <TextField name="stockUnit" isRequired maxLength={50} defaultValue={item?.stockUnit}>
              <Label>Satuan stok</Label>
              <Input placeholder="kg, unit, paket…" />
              <FieldError />
            </TextField>
            <NumberField
              name="initialStock"
              isRequired
              minValue={0}
              formatOptions={{ maximumFractionDigits: 0 }}
              defaultValue={item?.initialStock ?? 0}
            >
              <Label>Stok awal</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
              <Description>
                {item ? "Perubahan dicatat sebagai koreksi stok." : "Bilangan bulat, boleh 0."}
              </Description>
              <FieldError />
            </NumberField>
            {category === "PANGAN" && (
              <TextField name="expirationDate" defaultValue={item?.expirationDate ?? ""}>
                <Label>Tanggal kedaluwarsa</Label>
                <Input type="date" />
                <Description>Opsional. Pangan yang kedaluwarsa tidak dapat dikirim.</Description>
                <FieldError />
              </TextField>
            )}
          </div>

          <h3 className="text-sm leading-6 font-medium">Rasio kebutuhan</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumberField
              name="needRatio"
              minValue={0}
              formatOptions={{ maximumFractionDigits: 6 }}
              defaultValue={item?.needRatio ?? undefined}
            >
              <Label>Rasio per orang</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="Contoh: 0,5" />
              </NumberField.Group>
              <Description>Kosongkan jika barang tidak punya rekomendasi.</Description>
              <FieldError />
            </NumberField>
            <OptionSelect
              name="needType"
              label="Jenis kebutuhan"
              placeholder="Pilih jenis kebutuhan"
              options={NEED_TYPES.map((t) => [t, needTypeLabel[t]])}
              value={needType || undefined}
              onChange={setNeedType}
            />
            <TextField name="ratioBasis" maxLength={50} defaultValue={item?.ratioBasis} className="sm:col-span-2">
              <Label>Dasar rasio</Label>
              <Input placeholder="Contoh: orang/hari" />
              <Description>Harian dihitung untuk 30 hari, satu kali tidak dikalikan.</Description>
              <FieldError />
            </TextField>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button slot="close" variant="tertiary">
            Batal
          </Button>
          <Button type="submit" isPending={isPending}>
            <Check aria-hidden className="size-4" />
            {item ? "Simpan perubahan" : "Simpan barang"}
          </Button>
        </Modal.Footer>
      </Form>
    </I18nProvider>
  );
}
