import { createFileRoute } from "@tanstack/react-router";
import { MessageSquareIcon } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageSquareIcon />
        </EmptyMedia>
        <EmptyTitle>Welcome to byok-chat</EmptyTitle>
        <EmptyDescription>
          Start a new conversation or pick up where you left off from the
          sidebar.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
