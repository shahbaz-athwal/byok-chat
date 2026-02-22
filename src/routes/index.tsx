import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

type StatusState = {
  type: "error" | "success";
  message: string;
} | null;

function IndexPage() {
  const { data: sessionData, isPending: sessionPending } =
    authClient.useSession();
  const { data: messages, isPending: messagesPending } = useQuery(
    convexQuery(api.messages.list, {})
  );
  const [activeTab, setActiveTab] = useState("login");
  const [loginStatus, setLoginStatus] = useState<StatusState>(null);
  const [signupStatus, setSignupStatus] = useState<StatusState>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginStatus(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!(email && password)) {
      setLoginStatus({
        type: "error",
        message: "Email and password are required.",
      });
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setLoginStatus({
          type: "error",
          message: result.error.message ?? "Unable to login. Please try again.",
        });
        return;
      }

      setLoginStatus({
        type: "success",
        message: "Logged in successfully.",
      });
    } catch (error) {
      setLoginStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to login. Please try again.",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupStatus(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!(name && email && password && confirmPassword)) {
      setSignupStatus({
        type: "error",
        message: "Name, email, and password are required.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setSignupStatus({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setIsSigningUp(true);

    try {
      const result = await authClient.signUp.email({ email, name, password });
      if (result.error) {
        setSignupStatus({
          type: "error",
          message:
            result.error.message ?? "Unable to sign up. Please try again.",
        });
        return;
      }

      setSignupStatus({
        type: "success",
        message: "Account created successfully. You can log in now.",
      });
      setActiveTab("login");
      event.currentTarget.reset();
    } catch (error) {
      setSignupStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to sign up. Please try again.",
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  if (!sessionPending && sessionData?.user) {
    return (
      <div className="mx-auto flex h-[calc(100svh-49px)] w-full max-w-2xl flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-muted-foreground text-sm">
            {sessionData.user.email}
          </p>
          <Button
            onClick={() => authClient.signOut()}
            size="sm"
            variant="ghost"
          >
            Sign out
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-3 px-4 py-6">
            <MessageList messages={messages} pending={messagesPending} />
            <div ref={scrollEndRef} />
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-10 sm:py-16">
      <Card>
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Login to your account or create a new one.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            className="gap-4"
            onValueChange={(value) => setActiveTab(value)}
            value={activeTab}
          >
            <TabsList className="w-full">
              <TabsTrigger className="grow" value="login">
                Login
              </TabsTrigger>
              <TabsTrigger className="grow" value="signup">
                Signup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                className="flex flex-col gap-4"
                onSubmit={handleLoginSubmit}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    autoComplete="email"
                    id="login-email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    autoComplete="current-password"
                    id="login-password"
                    name="password"
                    required
                    type="password"
                  />
                </div>

                {loginStatus && (
                  <Alert
                    variant={loginStatus.type === "error" ? "error" : "success"}
                  >
                    <AlertDescription>{loginStatus.message}</AlertDescription>
                  </Alert>
                )}

                <Button disabled={isLoggingIn} type="submit">
                  {isLoggingIn ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form
                className="flex flex-col gap-4"
                onSubmit={handleSignupSubmit}
              >
                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-name">Name</Label>
                  <Input
                    autoComplete="name"
                    id="signup-name"
                    name="name"
                    placeholder="Your name"
                    required
                    type="text"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    autoComplete="email"
                    id="signup-email"
                    name="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    autoComplete="new-password"
                    id="signup-password"
                    name="password"
                    required
                    type="password"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="signup-confirm-password">
                    Confirm password
                  </Label>
                  <Input
                    autoComplete="new-password"
                    id="signup-confirm-password"
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </div>

                {signupStatus && (
                  <Alert
                    variant={
                      signupStatus.type === "error" ? "error" : "success"
                    }
                  >
                    <AlertDescription>{signupStatus.message}</AlertDescription>
                  </Alert>
                )}

                <Button disabled={isSigningUp} type="submit">
                  {isSigningUp ? "Creating account..." : "Signup"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageList({
  messages,
  pending,
}: {
  messages:
    | Array<{ _id: string; role: "user" | "assistant"; content: string }>
    | undefined;
  pending: boolean;
}) {
  if (pending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <p className="text-muted-foreground text-sm">
          No messages yet. Start a conversation!
        </p>
      </div>
    );
  }

  return messages.map((msg) => (
    <div
      className={
        msg.role === "user" ? "flex justify-end" : "flex justify-start"
      }
      key={msg._id}
    >
      <div
        className={
          msg.role === "user"
            ? "max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground"
            : "max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-4 py-2.5"
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {msg.content}
        </p>
      </div>
    </div>
  ));
}
