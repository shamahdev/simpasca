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
import { Check, MapPin } from "lucide-react";
import { useActionState, useState } from "react";
import { saveDisaster } from "@/app/(app)/bencana/actions";
import type { ActionState } from "@/lib/action-state";
import { handlingScaleLabel, handlingStatusLabel } from "@/lib/labels";
import { DISASTER_TYPES, HANDLING_SCALES, HANDLING_STATUSES } from "@/lib/options";
import { regions } from "@/lib/regions";
import type { HandlingScale, HandlingStatus } from "@/lib/types";
import { submitAction } from "@/lib/submit-action";

export interface DisasterFormValues {
  id: string;
  disasterType: string;
  status: HandlingStatus;
  province: string;
  regencyCity: string;
  latitude: number | null;
  longitude: number | null;
  /** YYYY-MM-DDTHH:mm in WIB */
  occurredAtLocal: string;
  handlingScale: HandlingScale;
  affectedPeople: number;
  affectedHouseholds: number | null;
  locationDetails: string;
  impactNotes: string;
}

interface DisasterDialogProps {
  /** Omit to create a new disaster. */
  disaster?: DisasterFormValues;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/** Tambah / Ubah data bencana (designs 03C / 03D). */
export function DisasterDialog({ disaster, isOpen, onOpenChange }: DisasterDialogProps) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="lg" scroll="outside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <MapPin aria-hidden className="size-5" />
            </span>
            <Modal.Heading>
              {disaster ? "Ubah data bencana" : "Tambah data bencana"}
            </Modal.Heading>
          </Modal.Header>
          {isOpen && (
            <DisasterForm disaster={disaster} onSaved={() => onOpenChange(false)} />
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

const nowInJakarta = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 16).replace(" ", "T");

function OptionSelect<T extends string>({
  name,
  label,
  placeholder,
  options,
  defaultValue,
  value,
  onChange,
  isRequired = true,
}: {
  name: string;
  label: string;
  placeholder: string;
  options: [T, string][];
  defaultValue?: T;
  value?: T;
  onChange?: (value: T) => void;
  isRequired?: boolean;
}) {
  return (
    <Select
      name={name}
      isRequired={isRequired}
      placeholder={placeholder}
      defaultValue={defaultValue}
      {...(onChange && { value: value ?? null, onChange: (key) => onChange(key as T) })}
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <FieldError />
      <Select.Popover>
        <ListBox>
          {options.map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function DisasterForm({
  disaster,
  onSaved,
}: {
  disaster?: DisasterFormValues;
  onSaved: () => void;
}) {
  const [province, setProvince] = useState(disaster?.province ?? "");
  const [regencyCity, setRegencyCity] = useState(disaster?.regencyCity ?? "");
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveDisaster(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;

  return (
    <I18nProvider locale="id-ID">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
        <input type="hidden" name="id" value={disaster?.id ?? ""} />
        <Modal.Body className="flex flex-col gap-4">
          <h3 className="text-sm leading-6 font-medium">Identitas kejadian</h3>
          {error && !error.fieldErrors && (
            <AlertRoot status="danger">
              <AlertIndicator />
              <AlertContent>
                <AlertDescription>{error.message}</AlertDescription>
              </AlertContent>
            </AlertRoot>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <OptionSelect
              name="disasterType"
              label="Jenis bencana"
              placeholder="Pilih jenis bencana"
              options={DISASTER_TYPES.map((t) => [t, t])}
              defaultValue={disaster?.disasterType}
            />
            <OptionSelect
              name="status"
              label="Status penanganan"
              placeholder="Pilih status"
              options={HANDLING_STATUSES.map((s) => [s, handlingStatusLabel[s]])}
              defaultValue={disaster?.status ?? "AKTIF"}
            />
            <OptionSelect
              name="province"
              label="Provinsi"
              placeholder="Pilih provinsi"
              options={Object.keys(regions).map((p) => [p, p])}
              value={province}
              onChange={(p) => {
                setProvince(p);
                setRegencyCity("");
              }}
            />
            <OptionSelect
              name="regencyCity"
              label="Kabupaten/Kota"
              placeholder={province ? "Pilih kabupaten/kota" : "Pilih provinsi dahulu"}
              options={(regions[province] ?? []).map((r) => [r.name, r.name])}
              value={regencyCity}
              onChange={setRegencyCity}
            />
            <NumberField
              name="latitude"
              defaultValue={disaster?.latitude ?? undefined}
              formatOptions={{ maximumFractionDigits: 6 }}
            >
              <Label>Lintang</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="Contoh: −7,0253" />
              </NumberField.Group>
              <FieldError />
            </NumberField>
            <NumberField
              name="longitude"
              defaultValue={disaster?.longitude ?? undefined}
              formatOptions={{ maximumFractionDigits: 6 }}
            >
              <Label>Bujur</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="Contoh: 107,5198" />
              </NumberField.Group>
              <FieldError />
            </NumberField>
            <TextField
              name="occurredAt"
              isRequired
              defaultValue={disaster?.occurredAtLocal ?? nowInJakarta()}
            >
              <Label>Tanggal dan waktu kejadian</Label>
              <Input type="datetime-local" />
              <Description>Waktu Indonesia Barat (WIB)</Description>
              <FieldError />
            </TextField>
            <OptionSelect
              name="handlingScale"
              label="Skala penanganan"
              placeholder="Pilih skala"
              options={HANDLING_SCALES.map((s) => [s, handlingScaleLabel[s]])}
              defaultValue={disaster?.handlingScale}
            />
            <NumberField
              name="affectedPeople"
              isRequired
              minValue={0}
              formatOptions={{ maximumFractionDigits: 0 }}
              defaultValue={disaster?.affectedPeople}
            >
              <Label>Penduduk terdampak</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="0" />
              </NumberField.Group>
              <Description>Bilangan bulat, minimal 0</Description>
              <FieldError />
            </NumberField>
            <NumberField
              name="affectedHouseholds"
              minValue={0}
              formatOptions={{ maximumFractionDigits: 0 }}
              defaultValue={disaster?.affectedHouseholds ?? undefined}
            >
              <Label>Kepala keluarga terdampak</Label>
              <NumberField.Group>
                <NumberField.Input placeholder="Opsional" />
              </NumberField.Group>
              <FieldError />
            </NumberField>
          </div>

          <TextField name="locationDetails" maxLength={500} defaultValue={disaster?.locationDetails}>
            <Label>Keterangan tambahan lokasi</Label>
            <Input placeholder="Kecamatan, desa, atau penanda lokasi" />
            <FieldError />
          </TextField>
          <TextField name="impactNotes" maxLength={2000} defaultValue={disaster?.impactNotes}>
            <Label>Catatan dampak</Label>
            <TextArea
              rows={4}
              placeholder="Tuliskan kronologi, dampak, dan kerusakan yang dilaporkan…"
            />
            <Description>Maks. 2000 karakter.</Description>
            <FieldError />
          </TextField>
        </Modal.Body>

        <Modal.Footer>
          <Button slot="close" variant="tertiary">
            Batal
          </Button>
          <Button type="submit" isPending={isPending}>
            <Check aria-hidden className="size-4" />
            {disaster ? "Simpan perubahan" : "Simpan bencana"}
          </Button>
        </Modal.Footer>
      </Form>
    </I18nProvider>
  );
}
