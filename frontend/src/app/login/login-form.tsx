"use client";

import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { login } from "./actions";
import { submitAction } from "@/lib/submit-action";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(login, {
    status: "idle",
  });
  const error = state.status === "error" ? state : undefined;

  return (
    <Card className="w-full max-w-[400px]">
      <Form onSubmit={submitAction(formAction)} validationErrors={error?.fieldErrors} className="flex flex-col gap-3">
        <h1 className="text-center text-2xl font-semibold tracking-tight">Masuk ke SIMPASCA</h1>
        {error && !error.fieldErrors && (
          <AlertRoot status="danger">
            <AlertIndicator />
            <AlertContent>
              <AlertDescription>{error.message}</AlertDescription>
            </AlertContent>
          </AlertRoot>
        )}
        <TextField name="username" isRequired maxLength={100} autoComplete="username">
          <Label>Nama pengguna</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField name="password" type="password" isRequired maxLength={256} autoComplete="current-password">
          <Label>Kata sandi</Label>
          <Input />
          <FieldError />
        </TextField>
        <Button type="submit" fullWidth isPending={isPending}>
          Masuk
        </Button>
        <Link href="/" className="text-center text-sm text-muted hover:underline">
          Lihat data tanpa masuk
        </Link>
      </Form>
    </Card>
  );
}
