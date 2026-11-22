import { DataError } from "./data/errors";

/** Result of a Server Action, shown by the calling form or dialog. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; id: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

/** Turns a DataError into form state; anything else is a real failure and is rethrown. */
export function errorState(error: unknown): ActionState {
  if (error instanceof DataError) {
    return { status: "error", message: error.message, fieldErrors: error.fieldErrors };
  }
  throw error;
}

export const field = (formData: FormData, name: string) =>
  String(formData.get(name) ?? "");
