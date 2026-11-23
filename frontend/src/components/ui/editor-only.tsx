"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { EDITOR_COOKIE } from "@/lib/editor-cookie";

const noSubscribe = () => () => {};

/**
 * True when a staff member is signed in. Visitors (warga) only read, so edit
 * controls are hidden for them. Display only: Server Actions check the session.
 */
export function useCanEdit() {
  return useSyncExternalStore(
    noSubscribe,
    () => document.cookie.split("; ").includes(`${EDITOR_COOKIE}=1`),
    () => false,
  );
}

/** Renders its children only for signed-in staff. */
export function EditorOnly({ children }: { children: ReactNode }) {
  return useCanEdit() ? children : null;
}
