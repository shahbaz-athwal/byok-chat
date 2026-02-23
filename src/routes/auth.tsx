import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LoginForm } from "@/components/login-form";
import { SignupForm } from "@/components/signup-form";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const navigate = Route.useNavigate();

  function handleSuccess() {
    navigate({ to: "/" });
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
