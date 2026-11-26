"use server";

import { revalidatePath } from "next/cache";
import { errorState, type ActionState } from "@/lib/action-state";
import { requireUser } from "@/lib/auth";
import { generateReport } from "@/lib/data/reports";

/** Generate Laporan for one disaster (UC-13, KF-10). */
export async function generateReportAction(disasterId: string): Promise<ActionState> {
  try {
    const report = await generateReport(disasterId, await requireUser());
    revalidatePath("/laporan");
    revalidatePath("/riwayat-audit");
    return { status: "success", id: report.id };
  } catch (error) {
    return errorState(error);
  }
}
