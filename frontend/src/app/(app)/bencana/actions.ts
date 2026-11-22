"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import {
  createDisaster,
  deleteDisaster,
  updateDisaster,
  type DisasterInput,
} from "@/lib/data/disasters";

const FIELDS: (keyof DisasterInput)[] = [
  "disasterType",
  "status",
  "province",
  "regencyCity",
  "latitude",
  "longitude",
  "occurredAt",
  "handlingScale",
  "affectedPeople",
  "affectedHouseholds",
  "locationDetails",
  "impactNotes",
];

function revalidateDisaster(id: string) {
  revalidatePath("/");
  revalidatePath("/bencana");
  revalidatePath(`/bencana/${id}`);
  revalidatePath("/distribusi");
}

/** Tambah / Ubah data bencana (UC-05, KF-03). */
export async function saveDisaster(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = field(formData, "id");
  const input = Object.fromEntries(
    FIELDS.map((name) => [name, field(formData, name)]),
  ) as unknown as DisasterInput;

  try {
    const { id: userId } = await getCurrentUser();
    const saved = id
      ? await updateDisaster(id, input, userId)
      : await createDisaster(input, userId);
    revalidateDisaster(saved.id);
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Deletes a disaster; refused while shipments reference it (KF-03.1, AC-18). */
export async function removeDisaster(id: string): Promise<ActionState> {
  try {
    await deleteDisaster(id, (await getCurrentUser()).id);
    revalidateDisaster(id);
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
