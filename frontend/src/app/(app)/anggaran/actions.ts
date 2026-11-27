"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import {
  createCashTransaction,
  deleteCashTransaction,
  getCashTransaction,
  updateCashTransaction,
} from "@/lib/data/cash";

export type CashActionState = ActionState;

/** Also refreshes the disasters the transaction is (or was) linked to. */
function revalidateCash(id: string, ...disasterIds: (string | null | undefined)[]) {
  revalidatePath("/");
  revalidatePath("/anggaran");
  revalidatePath(`/anggaran/${id}`);
  for (const disasterId of disasterIds) if (disasterId) revalidatePath(`/bencana/${disasterId}`);
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
    disasterId: field(formData, "disasterId"),
    receiptId: field(formData, "receiptId"),
  };

  try {
    await requireUser();
    const before = id ? await getCashTransaction(id) : undefined;
    const saved = id
      ? await updateCashTransaction(id, input)
      : await createCashTransaction(input, field(formData, "requestKey"));
    revalidateCash(saved.id, saved.disasterId, before?.disasterId);
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
    await requireUser();
    const before = await getCashTransaction(id);
    await deleteCashTransaction(id);
    revalidateCash(id, before?.disasterId);
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
