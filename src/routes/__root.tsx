import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ThemeToggle } from "@/components/theme-toggle";
import type { RouterContext } from "@/router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="font-semibold text-lg">byok-chat</h1>
        <ThemeToggle />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
