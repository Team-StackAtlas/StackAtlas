import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ScopeLevel } from '../data/mockData';

export type AccessLevel = ScopeLevel;

export interface UserScope {
  accessLevel: AccessLevel | null;
  /** Canonical category names picked at onboarding; used to rank "For You". */
  goals: string[];
}

interface UserScopeContextType {
  scope: UserScope;
  updateScope: (newScope: Partial<UserScope>) => void;
  isInitialized: boolean;
}

const UserScopeContext = createContext<UserScopeContextType | undefined>(undefined);

export const UserScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scope, setScope] = useState<UserScope>(() => {
    const fallback: UserScope = {
      accessLevel: null,
      goals: [],
    };
    try {
      const saved = localStorage.getItem('stackatlas_user_scope');
      return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
    } catch {
      // Corrupted localStorage entry — fall back to defaults instead of
      // throwing during render (which would white-screen the app).
      return fallback;
    }
  });
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    localStorage.setItem('stackatlas_user_scope', JSON.stringify(scope));
    setIsInitialized(true);
  }, [scope]);

  const updateScope = (newScope: Partial<UserScope>) => {
    setScope(prev => ({ ...prev, ...newScope }));
  };

  return (
    <UserScopeContext.Provider value={{ scope, updateScope, isInitialized }}>
      {children}
    </UserScopeContext.Provider>
  );
};

export const useUserScope = () => {
  const context = useContext(UserScopeContext);
  if (context === undefined) {
    throw new Error('useUserScope must be used within a UserScopeProvider');
  }
  return context;
};
