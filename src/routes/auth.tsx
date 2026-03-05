import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthSearch {
  redirect?: string;
}

function getSafeRedirectPath(redirectPath?: string) {
  if (!redirectPath) {
    return "/";
  }

  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return "/";
  }

  if (redirectPath.startsWith("/auth")) {
    return "/";
  }

  return redirectPath;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search): AuthSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  loader: async ({ location }) => {
    const session = await authClient.getSession();
    if (session.data?.session) {
      const queryParams = new URLSearchParams(location.searchStr);
      throw redirect({
        replace: true,
        to: getSafeRedirectPath(queryParams.get("redirect") ?? undefined),
      });
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  function handleSuccess() {
    navigate({
      replace: true,
      to: getSafeRedirectPath(search.redirect),
    });
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

        <CardPanel>
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
              <LoginForm onSuccess={handleSuccess} />
            </TabsContent>

            <TabsContent value="signup">
              <SignupForm onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>
        </CardPanel>
      </Card>
    </div>
  );
}
