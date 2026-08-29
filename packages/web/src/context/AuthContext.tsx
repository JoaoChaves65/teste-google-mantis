import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api/client';
import type { User, UserRole } from '../types/api';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    console.log('[AuthContext] loadUser called');
    try {
      console.log('[AuthContext] Calling api.me()');
      const response = await api.me();
      const user = response.user;
      console.log('[AuthContext] api.me() returned:', user);
      setUser(user);
      console.log('[AuthContext] setUser called with:', user);
    } catch (error) {
      console.error('[AuthContext] loadUser error:', error);
      setUser(null);
    }
    setIsLoading(false);
    console.log('[AuthContext] setIsLoading(false) called');
  }, []);

  useEffect(() => {
    console.log('[AuthContext] useEffect calling loadUser');
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string): Promise<void> => {
    console.log('[AuthContext] login called');
    const response = await api.login({ email, password });
    console.log('[AuthContext] login response:', response);
    setUser(response.user);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await loadUser();
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.role);
  };

  console.log('[AuthContext] Render:', {
    user: user ? 'present' : 'null',
    isLoading,
    isAuthenticated: !!user,
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
