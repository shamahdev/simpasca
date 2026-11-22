"use client";

import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  Button,
  FieldError,
  Form,
  I18nProvider,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  TextField,
} from "@heroui/react";
import { Check, Plus, Trash2, Truck } from "lucide-react";
import { useActionState, useState } from "react";
import { saveShipment } from "@/app/(app)/distribusi/actions";
import type { ActionState } from "@/lib/action-state";
import { formatNumber, todayIsoDate } from "@/lib/format";
import { submitAction } from "@/lib/submit-action";

export interface ShipmentFormValues {
  id: string;
  disasterId: string;
  shippedAt: string;
  destination: string;
  personInCharge: string;
  items: { itemId: string; quantity: number }[];
}

/** Choices for the form, prepared on the server. */
export interface ShipmentFormOptions {
  disasters: { id: string; label: string }[];
  items: { id: string; name: string; unit: string; stock: number; foodExpiresOn: string | null }[];
  /** Recommendation per disaster and item; null = no ratio (KF-04.2). */
  recommendations: Record<string, Record<string, number | null>>;
}

interface ShipmentDialogProps {
  /** Omit to create a new shipment. */
  shipment?: ShipmentFormValues;
  options: ShipmentFormOptions;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Buat / Ubah pengiriman (designs 06C / 06D, UC-09). */
export function ShipmentDialog({ shipment, options, isOpen, onOpenChange }: ShipmentDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="outside">
        <Modal.Dialog className="max-w-3xl">
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <Truck aria-hidden className="size-5" />
            </span>
            <Modal.Heading>{shipment ? "Ubah pengiriman" : "Buat pengiriman"}</Modal.Heading>
          </Modal.Header>
          {isOpen && (
            <ShipmentForm
              shipment={shipment}
              options={options}
              onSaved={() => onOpenChange(false)}
            />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

interface Row {
  key: string;
  itemId: string;
  quantity: number;
}

function ShipmentForm({
  shipment,
  options,
  onSaved,
}: {
  shipment?: ShipmentFormValues;
  options: ShipmentFormOptions;
  onSaved: () => void;
}) {
  // One key per opened form: double clicks and resubmits reuse it (AB-03.4).
  const [requestKey] = useState(() => crypto.randomUUID());
  const [disasterId, setDisasterId] = useState(shipment?.disasterId ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    shipment
      ? shipment.items.map((i) => ({ key: crypto.randomUUID(), ...i }))
      : [{ key: crypto.randomUUID(), itemId: "", quantity: NaN }],
  );
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveShipment(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;

  const itemById = new Map(options.items.map((i) => [i.id, i]));
  const today = todayIsoDate();
  const isExpired = (i: ShipmentFormOptions["items"][number]) =>
    i.foodExpiresOn !== null && i.foodExpiresOn < today;
  const ownQuantity = (itemId: string) =>
    shipment?.items.find((i) => i.itemId === itemId)?.quantity ?? 0;
  const updateRow = (key: string, change: Partial<Row>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...change } : r)));

  return (
    <I18nProvider locale="id-ID">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
        <input type="hidden" name="id" value={shipment?.id ?? ""} />
        <input type="hidden" name="requestKey" value={requestKey} />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(rows.map(({ itemId, quantity }) => ({ itemId, quantity: Number.isNaN(quantity) ? "" : quantity })))}
        />

        <Modal.Body className="flex flex-col gap-4">
          {error && (!error.fieldErrors || error.fieldErrors.items) && (
            <AlertRoot status="danger">
              <AlertIndicator />
              <AlertContent>
                <AlertDescription>{error.fieldErrors?.items ?? error.message}</AlertDescription>
              </AlertContent>
            </AlertRoot>
          )}

          <h3 className="text-sm leading-6 font-medium">Tujuan pengiriman</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              name="disasterId"
              isRequired
              placeholder="Pilih bencana"
              value={disasterId || null}
              onChange={(key) => setDisasterId(String(key))}
            >
              <Label>Bencana</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <FieldError />
              <Select.Popover>
                <ListBox>
                  {options.disasters.map((d) => (
                    <ListBox.Item key={d.id} id={d.id} textValue={d.label}>
                      {d.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField name="shippedAt" isRequired defaultValue={shipment?.shippedAt ?? todayIsoDate()}>
              <Label>Tanggal pengiriman</Label>
              <Input type="date" />
              <FieldError />
            </TextField>
            <TextField name="destination" isRequired maxLength={200} defaultValue={shipment?.destination}>
              <Label>Lokasi tujuan</Label>
              <Input placeholder="Posko Dayeuhkolot" />
              <FieldError />
            </TextField>
            <TextField name="personInCharge" isRequired maxLength={120} defaultValue={shipment?.personInCharge}>
              <Label>Penanggung jawab</Label>
              <Input placeholder="Nama petugas" />
              <FieldError />
            </TextField>
          </div>

          <h3 className="text-sm leading-6 font-medium">Barang yang dikirim</h3>
          <div role="table" aria-label="Barang yang dikirim" className="flex flex-col gap-2">
            <div role="row" className="hidden grid-cols-[minmax(0,1fr)_110px_110px_140px_40px] gap-3 px-1 text-xs text-muted sm:grid">
              <span role="columnheader">Barang</span>
              <span role="columnheader" className="text-right">Stok tersedia</span>
              <span role="columnheader" className="text-right">Rekomendasi</span>
              <span role="columnheader">Jumlah kirim</span>
              <span role="columnheader" className="sr-only">Aksi</span>
            </div>
            {rows.map((row, index) => {
              const item = itemById.get(row.itemId);
              const stock = item ? item.stock + ownQuantity(item.id) : null;
              const recommendation = item ? options.recommendations[disasterId]?.[item.id] : undefined;
              return (
                <div
                  key={row.key}
                  role="row"
                  className="grid grid-cols-1 items-center gap-3 rounded-2xl bg-surface-secondary p-2 sm:grid-cols-[minmax(0,1fr)_110px_110px_140px_40px]"
                >
                  <Select
                    aria-label={`Barang baris ${index + 1}`}
                    placeholder="Pilih barang"
                    value={row.itemId || null}
                    onChange={(key) => updateRow(row.key, { itemId: String(key) })}
                    disabledKeys={options.items.filter(isExpired).map((i) => i.id)}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {options.items.map((i) => (
                          <ListBox.Item key={i.id} id={i.id} textValue={i.name}>
                            {`${i.name} · ${i.unit}${isExpired(i) ? " (kedaluwarsa)" : ""}`}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  <span role="cell" className="text-right text-sm">
                    {stock === null ? "—" : formatNumber(stock)}
                  </span>
                  <span role="cell" className="text-right text-sm text-muted">
                    {recommendation === undefined
                      ? "—"
                      : recommendation === null
                        ? "Tanpa rasio"
                        : formatNumber(recommendation)}
                  </span>
                  <NumberField
                    aria-label={`Jumlah kirim baris ${index + 1}`}
                    minValue={1}
                    formatOptions={{ maximumFractionDigits: 0 }}
                    value={row.quantity}
                    onChange={(quantity) => updateRow(row.key, { quantity })}
                  >
                    <NumberField.Group>
                      <NumberField.Input placeholder="0" />
                    </NumberField.Group>
                  </NumberField>
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={`Hapus baris ${index + 1}`}
                    isDisabled={rows.length === 1}
                    onPress={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onPress={() =>
                setRows((current) => [...current, { key: crypto.randomUUID(), itemId: "", quantity: NaN }])
              }
            >
              <Plus aria-hidden className="size-4" />
              Tambah barang
            </Button>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button slot="close" variant="tertiary">
            Batal
          </Button>
          <Button type="submit" isPending={isPending}>
            <Check aria-hidden className="size-4" />
            {shipment ? "Simpan perubahan" : "Catat pengiriman"}
          </Button>
        </Modal.Footer>
      </Form>
    </I18nProvider>
  );
}
