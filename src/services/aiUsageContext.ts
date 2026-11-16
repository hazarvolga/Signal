import { AsyncLocalStorage } from "node:async_hooks";

export interface AiUsageContext {
  organizationId: string;
}

const storage = new AsyncLocalStorage<AiUsageContext>();

export function runWithAiUsageContext<T>(context: AiUsageContext, callback: () => T): T {
  return storage.run(context, callback);
}

export function requireAiUsageContext(): AiUsageContext {
  const context = storage.getStore();
  if (!context) throw new Error("AI usage context is required");
  return context;
}
