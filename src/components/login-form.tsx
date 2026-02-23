import type { FormEvent } from "react";
import { useState } from "react";
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

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [status, setStatus] = useState<StatusState>(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!(email && password)) {
      setStatus({
        type: "error",
        message: "Email and password are required.",
      });
      return;
    }

    setIsPending(true);

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setStatus({
          type: "error",
          message: result.error.message ?? "Unable to login. Please try again.",
        });
        return;
      }

      setStatus({ type: "success", message: "Logged in successfully." });
      onSuccess?.();
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to login. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
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
          autoComplete="current-password"
          name="password"
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
        {isPending ? "Logging in..." : "Login"}
      </Button>
    </Form>
  );
}
