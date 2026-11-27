"use server";

import { revalidatePath } from "next/cache";
import { errorState, field, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import {
  confirmShipmentReceived,
  createShipment,
  deleteShipment,
  getShipment,
  updateShipment,
  type ShipmentInput,
} from "@/lib/data/shipments";

function revalidateShipment(id: string, disasterId?: string) {
  revalidatePath("/");
  revalidatePath("/distribusi");
  revalidatePath(`/distribusi/${id}`);
  if (disasterId) revalidatePath(`/bencana/${disasterId}`);
}

/** Item rows arrive as JSON from the dialog; anything malformed counts as no items. */
function parseItems(raw: string): ShipmentInput["items"] {
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      itemId: String(r?.itemId ?? ""),
      quantity: String(r?.quantity ?? ""),
    }));
  } catch {
    return [];
  }
}

/** Buat / Ubah pengiriman (UC-09, KF-07). */
export async function saveShipment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = field(formData, "id");
  const input: ShipmentInput = {
    disasterId: field(formData, "disasterId"),
    shippedAt: field(formData, "shippedAt"),
    destination: field(formData, "destination"),
    personInCharge: field(formData, "personInCharge"),
    items: parseItems(field(formData, "items")),
  };

  try {
    await requireUser();
    const before = id ? await getShipment(id) : undefined;
    const saved = id
      ? await updateShipment(id, input)
      : await createShipment(input, field(formData, "requestKey"));
    revalidateShipment(saved.id, saved.disasterId);
    if (before && before.disasterId !== saved.disasterId) {
      revalidatePath(`/bencana/${before.disasterId}`);
    }
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Konfirmasi penerimaan: DIKIRIM → DITERIMA (UC-10, AC-10). */
export async function confirmReceipt(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireUser();
    const saved = await confirmShipmentReceived(field(formData, "id"), field(formData, "receivedAt"));
    revalidateShipment(saved.id, saved.disasterId);
    return { status: "success", id: saved.id };
  } catch (error) {
    return errorState(error);
  }
}

/** Soft-deletes a shipment; stock and shipped totals follow (KF-09.3). */
export async function removeShipment(id: string): Promise<ActionState> {
  try {
    await requireUser();
    const shipment = await deleteShipment(id);
    revalidateShipment(id, shipment.disasterId);
    return { status: "success", id };
  } catch (error) {
    return errorState(error);
  }
}
