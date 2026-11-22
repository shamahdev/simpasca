import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that runs a form action without React 19's automatic form
 * reset, so a form rejected by the server keeps what the user typed.
 * Browser-side validation still runs first: an invalid form never submits.
 */
export const submitAction =
  (action: (formData: FormData) => void) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
