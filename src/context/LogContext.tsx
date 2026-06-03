import React, { createContext, useContext, useState, useEffect } from 'react';

export type Frequency = 'everyday' | 'most_days' | 'some_days' | 'custom';
export type TimeType = 'exact' | 'approximate';

export interface CustomSchedule {
  type: 'days_of_week' | 'interval' | 'cycle';
  daysOfWeek?: number[];
  intervalWeeks?: number;
  intervalDays?: number;
  cycleOnDays?: number;
  cycleOffDays?: number;
}

export interface IntakeLog {
  id: string;
  substanceId?: string; // linked approved substance
  stackId?: string; // linked approved stack
  substance?: string; // legacy
  brand?: string; // legacy
  date: string; // ISO date string
  time: string; // e.g., "09:00"
  dose: string;
  unit: string;
  route: string;
  frequencyNote?: string;
  linkedGoal?: string;
  shortNote?: string;
  
  // legacy fields
  startDate?: string;
  endDate?: string;
  frequency?: Frequency;
  customSchedule?: CustomSchedule;
  timeType?: TimeType;
}

export interface PrivateNote {
  id: string;
  title: string;
  body: string;
  dateCreated: string;
  lastEdited: string;
  linkedSubstanceId?: string;
  linkedStackId?: string;
  linkedDate?: string;
}

interface LogContextType {
  logs: IntakeLog[];
  addLog: (log: Omit<IntakeLog, 'id'>) => void;
  editLog: (id: string, log: Partial<IntakeLog>) => void;
  deleteLog: (id: string) => void;
  
  notes: PrivateNote[];
  addNote: (note: Omit<PrivateNote, 'id' | 'dateCreated' | 'lastEdited'>) => void;
  editNote: (id: string, note: Partial<PrivateNote>) => void;
  deleteNote: (id: string) => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

// Safely read a JSON array from localStorage. A corrupted entry returns []
// instead of throwing during render (which would white-screen the app).
function readStoredArray<T>(key: string): T[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<IntakeLog[]>(() => readStoredArray<IntakeLog>('user_logs'));
  const [notes, setNotes] = useState<PrivateNote[]>(() => readStoredArray<PrivateNote>('user_notes'));

  useEffect(() => {
    localStorage.setItem('user_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('user_notes', JSON.stringify(notes));
  }, [notes]);

  const addLog = (log: Omit<IntakeLog, 'id'>) => {
    const newLog = { ...log, id: Math.random().toString(36).substring(2, 9) };
    setLogs(prev => [...prev, newLog]);
  };

  const editLog = (id: string, updatedLog: Partial<IntakeLog>) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...updatedLog } : l));
  };

  const deleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const addNote = (note: Omit<PrivateNote, 'id' | 'dateCreated' | 'lastEdited'>) => {
    const newNote: PrivateNote = {
      ...note,
      id: Math.random().toString(36).substring(2, 9),
      dateCreated: new Date().toISOString(),
      lastEdited: new Date().toISOString(),
    };
    setNotes(prev => [...prev, newNote]);
  };

  const editNote = (id: string, updatedNote: Partial<PrivateNote>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updatedNote, lastEdited: new Date().toISOString() } : n));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <LogContext.Provider value={{ logs, addLog, editLog, deleteLog, notes, addNote, editNote, deleteNote }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
}
