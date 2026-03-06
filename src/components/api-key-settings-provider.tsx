"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyIcon } from "lucide-react";
import { createContext, type ReactNode, useContext, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { toastManager } from "@/components/ui/toast";
import { PROVIDER_LABELS, type Provider } from "@/lib/chat-models";
import {
  useRemoveApiKeyMutation,
  useSaveApiKeyMutation,
} from "@/mutations/api-keys";
import { apiKeysListQuery } from "@/queries/api-keys";

interface ProviderConfigurationState {
  anthropic: boolean;
  google: boolean;
  openai: boolean;
}

interface ProviderMaskedKeysState {
  anthropic?: string;
  google?: string;
  openai?: string;
}

interface ProviderModelsState {
  anthropic: readonly string[];
  google: readonly string[];
  openai: readonly string[];
}

interface ApiKeySettingsContextValue {
  configuredProviders: ProviderConfigurationState;
  isPending: boolean;
  openSettings: () => void;
}

interface ApiKeySettingsProviderProps {
  children: ReactNode;
}

interface ProviderApiKeyCardProps {
  isConfigured: boolean;
  isPending: boolean;
  maskedKey?: string;
  models: readonly string[];
  onRemove: (provider: Provider) => Promise<void>;
  onSave: (provider: Provider, apiKey: string) => Promise<void>;
  provider: Provider;
}

interface ApiKeyListEntry {
  maskedKey: string;
  models: readonly string[];
  provider: Provider;
}

const ApiKeySettingsContext = createContext<ApiKeySettingsContextValue | null>(
  null
);

function createEmptyProviderConfiguration(): ProviderConfigurationState {
  return {
    anthropic: false,
    google: false,
    openai: false,
  };
}

function createEmptyProviderMaskedKeys(): ProviderMaskedKeysState {
  return {};
}

function createEmptyProviderModels(): ProviderModelsState {
  return {
    anthropic: [],
    google: [],
    openai: [],
  };
}

function ProviderApiKeyCard({
  provider,
  maskedKey,
  isConfigured,
  isPending,
  models,
  onSave,
  onRemove,
}: ProviderApiKeyCardProps) {
  const [apiKey, setApiKey] = useState("");

  async function handleSave() {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      return;
    }

    await onSave(provider, trimmed);
    setApiKey("");
  }

  async function handleRemove() {
    await onRemove(provider);
    setApiKey("");
  }

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex items-start justify-between gap-3 border-b pb-4">
        <div className="space-y-1">
          <CardTitle>{PROVIDER_LABELS[provider]}</CardTitle>
          <CardDescription>
            {isConfigured
              ? `Configured: ${maskedKey ?? "Saved"}`
              : "No API key stored for this provider."}
          </CardDescription>
        </div>
        <Badge variant={isConfigured ? "success" : "outline"}>
          {isConfigured ? "Configured" : "Missing"}
        </Badge>
      </CardHeader>
      <CardPanel className="space-y-4">
        <Field className="w-full gap-1.5">
          <FieldLabel htmlFor={`provider-key-${provider}`}>API key</FieldLabel>
          <Input
            autoComplete="off"
            disabled={isPending}
            id={`provider-key-${provider}`}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={`Paste your ${PROVIDER_LABELS[provider]} key`}
            type="password"
            value={apiKey}
          />
          <FieldDescription>
            {models.length > 0
              ? `Available models: ${models.join(", ")}`
              : "No models available for this provider."}
          </FieldDescription>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={apiKey.trim().length === 0 || isPending}
            onClick={handleSave}
          >
            {isConfigured ? "Update key" : "Save key"}
          </Button>
          <Button
            disabled={!isConfigured || isPending}
            onClick={handleRemove}
            variant="outline"
          >
            Remove key
          </Button>
        </div>
      </CardPanel>
    </Card>
  );
}

export function ApiKeySettingsProvider({
  children,
}: ApiKeySettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isPending } = useQuery(apiKeysListQuery());
  const saveApiKeyMutation = useSaveApiKeyMutation();
  const removeApiKeyMutation = useRemoveApiKeyMutation();

  const configuredProviders = createEmptyProviderConfiguration();
  const maskedKeys = createEmptyProviderMaskedKeys();
  const modelsByProvider = createEmptyProviderModels();
  const apiKeyEntries = (data ?? []) as ApiKeyListEntry[];

  for (const keyEntry of apiKeyEntries) {
    configuredProviders[keyEntry.provider] = true;
    maskedKeys[keyEntry.provider] = keyEntry.maskedKey;
    modelsByProvider[keyEntry.provider] = keyEntry.models;
  }

  async function handleSave(provider: Provider, apiKey: string) {
    await saveApiKeyMutation.mutateAsync({ apiKey, provider });
    toastManager.add({
      title: `${PROVIDER_LABELS[provider]} key saved`,
      type: "success",
    });
  }

  async function handleRemove(provider: Provider) {
    await removeApiKeyMutation.mutateAsync({ provider });
    toastManager.add({
      title: `${PROVIDER_LABELS[provider]} key removed`,
      type: "success",
    });
  }

  return (
    <ApiKeySettingsContext.Provider
      value={{
        configuredProviders,
        isPending,
        openSettings: () => setIsOpen(true),
      }}
    >
      {children}
      <Sheet onOpenChange={setIsOpen} open={isOpen}>
        <SheetPopup inset side="right">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <KeyIcon className="size-4" />
              <SheetTitle>API Keys</SheetTitle>
            </div>
          </SheetHeader>
          <SheetPanel className="space-y-4">
            <ProviderApiKeyCard
              isConfigured={configuredProviders.openai}
              isPending={
                (saveApiKeyMutation.isPending &&
                  saveApiKeyMutation.variables?.provider === "openai") ||
                (removeApiKeyMutation.isPending &&
                  removeApiKeyMutation.variables?.provider === "openai")
              }
              maskedKey={maskedKeys.openai}
              models={modelsByProvider.openai}
              onRemove={handleRemove}
              onSave={handleSave}
              provider="openai"
            />
            <ProviderApiKeyCard
              isConfigured={configuredProviders.google}
              isPending={
                (saveApiKeyMutation.isPending &&
                  saveApiKeyMutation.variables?.provider === "google") ||
                (removeApiKeyMutation.isPending &&
                  removeApiKeyMutation.variables?.provider === "google")
              }
              maskedKey={maskedKeys.google}
              models={modelsByProvider.google}
              onRemove={handleRemove}
              onSave={handleSave}
              provider="google"
            />
            <ProviderApiKeyCard
              isConfigured={configuredProviders.anthropic}
              isPending={
                (saveApiKeyMutation.isPending &&
                  saveApiKeyMutation.variables?.provider === "anthropic") ||
                (removeApiKeyMutation.isPending &&
                  removeApiKeyMutation.variables?.provider === "anthropic")
              }
              maskedKey={maskedKeys.anthropic}
              models={modelsByProvider.anthropic}
              onRemove={handleRemove}
              onSave={handleSave}
              provider="anthropic"
            />
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </ApiKeySettingsContext.Provider>
  );
}

export function useApiKeySettings() {
  const context = useContext(ApiKeySettingsContext);
  if (!context) {
    throw new Error(
      "useApiKeySettings must be used within ApiKeySettingsProvider."
    );
  }

  return context;
}
