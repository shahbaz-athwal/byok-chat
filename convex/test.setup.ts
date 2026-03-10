/// <reference types="vite/client" />

export const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

export const betterAuthModules = import.meta.glob([
  "./betterAuth/**/*.ts",
  "!./betterAuth/**/*.test.ts",
]);

export const agentModules = import.meta.glob([
  "../node_modules/@convex-dev/agent/dist/component/**/*.js",
]);
