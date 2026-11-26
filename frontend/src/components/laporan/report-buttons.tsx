"use client";

import { Button, Modal } from "@heroui/react";
import { ArrowLeft, Check, Copy, FileText, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateReportAction } from "@/app/(app)/laporan/actions";
import { useCanEdit } from "@/components/ui/editor-only";
import { LinkButton } from "@/components/ui/link-button";
import { OptionSelect } from "@/components/ui/option-select";

/** Runs Generate Laporan and opens the saved report. */
export function useGenerateReport() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const generate = (disasterId: string) =>
    startTransition(async () => {
      setError(undefined);
      const result = await generateReportAction(disasterId);
      if (result.status === "success") router.push(`/laporan/${result.id}`);
      else if (result.status === "error") setError(result.message);
    });
  return { generate, error, isPending };
}

/** "Generate laporan" for one disaster (KF-10.1), on the disaster detail page. Staff only. */
export function GenerateReportButton({ disasterId }: { disasterId: string }) {
  const canEdit = useCanEdit();
  const { generate, error, isPending } = useGenerateReport();
  if (!canEdit) return null;
  return (
    <>
      <Button variant="outline" onPress={() => generate(disasterId)} isPending={isPending}>
        <FileText aria-hidden className="size-4" />
        Generate laporan
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/** Generate laporan with a disaster picker, on the Laporan page (design overlay "Generate laporan"). */
export function GenerateReportDialogButton({ disasters }: { disasters: { id: string; label: string }[] }) {
  const canEdit = useCanEdit();
  const [isOpen, setIsOpen] = useState(false);
  const [disasterId, setDisasterId] = useState("");
  const { generate, error, isPending } = useGenerateReport();
  if (!canEdit) return null;
  return (
    <>
      <Button onPress={() => setIsOpen(true)}>
        <FileText aria-hidden className="size-4" />
        Generate laporan
      </Button>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <span className="flex size-10 items-center justify-center rounded-full bg-default">
                <FileText aria-hidden className="size-5" />
              </span>
              <Modal.Heading>Generate laporan</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                Laporan memuat data satu bencana saat ini dan tersimpan apa adanya. Stok dan kas tidak berubah.
              </p>
              <OptionSelect
                name="disasterId"
                label="Bencana"
                placeholder="Pilih bencana"
                options={disasters.map((d) => [d.id, d.label])}
                value={disasterId || undefined}
                onChange={setDisasterId}
              />
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                Batal
              </Button>
              <Button isDisabled={!disasterId} isPending={isPending} onPress={() => generate(disasterId)}>
                <Check aria-hidden className="size-4" />
                Generate
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}

/** Kembali / Cetak / Salin on a saved report (UC-13). Hidden when printing. */
export function ReportActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <LinkButton href="/laporan" variant="outline">
        <ArrowLeft aria-hidden className="size-4" />
        Kembali
      </LinkButton>
      <Button variant="outline" onPress={() => window.print()}>
        <Printer aria-hidden className="size-4" />
        Cetak
      </Button>
      <Button
        variant="outline"
        onPress={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
        {copied ? "Tersalin" : "Salin laporan"}
      </Button>
    </div>
  );
}
