"use client";

import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  Button,
  Chip,
  Description,
  Dropdown,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Table,
  TextField,
} from "@heroui/react";
import { Check, Ellipsis, Pencil, Plus, Trash2, UserCog } from "lucide-react";
import { useActionState, useState } from "react";
import { removeUser, saveUser } from "@/app/(app)/pengguna/actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { OptionSelect } from "@/components/ui/option-select";
import type { ActionState } from "@/lib/action-state";
import { submitAction } from "@/lib/submit-action";
import type { UserRole } from "@/lib/types";

export interface UserRow {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  createdText: string;
  isSelf: boolean;
}

const roleLabel: Record<UserRole, string> = { PETUGAS: "Petugas", SUPERADMIN: "Superadmin" };

/** Kelola akun petugas (UC-02, KF-01.4): superadmin only, checked again by the server actions. */
export function UserManager({ rows }: { rows: UserRow[] }) {
  const [target, setTarget] = useState<UserRow>();
  const [openDialog, setOpenDialog] = useState<"new" | "edit" | "delete">();
  const close = (open: boolean) => !open && setOpenDialog(undefined);

  return (
    <section className="flex flex-col gap-4">
      <Button className="self-end" onPress={() => setOpenDialog("new")}>
        <Plus aria-hidden className="size-4" />
        Tambah akun
      </Button>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Akun pengguna">
            <Table.Header>
              <Table.Column isRowHeader>Nama</Table.Column>
              <Table.Column>Nama pengguna</Table.Column>
              <Table.Column className="w-[140px]">Peran</Table.Column>
              <Table.Column className="w-[160px]">Dibuat</Table.Column>
              <Table.Column className="w-16">Aksi</Table.Column>
            </Table.Header>
            <Table.Body renderEmptyState={() => "Belum ada akun."}>
              {rows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  <Table.Cell>
                    {row.name}
                    {row.isSelf && <span className="text-muted"> (Anda)</span>}
                  </Table.Cell>
                  <Table.Cell>{row.username}</Table.Cell>
                  <Table.Cell>
                    <Chip size="sm" variant="soft" color={row.role === "SUPERADMIN" ? "accent" : "default"}>
                      {roleLabel[row.role] ?? row.role}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>{row.createdText}</Table.Cell>
                  <Table.Cell>
                    <Dropdown>
                      <Button variant="ghost" size="sm" isIconOnly aria-label={`Aksi untuk ${row.name}`}>
                        <Ellipsis aria-hidden className="size-4" />
                      </Button>
                      <Dropdown.Popover>
                        <Dropdown.Menu
                          disabledKeys={row.isSelf ? ["delete"] : []}
                          onAction={(key) => {
                            setTarget(row);
                            setOpenDialog(key === "edit" ? "edit" : "delete");
                          }}
                        >
                          <Dropdown.Item id="edit" textValue="Ubah akun">
                            <Pencil aria-hidden className="size-4" />
                            <Label>Ubah akun</Label>
                          </Dropdown.Item>
                          <Dropdown.Item id="delete" textValue="Hapus" variant="danger">
                            <Trash2 aria-hidden className="size-4" />
                            <Label>Hapus</Label>
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown.Popover>
                    </Dropdown>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>

      <UserDialog isOpen={openDialog === "new"} onOpenChange={close} />
      {target && (
        <>
          <UserDialog user={target} isOpen={openDialog === "edit"} onOpenChange={close} />
          <ConfirmDeleteDialog
            heading="Hapus akun?"
            confirmLabel="Hapus akun"
            onConfirm={() => removeUser(target.id)}
            isOpen={openDialog === "delete"}
            onOpenChange={close}
          >
            Hapus akun {target.name} ({target.username})? Akun yang sudah tercatat sebagai pelaku pada data lain
            tidak dapat dihapus; ganti kata sandinya untuk mencabut akses.
          </ConfirmDeleteDialog>
        </>
      )}
    </section>
  );
}

function UserDialog({
  user,
  isOpen,
  onOpenChange,
}: {
  user?: UserRow;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <span className="flex size-10 items-center justify-center rounded-full bg-default">
              <UserCog aria-hidden className="size-5" />
            </span>
            <Modal.Heading>{user ? "Ubah akun" : "Tambah akun"}</Modal.Heading>
          </Modal.Header>
          {isOpen && <UserForm user={user} onSaved={() => onOpenChange(false)} />}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function UserForm({ user, onSaved }: { user?: UserRow; onSaved: () => void }) {
  const [state, formAction, isPending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveUser(prev, formData);
      if (result.status === "success") onSaved();
      return result;
    },
    { status: "idle" },
  );
  const error = state.status === "error" ? state : undefined;

  return (
    <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors}>
      <input type="hidden" name="id" value={user?.id ?? ""} />
      <Modal.Body className="flex flex-col gap-4">
        {error && !error.fieldErrors && (
          <AlertRoot status="danger">
            <AlertIndicator />
            <AlertContent>
              <AlertDescription>{error.message}</AlertDescription>
            </AlertContent>
          </AlertRoot>
        )}
        <TextField name="name" isRequired maxLength={150} defaultValue={user?.name}>
          <Label>Nama lengkap</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField name="username" isRequired maxLength={100} defaultValue={user?.username} autoComplete="off">
          <Label>Nama pengguna</Label>
          <Input />
          <FieldError />
        </TextField>
        <OptionSelect
          name="role"
          label="Peran"
          placeholder="Pilih peran"
          options={[
            ["PETUGAS", "Petugas BNPB"],
            ["SUPERADMIN", "Superadmin"],
          ]}
          defaultValue={user?.role ?? "PETUGAS"}
        />
        <TextField
          name="password"
          type="password"
          isRequired={!user}
          minLength={12}
          maxLength={256}
          autoComplete="new-password"
        >
          <Label>{user ? "Kata sandi baru" : "Kata sandi"}</Label>
          <Input />
          <Description>
            {user ? "Kosongkan jika tidak diubah. Minimal 12 karakter." : "Minimal 12 karakter."}
          </Description>
          <FieldError />
        </TextField>
      </Modal.Body>
      <Modal.Footer>
        <Button slot="close" variant="tertiary">
          Batal
        </Button>
        <Button type="submit" isPending={isPending}>
          <Check aria-hidden className="size-4" />
          {user ? "Simpan perubahan" : "Simpan akun"}
        </Button>
      </Modal.Footer>
    </Form>
  );
}
