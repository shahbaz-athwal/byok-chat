import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { RouterContext } from "@/router";

const SIDEBAR_EXCLUDED_PATHS = ["/auth"];

export const Route = createRootRouteWithContext<RouterContext>()({
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
