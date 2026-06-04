import { useCallback, useEffect, useMemo, useState } from 'react';

export const MOCK_COMMS_STORAGE_KEY = 'stackatlas.mockCommsState';

type CommsKind = 'notification' | 'dm' | 'quarter';

export interface MockCommsItem {
  id: string;
  kind: CommsKind;
  label: string;
  title: string;
  preview: string;
  timestamp: string;
  iconType?: 'substance' | 'status' | 'reply' | 'helpful' | 'gold' | 'mention' | 'quarter';
  unreadByDefault: boolean;
}

interface MockCommsState {
  readIds: string[];
  badgeViewed: boolean;
}

const now = Date.now();

export const MOCK_NOTIFICATIONS: MockCommsItem[] = [
  {
    id: 'notif-caffeine-status',
    kind: 'notification',
    label: 'Followed substance update',
    title: 'Caffeine status summary updated',
    preview: 'New structured notes were added for tolerance and common administration patterns.',
    timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
    iconType: 'substance',
    unreadByDefault: true,
  },
  {
    id: 'notif-reply-sleep',
    kind: 'notification',
    label: 'Discussion activity',
    title: 'sable_lane replied in Sleep Optimization',
    preview: '“Timing seems more important than adding more ingredients.”',
    timestamp: new Date(now - 1000 * 60 * 120).toISOString(),
    iconType: 'reply',
    unreadByDefault: false,
  },
  {
    id: 'notif-helpful-creatine',
    kind: 'notification',
    label: 'Helpful activity',
    title: 'Your creatine note was marked helpful',
    preview: 'Three readers marked your comment helpful in the Strength & Muscle thread.',
    timestamp: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    iconType: 'helpful',
    unreadByDefault: false,
  },
  {
    id: 'notif-gold-following',
    kind: 'notification',
    label: 'Gold Dispatch activity',
    title: 'evcross_fit posted a Gold Dispatch',
    preview: 'A followed researcher published a structured Dispatch on sleep and recovery.',
    timestamp: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    iconType: 'gold',
    unreadByDefault: true,
  },
];

export const MOCK_DIRECT_MESSAGES: MockCommsItem[] = [
  {
    id: 'dm-marlow',
    kind: 'dm',
    label: 'marlow_notes',
    title: 'marlow_notes',
    preview: 'Saw your note on creatine timing. Are you tracking training days separately?',
    timestamp: new Date(now - 1000 * 60 * 24).toISOString(),
    unreadByDefault: true,
  },
  {
    id: 'dm-sable',
    kind: 'dm',
    label: 'sable_lane',
    title: 'sable_lane',
    preview: 'I can share the sleep stack comparison template if helpful.',
    timestamp: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
    unreadByDefault: false,
  },
  {
    id: 'dm-arden',
    kind: 'dm',
    label: 'arden_index',
    title: 'arden_index',
    preview: 'The brand testing trail you mentioned is a useful review signal.',
    timestamp: new Date(now - 1000 * 60 * 60 * 20).toISOString(),
    unreadByDefault: true,
  },
];

export const MOCK_QUARTER_UPDATES: MockCommsItem[] = [
  {
    id: 'quarter-mention-sleep',
    kind: 'quarter',
    label: 'Sleep Optimization',
    title: '@admin mentioned in Sleep Optimization',
    preview: '@admin the Deep Sleep Protocol thread could use your classification note.',
    timestamp: new Date(now - 1000 * 60 * 38).toISOString(),
    iconType: 'mention',
    unreadByDefault: true,
  },
  {
    id: 'quarter-followed-bodybuilding',
    kind: 'quarter',
    label: 'Bodybuilding',
    title: 'New followed Quarter activity',
    preview: 'A new discussion compared creatine consistency, hydration, and recovery logs.',
    timestamp: new Date(now - 1000 * 60 * 75).toISOString(),
    iconType: 'quarter',
    unreadByDefault: true,
  },
  {
    id: 'quarter-peptide-review',
    kind: 'quarter',
    label: 'Peptide Research',
    title: 'Peptide Research weekly review',
    preview: 'Members flagged three threads for clearer sourcing and safety language.',
    timestamp: new Date(now - 1000 * 60 * 60 * 9).toISOString(),
    iconType: 'quarter',
    unreadByDefault: false,
  },
];

export const MOCK_COMMS_ITEMS = [...MOCK_NOTIFICATIONS, ...MOCK_DIRECT_MESSAGES, ...MOCK_QUARTER_UPDATES];

function readState(): MockCommsState {
  if (typeof window === 'undefined') return { readIds: [], badgeViewed: false };

  try {
    const stored = window.localStorage.getItem(MOCK_COMMS_STORAGE_KEY);
    if (!stored) return { readIds: [], badgeViewed: false };
    const parsed = JSON.parse(stored);
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
      badgeViewed: Boolean(parsed?.badgeViewed),
    };
  } catch {
    return { readIds: [], badgeViewed: false };
  }
}

function writeState(state: MockCommsState) {
  window.localStorage.setItem(MOCK_COMMS_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('stackatlas:mockCommsStateChanged'));
}

export function useMockComms() {
  const [state, setState] = useState<MockCommsState>(() => readState());

  useEffect(() => {
    const sync = () => setState(readState());
    window.addEventListener('storage', sync);
    window.addEventListener('stackatlas:mockCommsStateChanged', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('stackatlas:mockCommsStateChanged', sync);
    };
  }, []);

  const readIds = useMemo(() => new Set(state.readIds), [state.readIds]);

  const isUnread = useCallback((item: MockCommsItem) => item.unreadByDefault && !readIds.has(item.id), [readIds]);

  const unreadItems = useMemo(() => MOCK_COMMS_ITEMS.filter(isUnread), [isUnread]);
  const unreadBadgeCount = state.badgeViewed ? 0 : unreadItems.length;

  const updateState = useCallback((updater: (current: MockCommsState) => MockCommsState) => {
    setState((current) => {
      const next = updater(current);
      writeState(next);
      return next;
    });
  }, []);

  const markItemRead = useCallback((id: string) => {
    updateState((current) => current.readIds.includes(id)
      ? current
      : { ...current, readIds: [...current.readIds, id] });
  }, [updateState]);

  const markInboxViewed = useCallback(() => {
    updateState((current) => current.badgeViewed ? current : { ...current, badgeViewed: true });
  }, [updateState]);

  return {
    notifications: MOCK_NOTIFICATIONS,
    directMessages: MOCK_DIRECT_MESSAGES,
    quarterUpdates: MOCK_QUARTER_UPDATES,
    unreadBadgeCount,
    isUnread,
    markItemRead,
    markInboxViewed,
  };
}
