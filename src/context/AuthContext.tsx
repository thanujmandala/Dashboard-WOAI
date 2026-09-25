import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  availableJudges: { username: string; name: string; role: 'admin' | 'judge' }[];
}

const AUTH_STORAGE_KEY = 'woai_auth_user_v1';

const PRESET_ACCOUNTS = [
  {
    username: 'admin1',
    password: 'WOAI@123',
    name: 'Judge Admin 1 (Lead AI)',
    role: 'admin' as const,
  },
  {
    username: 'admin2',
    password: 'WOAI@123',
    name: 'Judge Admin 2 (Tech Arch)',
    role: 'admin' as const,
  },
  {
    username: 'admin3',
    password: 'WOAI@123',
    name: 'Judge Admin 3 (Domain Expert)',
    role: 'admin' as const,
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedUser = username.trim().toLowerCase();
    const account = PRESET_ACCOUNTS.find(
      (acc) => acc.username.toLowerCase() === trimmedUser && acc.password === password
    );

    if (account) {
      const authUser: User = {
        id: `judge-${account.username}`,
        username: account.username,
        name: account.name,
        role: account.role,
      };

      setUser(authUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));

      StorageService.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: authUser.username,
        action: 'login',
        details: `Judge logged into portal successfully.`,
      });

      return { success: true };
    }

    return { success: false, error: 'Invalid username or password. Check credentials.' };
  };

  const logout = () => {
    if (user) {
      StorageService.addAuditLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        judge_username: user.username,
        action: 'login',
        details: `Judge logged out.`,
      });
    }
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        availableJudges: PRESET_ACCOUNTS.map((a) => ({
          username: a.username,
          name: a.name,
          role: a.role,
        })),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
