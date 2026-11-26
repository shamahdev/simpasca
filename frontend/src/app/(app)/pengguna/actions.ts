"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { requireSuperadmin } from "@/lib/auth";
import { createUser, deleteUser, updateUser } from "@/lib/data/users";

/** Tambah / Ubah akun (UC-02, superadmin only). */
export async function saveUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireSuperadmin();
    const id = field(formData, "id");
    const input = {
      name: field(formData, "name"),
      username: field(formData, "username"),
      role: field(formData, "role"),
      password: field(formData, "password"),
    };
    const saved = id ? await updateUser(id, input, actor) : await createUser(input);
    revalidatePath("/pengguna");
    return { status: "success", id: String(saved.id) };
  } catch (error) {
    return errorState(error);
  }
}

export async function removeUser(id: string): Promise<ActionState> {
  try {
    await deleteUser(id, await requireSuperadmin());
    revalidatePath("/pengguna");
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
