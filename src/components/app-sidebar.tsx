import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { KeyIcon } from "lucide-react";
import { Suspense } from "react";
import { useApiKeySettings } from "@/components/api-key-settings-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { threadsListQuery } from "@/queries/threads";

function SidebarFooterUser() {
  const { data: session } = authClient.useSession();

  if (!session) {
    return null;
  }

  const { name, email } = session.user;
  const initials = name
    ? name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email[0].toUpperCase();

  return (
    <>
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium text-sm">{name}</span>
        <span className="truncate text-muted-foreground text-xs">{email}</span>
      </div>
    </>
  );
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { openSettings } = useApiKeySettings();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const { data: chats } = useSuspenseQuery(threadsListQuery());

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <span className="px-2 font-semibold text-base">byok-chat</span>
        <Button className="mt-2 w-full" onClick={() => navigate({ to: "/" })}>
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            {chats.length === 0 ? (
              <Empty className="gap-2 px-2 py-8">
                <EmptyHeader className="max-w-none">
                  <EmptyTitle className="text-sm">No chats yet</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Start a new conversation to see it here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.threadId}>
                    <SidebarMenuButton
                      isActive={params.threadId === chat.threadId}
                      render={(props) => (
                        <Link
                          {...props}
                          params={{ threadId: chat.threadId }}
                          preload="intent"
                          to="/chat/$threadId"
                        />
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {chat.title ?? "Untitled chat"}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          className="mt-2 w-full"
          onClick={openSettings}
          variant="outline"
        >
          <KeyIcon />
          API Keys
        </Button>
        <div className="flex items-center gap-2">
          <Suspense>
            <SidebarFooterUser />
          </Suspense>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
