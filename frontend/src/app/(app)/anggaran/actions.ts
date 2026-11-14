"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  CashError,
  createCashTransaction,
  deleteCashTransaction,
  updateCashTransaction,
  type CashFieldErrors,
} from "@/lib/data/cash";

export type CashActionState =
  | { status: "idle" }
  | { status: "success"; id: string }
  | { status: "error"; message: string; fieldErrors?: CashFieldErrors };

const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");

function revalidateCash(id: string) {
  revalidatePath("/");
  revalidatePath("/anggaran");
  revalidatePath(`/anggaran/${id}`);
}

function toErrorState(error: unknown): CashActionState {
  if (error instanceof CashError) {
    return {
      status: "error",
      message: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  throw error;
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
    const saved = id
      ? await updateCashTransaction(id, input)
      : await createCashTransaction(
          input,
          field(formData, "requestKey"),
          getCurrentUser().id,
        );
    revalidateCash(saved.id);
    return { status: "success", id: saved.id };
  } catch (error) {
    return toErrorState(error);
  }
}

/** Soft-deletes a cash transaction (UC-12 A5). */
export async function removeCashTransaction(
  id: string,
): Promise<CashActionState> {
  try {
    await deleteCashTransaction(id);
    revalidateCash(id);
    return { status: "success", id };
  } catch (error) {
    return toErrorState(error);
  }
}
