"use client";

import { useSmoothText } from "@convex-dev/agent/react";
import { Streamdown } from "streamdown";
import { cn } from "@/lib/utils";

export interface AssistantMarkdownFeatures {
  cjk: boolean;
  codeBlocks: boolean;
  math: boolean;
  mermaid: boolean;
}

export interface AssistantMarkdownRendererProps {
  className?: string;
  features?: Partial<AssistantMarkdownFeatures>;
  markdown: string;
  smooth?: boolean;
}

const DEFAULT_ASSISTANT_MARKDOWN_FEATURES: AssistantMarkdownFeatures = {
  cjk: false,
  codeBlocks: false,
  math: false,
  mermaid: false,
};

interface StreamdownPluginMap extends Record<string, unknown> {}
interface AssistantMarkdownPluginBuilders {
  cjk: () => unknown | null;
  codeBlocks: () => unknown | null;
  math: () => unknown | null;
  mermaid: () => unknown | null;
}

const assistantMarkdownPluginBuilders: AssistantMarkdownPluginBuilders = {
  cjk: () => null,
  codeBlocks: () => null,
  math: () => null,
  mermaid: () => null,
};

function buildAssistantMarkdownPlugins(
  features: AssistantMarkdownFeatures
): StreamdownPluginMap {
  const plugins: StreamdownPluginMap = {};
  const featureEntries = Object.entries(features) as [
    keyof AssistantMarkdownFeatures,
    boolean,
  ][];

  for (const [featureName, isEnabled] of featureEntries) {
    if (!isEnabled) {
      continue;
    }

    const plugin = assistantMarkdownPluginBuilders[featureName]();
    if (plugin) {
      plugins[featureName] = plugin;
    }
  }

  return plugins;
}

export function AssistantMessageMarkdown({
  className,
  features,
  markdown,
  smooth = false,
}: AssistantMarkdownRendererProps) {
  const resolvedFeatures: AssistantMarkdownFeatures = {
    ...DEFAULT_ASSISTANT_MARKDOWN_FEATURES,
    ...features,
  };
  const plugins = buildAssistantMarkdownPlugins(resolvedFeatures);
  const [visibleMarkdown] = useSmoothText(markdown, {
    startStreaming: smooth,
  });

  return (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      plugins={plugins}
    >
      {visibleMarkdown}
    </Streamdown>
  );
}
