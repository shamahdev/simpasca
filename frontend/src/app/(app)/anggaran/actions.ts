"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/auth";
import {
  createCashTransaction,
  deleteCashTransaction,
  updateCashTransaction,
} from "@/lib/data/cash";

export type CashActionState = ActionState;

function revalidateCash(id: string) {
  revalidatePath("/");
  revalidatePath("/anggaran");
  revalidatePath(`/anggaran/${id}`);
}

/** Creates (with request key) or updates a cash transaction (UC-12). */
export async function saveCashTransaction(
  _prev: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const id = field(formData, "id");
  const input = {
    type: field(formData, "type"),
    amount: field(formData, "amount"),
    description: field(formData, "description"),
    transactionDate: field(formData, "transactionDate"),
  };

  try {
    const user = await getCurrentUser();
    const saved = id
      ? await updateCashTransaction(id, input, user.id)
      : await createCashTransaction(input, field(formData, "requestKey"), user.id);
    revalidateCash(saved.id);
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Soft-deletes a cash transaction (UC-12 A5). */
export async function removeCashTransaction(
  id: string,
): Promise<CashActionState> {
  try {
    await deleteCashTransaction(id, (await getCurrentUser()).id);
    revalidateCash(id);
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
