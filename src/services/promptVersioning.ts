import { logger } from "./logger";

interface PromptVersion {
  version: number;
  name: string;
  prompt: string;
  model: string;
  temperature: number;
  createdAt: string;
  performance?: {
    totalCalls: number;
    avgLatency: number;
    approvalRate: number;
  };
}

interface PromptRegistry {
  [key: string]: {
    current: number;
    versions: PromptVersion[];
  };
}

const registry: PromptRegistry = {};

export function registerPrompt(
  key: string,
  name: string,
  prompt: string,
  model: string = "gemini-3-flash-preview",
  temperature: number = 0.7
): PromptVersion {
  if (!registry[key]) {
    registry[key] = { current: 1, versions: [] };
  }

  const entry = registry[key];
  const version = entry.versions.length + 1;
  const v: PromptVersion = {
    version,
    name,
    prompt,
    model,
    temperature,
    createdAt: new Date().toISOString(),
  };

  entry.versions.push(v);
  entry.current = version;
  logger.info({ key, version, name }, "Prompt version registered");
  return v;
}

export function getCurrentPrompt(key: string): PromptVersion | null {
  const entry = registry[key];
  if (!entry) return null;
  return entry.versions.find((v) => v.version === entry.current) || null;
}

export function getPromptVersion(key: string, version: number): PromptVersion | null {
  const entry = registry[key];
  if (!entry) return null;
  return entry.versions.find((v) => v.version === version) || null;
}

export function setCurrentVersion(key: string, version: number): boolean {
  const entry = registry[key];
  if (!entry || !entry.versions.find((v) => v.version === version)) {
    return false;
  }
  entry.current = version;
  logger.info({ key, version }, "Prompt version switched");
  return true;
}

export function recordPromptCall(key: string, latency: number, approved: boolean) {
  const prompt = getCurrentPrompt(key);
  if (!prompt || !prompt.performance) {
    return;
  }
  const p = prompt.performance!;
  p.totalCalls++;
  p.avgLatency = (p.avgLatency * (p.totalCalls - 1) + latency) / p.totalCalls;
  p.approvalRate = (p.approvalRate * (p.totalCalls - 1) + (approved ? 1 : 0)) / p.totalCalls;
}

export function getPromptHistory(key: string): PromptVersion[] {
  return registry[key]?.versions || [];
}

export function getAllPrompts(): PromptRegistry {
  return registry;
}
