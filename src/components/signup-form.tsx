import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type StatusState = {
  type: "error" | "success";
  message: string;
} | null;

export function SignupForm({ onSuccess }: { onSuccess?: () => void }) {
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, setIsPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!(name && email && password && confirmPassword)) {
      setStatus({
        type: "error",
        message: "Name, email, and password are required.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsPending(true);

    try {
      const result = await authClient.signUp.email({ email, name, password });
      if (result.error) {
        setStatus({
          type: "error",
          message:
            result.error.message ?? "Unable to sign up. Please try again.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Account created successfully. You can log in now.",
      });
      formRef.current?.reset();
      onSuccess?.();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to sign up. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form ref={formRef} onSubmit={handleSubmit}>
      <Field>
        <FieldLabel>Name</FieldLabel>
        <Input
          autoComplete="name"
          name="name"
          placeholder="Your name"
          required
          type="text"
        />
      </Field>

      <Field>
        <FieldLabel>Email</FieldLabel>
        <Input
          autoComplete="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </Field>

      <Field>
        <FieldLabel>Password</FieldLabel>
        <Input
          autoComplete="new-password"
          name="password"
          required
          type="password"
        />
      </Field>

      <Field>
        <FieldLabel>Confirm password</FieldLabel>
        <Input
          autoComplete="new-password"
          name="confirmPassword"
          required
          type="password"
        />
      </Field>

      {status && (
        <Alert variant={status.type === "error" ? "error" : "success"}>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      )}

      <Button disabled={isPending} type="submit">
        {isPending ? "Creating account..." : "Signup"}
      </Button>
    </Form>
  );
}
