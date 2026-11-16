export const API_KEY_SCOPES = [
  "contacts:read",
  "contacts:write",
  "campaigns:read",
  "templates:read",
  "segments:read",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const ALLOWED_SCOPES = new Set<string>(API_KEY_SCOPES);

export function normalizeApiKeyScopes(value: unknown): ApiKeyScope[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("At least one API key scope is required");
  }
  const scopes = [...new Set(value)];
  if (scopes.some((scope) => typeof scope !== "string" || !ALLOWED_SCOPES.has(scope))) {
    throw new Error(`Unsupported API key scope. Allowed: ${API_KEY_SCOPES.join(", ")}`);
  }
  return scopes as ApiKeyScope[];
}

export function hasApiKeyScope(serializedScopes: string, requiredScope: ApiKeyScope): boolean {
  try {
    const scopes: unknown = JSON.parse(serializedScopes);
    return Array.isArray(scopes) && scopes.includes(requiredScope);
  } catch {
    return false;
  }
}
