import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <h2 className="font-bold text-3xl">Welcome</h2>
      <p className="text-muted-foreground">Get started by editing this page.</p>
    </div>
  );
}
