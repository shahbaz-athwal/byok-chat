import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { SquarePenIcon } from "lucide-react";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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
  const navigate = useNavigate();
  const { data: chats } = useQuery(threadsListQuery());
  const chatItems = chats?.page ?? [];

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <span className="px-2 font-semibold text-base">byok-chat</span>
        <Button className="mt-2 w-full" onClick={() => navigate({ to: "/" })}>
          <SquarePenIcon />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chatItems.map((chat) => (
                <SidebarMenuItem key={chat._id}>
                  <SidebarMenuButton
                    render={(props) => (
                      <Button
                        {...props}
                        className={cn("w-full justify-start", props.className)}
                        render={(buttonProps) => (
                          <Link
                            {...buttonProps}
                            activeOptions={{ exact: true }}
                            activeProps={{
                              className:
                                "bg-sidebar-accent text-sidebar-accent-foreground",
                            }}
                            className={cn(
                              "w-full justify-start",
                              buttonProps.className
                            )}
                            params={{ chatId: chat._id }}
                            to="/chat/$chatId"
                          />
                        )}
                        variant="ghost"
                      />
                    )}
                  >
                    {chat.title ?? "Untitled chat"}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
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
