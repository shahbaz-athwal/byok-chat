import {
  createRootRouteWithContext,
  Outlet,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { ApiKeySettingsProvider } from "@/components/api-key-settings-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { DraftThreadProvider } from "@/components/draft-thread-provider";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { apiKeysListQuery } from "@/queries/api-keys";
import { threadsListQuery } from "@/queries/threads";
import type { RouterContext } from "@/router";

const SIDEBAR_EXCLUDED_PATHS = ["/auth"];

export const Route = createRootRouteWithContext<RouterContext>()({
  loader: async ({ context, location }) => {
    if (location.pathname.startsWith("/auth")) {
      return;
    }

    const session = await authClient.getSession();
    if (!session.data?.session) {
      const redirectPath = `${location.pathname}${location.searchStr}${location.hash}`;
      throw redirect({
        replace: true,
        search: { redirect: redirectPath },
        to: "/auth",
      });
    }

    await Promise.all([
      context.queryClient.ensureQueryData(apiKeysListQuery()),
      context.queryClient.ensureQueryData(threadsListQuery()),
    ]);
  },
  component: RootComponent,
});

function RootComponent() {
  const { pathname } = useLocation();
  const showSidebar = !SIDEBAR_EXCLUDED_PATHS.includes(pathname);

  if (!showSidebar) {
    return (
      <div className="min-h-svh bg-background text-foreground">
        <Outlet />
      </div>
    );
  }

  return (
    <ApiKeySettingsProvider>
      <DraftThreadProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-svh min-h-0 overflow-hidden">
            <SidebarTrigger className="absolute top-2 left-2 z-30" />
            <Outlet />
          </SidebarInset>
        </SidebarProvider>
      </DraftThreadProvider>
    </ApiKeySettingsProvider>
  );
}
