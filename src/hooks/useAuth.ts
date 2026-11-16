import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import { User } from "../types";

export type Permission =
  | "campaign:edit"
  | "campaign:send"
  | "template:edit"
  | "contact:edit"
  | "automation:edit"
  | "report:view"
  | "team:manage"
  | "integration:manage"
  | "infrastructure:manage";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "campaign:edit",
    "campaign:send",
    "template:edit",
    "contact:edit",
    "automation:edit",
    "report:view",
    "team:manage",
    "integration:manage",
    "infrastructure:manage",
  ],
  ADMIN: [
    "campaign:edit",
    "campaign:send",
    "template:edit",
    "contact:edit",
    "automation:edit",
    "report:view",
    "team:manage",
    "integration:manage",
  ],
  EDITOR: [
    "campaign:edit",
    "campaign:send",
    "template:edit",
    "contact:edit",
    "automation:edit",
    "report:view",
  ],
  ANALYST: ["report:view"],
  VIEWER: ["report:view"],
};

let cachedUser: User | null = null;
let hasInitialLoaded = false;
let inFlightMePromise: Promise<User | null> | null = null;
const authSubscribers = new Set<(user: User | null) => void>();

function notifyAuthSubscribers(user: User | null) {
  cachedUser = user;
  hasInitialLoaded = true;
  authSubscribers.forEach((cb) => cb(user));
}

async function fetchMeShared(): Promise<User | null> {
  if (inFlightMePromise) return inFlightMePromise;
  inFlightMePromise = api
    .getMe()
    .then((data) => {
      const resolved = data && data.id ? data : null;
      notifyAuthSubscribers(resolved);
      return resolved;
    })
    .catch((e) => {
      console.warn("Authentication is unavailable", e);
      notifyAuthSubscribers(null);
      return null;
    })
    .finally(() => {
      inFlightMePromise = null;
    });
  return inFlightMePromise;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(!hasInitialLoaded);

  useEffect(() => {
    const onAuthChange = (newUser: User | null) => {
      setUser(newUser);
      setLoading(false);
    };

    authSubscribers.add(onAuthChange);

    if (!hasInitialLoaded && !inFlightMePromise) {
      fetchMeShared();
    } else if (hasInitialLoaded) {
      setUser(cachedUser);
      setLoading(false);
    }

    const handleAuthStateChanged = () => {
      fetchMeShared();
    };
    window.addEventListener("signal:auth-state-changed", handleAuthStateChanged);

    return () => {
      authSubscribers.delete(onAuthChange);
      window.removeEventListener("signal:auth-state-changed", handleAuthStateChanged);
    };
  }, []);

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;

      // Check custom role permissions first
      if (user.customRole) {
        try {
          const customPerms = JSON.parse(user.customRole.permissions) as string[];
          if (customPerms.includes(permission)) return true;
        } catch (e) {
          console.error("Failed to parse custom role permissions", e);
        }
      }

      // Check default role permissions
      const defaultPerms = ROLE_PERMISSIONS[user.role] || [];
      return defaultPerms.includes(permission);
    },
    [user]
  );

  const isAdmin = user?.role === "OWNER" || user?.role === "ADMIN";

  const refreshUser = useCallback(async () => {
    const updatedUser = await fetchMeShared();
    window.dispatchEvent(new Event("signal:auth-state-changed"));
    return updatedUser;
  }, []);

  return { user, loading, hasPermission, isAdmin, refreshUser };
}
