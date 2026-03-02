import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { User } from '../types';

export type Permission = 
  | 'campaign:edit' 
  | 'campaign:send' 
  | 'template:edit' 
  | 'contact:edit' 
  | 'automation:edit' 
  | 'report:view' 
  | 'team:manage' 
  | 'integration:manage'
  | 'infrastructure:manage';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    'campaign:edit', 'campaign:send', 'template:edit', 'contact:edit', 
    'automation:edit', 'report:view', 'team:manage', 'integration:manage',
    'infrastructure:manage'
  ],
  ADMIN: [
    'campaign:edit', 'campaign:send', 'template:edit', 'contact:edit', 
    'automation:edit', 'report:view', 'team:manage', 'integration:manage'
  ],
  EDITOR: [
    'campaign:edit', 'campaign:send', 'template:edit', 'contact:edit', 
    'automation:edit', 'report:view'
  ],
  ANALYST: [
    'report:view'
  ],
  VIEWER: [
    'report:view'
  ]
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMe()
      .then(setUser)
      .finally(() => setLoading(loading => false));
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
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
  }, [user]);

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  return { user, loading, hasPermission, isAdmin };
}
