"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { createItem, deleteItem, updateItem, type ItemInput } from "@/lib/data/inventory";
import {
  createReceipt,
  deleteReceipt,
  updateReceipt,
  type ReceiptInput,
} from "@/lib/data/receipts";

// Stock shows on the dashboard, the shipment form and disaster recommendations too.
const revalidateStock = () => revalidatePath("/", "layout");

const ITEM_FIELDS: (keyof ItemInput)[] = [
  "name", "category", "stockUnit", "initialStock", "needRatio", "needType", "ratioBasis", "expirationDate",
];
const RECEIPT_FIELDS: (keyof ReceiptInput)[] = [
  "itemId", "quantity", "receiptDate", "sourceGiver", "itemCondition", "notes",
];
const read = <K extends string>(formData: FormData, names: K[]) =>
  Object.fromEntries(names.map((name) => [name, field(formData, name)])) as Record<K, string>;

/** Tambah / Ubah barang (UC-07, KF-04). */
export async function saveItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = field(formData, "id");
  try {
    const { id: userId } = await requireUser();
    const input = read(formData, ITEM_FIELDS);
    const saved = id ? await updateItem(id, input, userId) : await createItem(input, userId);
    revalidateStock();
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Hapus barang; refused while it has stock history (AC-18). */
export async function removeItem(id: string): Promise<ActionState> {
  try {
    await deleteItem(id, (await requireUser()).id);
    revalidateStock();
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}

/** Catat / Koreksi penerimaan (UC-08, KF-06). */
export async function saveReceipt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = field(formData, "id");
  try {
    const { id: userId } = await requireUser();
    const input = read(formData, RECEIPT_FIELDS);
    const saved = id
      ? await updateReceipt(id, input, userId)
      : await createReceipt(input, field(formData, "requestKey"), userId);
    revalidateStock();
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Hapus penerimaan; its quantity leaves stock again (KF-09.3). */
export async function removeReceipt(id: string): Promise<ActionState> {
  try {
    await deleteReceipt(id, (await requireUser()).id);
    revalidateStock();
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
