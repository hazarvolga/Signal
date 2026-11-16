const flags: Record<string, boolean> = {};

export function loadFlags() {
  const raw = process.env.FEATURE_FLAGS || "{}";
  try {
    const parsed = JSON.parse(raw);
    Object.assign(flags, parsed);
  } catch {
    console.warn("Failed to parse FEATURE_FLAGS env var, using defaults");
  }
}

loadFlags();

export function isEnabled(flag: string): boolean {
  return flags[flag] === true;
}

export function getFlag(flag: string, defaultValue: boolean = false): boolean {
  return flag in flags ? flags[flag] : defaultValue;
}

export function setFlag(flag: string, value: boolean) {
  flags[flag] = value;
}

export function getAllFlags(): Record<string, boolean> {
  return { ...flags };
}
