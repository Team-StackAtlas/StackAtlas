import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const MOCK_ROLE_STORAGE_KEY = 'stackatlas.mockRole';
export const MOCK_REPORTS_STORAGE_KEY = 'stackatlas.mockReports';

export type MockRole = 'user' | 'admin' | 'developer';
export type MockReportTargetType = 'substance' | 'stack' | 'brand';

export interface MockReport {
  id: string;
  targetType: MockReportTargetType;
  targetId?: string;
  targetName?: string;
  category: string;
  details: string;
  createdAt: string;
  status: 'open';
}

interface CreateMockReportInput {
  targetType: MockReportTargetType;
  targetId?: string;
  targetName?: string;
  category: string;
  details: string;
}

interface MockRoleContextValue {
  role: MockRole;
  setRole: (role: MockRole) => void;
  isAdminLike: boolean;
  isDeveloper: boolean;
  reports: MockReport[];
  openReports: MockReport[];
  addReport: (report: CreateMockReportInput) => MockReport;
  getReportsForTarget: (targetType: MockReportTargetType, targetId?: string, targetName?: string) => MockReport[];
}

const VALID_ROLES: MockRole[] = ['user', 'admin', 'developer'];

const MockRoleContext = createContext<MockRoleContextValue | undefined>(undefined);

function readStoredRole(): MockRole {
  if (typeof window === 'undefined') return 'user';
  const storedRole = window.localStorage.getItem(MOCK_ROLE_STORAGE_KEY);
  return VALID_ROLES.includes(storedRole as MockRole) ? (storedRole as MockRole) : 'user';
}

function readStoredReports(): MockReport[] {
  if (typeof window === 'undefined') return [];

  try {
    const storedReports = window.localStorage.getItem(MOCK_REPORTS_STORAGE_KEY);
    if (!storedReports) return [];

    const parsedReports = JSON.parse(storedReports);
    return Array.isArray(parsedReports) ? parsedReports.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function createReportId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `mock-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MockRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<MockRole>(() => readStoredRole());
  const [reports, setReports] = useState<MockReport[]>(() => readStoredReports());

  useEffect(() => {
    const syncFromStorage = () => {
      setRoleState(readStoredRole());
      setReports(readStoredReports());
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  const setRole = useCallback((nextRole: MockRole) => {
    window.localStorage.setItem(MOCK_ROLE_STORAGE_KEY, nextRole);
    setRoleState(nextRole);
  }, []);

  const addReport = useCallback((input: CreateMockReportInput) => {
    const report: MockReport = {
      id: createReportId(),
      targetType: input.targetType,
      targetId: input.targetId,
      targetName: input.targetName,
      category: input.category,
      details: input.details,
      createdAt: new Date().toISOString(),
      status: 'open',
    };

    setReports((currentReports) => {
      const nextReports = [report, ...currentReports];
      window.localStorage.setItem(MOCK_REPORTS_STORAGE_KEY, JSON.stringify(nextReports));
      return nextReports;
    });

    return report;
  }, []);

  const getReportsForTarget = useCallback((targetType: MockReportTargetType, targetId?: string, targetName?: string) => {
    return reports.filter((report) => {
      if (report.targetType !== targetType) return false;
      if (targetId && report.targetId) return report.targetId === targetId;
      if (targetName && report.targetName) return report.targetName === targetName;
      return false;
    });
  }, [reports]);

  const value = useMemo<MockRoleContextValue>(() => {
    const openReports = reports.filter((report) => report.status === 'open');

    return {
      role,
      setRole,
      isAdminLike: role === 'admin' || role === 'developer',
      isDeveloper: role === 'developer',
      reports,
      openReports,
      addReport,
      getReportsForTarget,
    };
  }, [addReport, getReportsForTarget, reports, role, setRole]);

  return <MockRoleContext.Provider value={value}>{children}</MockRoleContext.Provider>;
}

export function useMockRole() {
  const context = useContext(MockRoleContext);
  if (!context) {
    throw new Error('useMockRole must be used within MockRoleProvider');
  }
  return context;
}
