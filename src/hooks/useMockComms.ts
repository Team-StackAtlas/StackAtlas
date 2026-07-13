import { useCallback, useEffect, useMemo, useState } from 'react';

export const MOCK_COMMS_STORAGE_KEY = 'stackatlas.mockComms.v2';

export type CommsMessageKind = 'text' | 'image' | 'voice' | 'file';
export type CommsMessageScope = 'dm' | 'quarter';

export interface CommsUser {
  id: string;
  username: string;
  displayName: string;
  avatarInitial: string;
  isPrivate?: boolean;
  followsViewer?: boolean;
  viewerFollows?: boolean;
}

export interface CommsAttachment {
  id: string;
  type: 'image' | 'voice' | 'file';
  name: string;
  url: string;
  mimeType: string;
  size: number;
  durationSeconds?: number;
}

export interface CommsMessage {
  id: string;
  scope: CommsMessageScope;
  conversationId?: string;
  quarterId?: string;
  senderId: string;
  kind: CommsMessageKind;
  body: string;
  createdAt: string;
  readBy: string[];
  attachment?: CommsAttachment;
  reactions: Record<string, string[]>;
  deleted?: boolean;
  /** Set on messages backed by Supabase (see src/hooks/useComms.ts); unset for mock messages. */
  persisted?: boolean;
}

export interface CommsConversation {
  id: string;
  participantIds: string[];
  accepted: boolean;
  requestedBy?: string;
  declined?: boolean;
  typingUserIds: string[];
  /** Set on conversations backed by Supabase (see src/hooks/useComms.ts); unset for mock conversations. */
  persisted?: boolean;
}

export interface Quarter {
  id: string;
  title: string;
  description?: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  invitedUserIds: string[];
  declinedUserIds: string[];
  typingUserIds: string[];
}

interface CommsState {
  users: CommsUser[];
  conversations: CommsConversation[];
  messages: CommsMessage[];
  quarters: Quarter[];
  readConversationIds: string[];
  readQuarterIds: string[];
}

const VIEWER_ID = 'u-viewer';
const now = Date.now();

const seed: CommsState = {
  users: [
    { id: VIEWER_ID, username: 'domonic', displayName: 'Domonic', avatarInitial: 'D' },
    {
      id: 'u-marlow',
      username: 'marlow_notes',
      displayName: 'Marlow Notes',
      avatarInitial: 'M',
      followsViewer: true,
      viewerFollows: true,
    },
    {
      id: 'u-sable',
      username: 'sable_lane',
      displayName: 'Sable Lane',
      avatarInitial: 'S',
      followsViewer: false,
      viewerFollows: true,
    },
    {
      id: 'u-arden',
      username: 'arden_index',
      displayName: 'Arden Index',
      avatarInitial: 'A',
      isPrivate: true,
      followsViewer: false,
      viewerFollows: false,
    },
    {
      id: 'u-evan',
      username: 'evcross_fit',
      displayName: 'Evan Cross',
      avatarInitial: 'E',
      followsViewer: true,
      viewerFollows: false,
    },
  ],
  conversations: [
    {
      id: 'dm-marlow',
      participantIds: [VIEWER_ID, 'u-marlow'],
      accepted: true,
      typingUserIds: ['u-marlow'],
    },
    { id: 'dm-sable', participantIds: [VIEWER_ID, 'u-sable'], accepted: true, typingUserIds: [] },
    {
      id: 'req-evan',
      participantIds: [VIEWER_ID, 'u-evan'],
      accepted: false,
      requestedBy: 'u-evan',
      typingUserIds: [],
    },
  ],
  messages: [
    {
      id: 'msg-marlow-1',
      scope: 'dm',
      conversationId: 'dm-marlow',
      senderId: 'u-marlow',
      kind: 'text',
      body: 'Saw your note on creatine timing. Are you tracking training days separately?',
      createdAt: new Date(now - 1000 * 60 * 24).toISOString(),
      readBy: ['u-marlow'],
      reactions: {},
    },
    {
      id: 'msg-marlow-2',
      scope: 'dm',
      conversationId: 'dm-marlow',
      senderId: VIEWER_ID,
      kind: 'image',
      body: 'Here is the current split.',
      createdAt: new Date(now - 1000 * 60 * 20).toISOString(),
      readBy: [VIEWER_ID, 'u-marlow'],
      reactions: { '👍': ['u-marlow'] },
      attachment: {
        id: 'att-marlow-image',
        type: 'image',
        name: 'training-days.png',
        url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&auto=format&fit=crop',
        mimeType: 'image/png',
        size: 248000,
      },
    },
    {
      id: 'msg-sable-1',
      scope: 'dm',
      conversationId: 'dm-sable',
      senderId: 'u-sable',
      kind: 'voice',
      body: 'Voice note',
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      readBy: [VIEWER_ID, 'u-sable'],
      reactions: {},
      attachment: {
        id: 'att-sable-voice',
        type: 'voice',
        name: 'sleep-template-note.webm',
        url: 'https://www.w3schools.com/html/horse.mp3',
        mimeType: 'audio/mpeg',
        size: 44500,
        durationSeconds: 7,
      },
    },
    {
      id: 'msg-evan-1',
      scope: 'dm',
      conversationId: 'req-evan',
      senderId: 'u-evan',
      kind: 'text',
      body: 'Could I ask a quick question about your recovery log?',
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      readBy: ['u-evan'],
      reactions: {},
    },
    {
      id: 'q-sleep-1',
      scope: 'quarter',
      quarterId: 'quarter-peptides',
      senderId: 'u-sable',
      kind: 'text',
      body: '@domonic the peptide sourcing thread could use your classification note.',
      createdAt: new Date(now - 1000 * 60 * 38).toISOString(),
      readBy: ['u-sable'],
      reactions: {},
    },
    {
      id: 'q-sleep-2',
      scope: 'quarter',
      quarterId: 'quarter-peptides',
      senderId: VIEWER_ID,
      kind: 'file',
      body: 'Added the comparison template.',
      createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
      readBy: [VIEWER_ID],
      reactions: {},
      attachment: {
        id: 'att-quarter-file',
        type: 'file',
        name: 'sleep-stack-template.pdf',
        url: '#',
        mimeType: 'application/pdf',
        size: 128000,
      },
    },
  ],
  quarters: [
    {
      id: 'quarter-peptides',
      title: 'Peptides',
      description: 'Seed Quarter for peptide discussions, owner controls, and report testing.',
      ownerId: VIEWER_ID,
      adminIds: [VIEWER_ID],
      memberIds: [VIEWER_ID, 'u-sable', 'u-marlow'],
      invitedUserIds: ['u-arden'],
      declinedUserIds: [],
      typingUserIds: [],
    },
  ],
  readConversationIds: ['dm-sable'],
  readQuarterIds: [],
};

function readState(): CommsState {
  if (typeof window === 'undefined') return seed;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MOCK_COMMS_STORAGE_KEY) || '');
    return parsed?.users ? parsed : seed;
  } catch {
    return seed;
  }
}

function writeState(state: CommsState) {
  window.localStorage.setItem(MOCK_COMMS_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('stackatlas:mockCommsChanged'));
}

function mentions(body: string) {
  return Array.from(new Set(body.match(/@([a-zA-Z0-9_]+)/g)?.map((m) => m.slice(1)) ?? []));
}

export function useMockComms() {
  const [state, setState] = useState<CommsState>(() => readState());
  useEffect(() => {
    const sync = () => setState(readState());
    window.addEventListener('storage', sync);
    window.addEventListener('stackatlas:mockCommsChanged', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('stackatlas:mockCommsChanged', sync);
    };
  }, []);

  const update = useCallback((updater: (current: CommsState) => CommsState) => {
    setState((current) => {
      const next = updater(current);
      writeState(next);
      return next;
    });
  }, []);

  const getUser = useCallback(
    (id: string) => state.users.find((user) => user.id === id),
    [state.users],
  );
  const unreadConversationCount = useCallback(
    (id: string) =>
      state.messages.filter(
        (m) => m.conversationId === id && m.senderId !== VIEWER_ID && !m.readBy.includes(VIEWER_ID),
      ).length,
    [state.messages],
  );
  const unreadQuarterCount = useCallback(
    (id: string) =>
      state.messages.filter(
        (m) => m.quarterId === id && m.senderId !== VIEWER_ID && !m.readBy.includes(VIEWER_ID),
      ).length,
    [state.messages],
  );

  const sendMessage = (
    target: { conversationId?: string; quarterId?: string },
    body: string,
    attachment?: CommsAttachment,
  ) =>
    update((current) => {
      const scope = target.quarterId ? 'quarter' : 'dm';
      const id = `${scope}-${Date.now()}`;
      const kind = attachment?.type ?? 'text';
      const message: CommsMessage = {
        id,
        scope,
        conversationId: target.conversationId,
        quarterId: target.quarterId,
        senderId: VIEWER_ID,
        kind,
        body: body.trim() || attachment?.name || '',
        createdAt: new Date().toISOString(),
        readBy: [VIEWER_ID],
        attachment,
        reactions: {},
      };
      console.info(
        'Mock notification integration:',
        mentions(message.body).map((username) => `mention:${username}`),
      );
      return { ...current, messages: [...current.messages, message] };
    });

  const markConversationRead = (conversationId: string) =>
    update((current) => ({
      ...current,
      messages: current.messages.map((m) =>
        m.conversationId === conversationId
          ? { ...m, readBy: Array.from(new Set([...m.readBy, VIEWER_ID])) }
          : m,
      ),
      readConversationIds: Array.from(new Set([...current.readConversationIds, conversationId])),
    }));

  const markQuarterRead = (quarterId: string) =>
    update((current) => ({
      ...current,
      messages: current.messages.map((m) =>
        m.quarterId === quarterId
          ? { ...m, readBy: Array.from(new Set([...m.readBy, VIEWER_ID])) }
          : m,
      ),
      readQuarterIds: Array.from(new Set([...current.readQuarterIds, quarterId])),
    }));

  const acceptRequest = (id: string) =>
    update((current) => ({
      ...current,
      conversations: current.conversations.map((c) => (c.id === id ? { ...c, accepted: true } : c)),
    }));
  const declineRequest = (id: string) =>
    update((current) => ({
      ...current,
      conversations: current.conversations.map((c) => (c.id === id ? { ...c, declined: true } : c)),
    }));
  const react = (messageId: string, emoji = '👍') =>
    update((current) => ({
      ...current,
      messages: current.messages.map((m) => {
        if (m.id !== messageId) return m;
        const users = m.reactions[emoji] ?? [];
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [emoji]: users.includes(VIEWER_ID)
              ? users.filter((id) => id !== VIEWER_ID)
              : [...users, VIEWER_ID],
          },
        };
      }),
    }));

  const startConversation = (userId: string) =>
    update((current) => {
      const target = current.users.find((user) => user.id === userId);
      if (!target || (target.isPrivate && !target.followsViewer)) return current;
      const existing = current.conversations.find(
        (c) => c.participantIds.includes(VIEWER_ID) && c.participantIds.includes(userId),
      );
      if (existing) return current;
      const accepted = Boolean(target.followsViewer && target.viewerFollows);
      return {
        ...current,
        conversations: [
          ...current.conversations,
          {
            id: `dm-${userId}`,
            participantIds: [VIEWER_ID, userId],
            accepted,
            requestedBy: VIEWER_ID,
            typingUserIds: [],
          },
        ],
      };
    });

  const createQuarter = (title: string, description: string) =>
    update((current) => ({
      ...current,
      quarters: [
        ...current.quarters,
        {
          id: `quarter-${Date.now()}`,
          title,
          description,
          ownerId: VIEWER_ID,
          adminIds: [VIEWER_ID],
          memberIds: [VIEWER_ID],
          invitedUserIds: [],
          declinedUserIds: [],
          typingUserIds: [],
        },
      ],
    }));
  const inviteToQuarter = (quarterId: string, userId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId
          ? { ...q, invitedUserIds: Array.from(new Set([...q.invitedUserIds, userId])) }
          : q,
      ),
    }));
  const acceptQuarterInvite = (quarterId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId
          ? {
              ...q,
              memberIds: Array.from(new Set([...q.memberIds, VIEWER_ID])),
              invitedUserIds: q.invitedUserIds.filter((id) => id !== VIEWER_ID),
            }
          : q,
      ),
    }));
  const leaveQuarter = (quarterId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId ? { ...q, memberIds: q.memberIds.filter((id) => id !== VIEWER_ID) } : q,
      ),
    }));
  const promoteQuarterModerator = (quarterId: string, userId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId ? { ...q, adminIds: Array.from(new Set([...q.adminIds, userId])) } : q,
      ),
    }));
  const removeQuarterModerator = (quarterId: string, userId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId ? { ...q, adminIds: q.adminIds.filter((id) => id !== userId && id !== q.ownerId) } : q,
      ),
    }));
  const deleteQuarterMessage = (messageId: string) =>
    update((current) => ({
      ...current,
      messages: current.messages.map((m) => (m.id === messageId ? { ...m, deleted: true, body: '[deleted]' } : m)),
    }));
  const removeQuarterMember = (quarterId: string, userId: string) =>
    update((current) => ({
      ...current,
      quarters: current.quarters.map((q) =>
        q.id === quarterId ? { ...q, memberIds: q.memberIds.filter((id) => id !== userId) } : q,
      ),
    }));

  const counts = useMemo(() => {
    const messages = state.conversations
      .filter((c) => c.accepted && !c.declined)
      .reduce((sum, c) => sum + unreadConversationCount(c.id), 0);
    const requests = state.conversations.filter(
      (c) => !c.accepted && !c.declined && c.requestedBy !== VIEWER_ID,
    ).length;
    const quarters =
      state.quarters.reduce((sum, q) => sum + unreadQuarterCount(q.id), 0) +
      state.quarters.filter((q) => q.invitedUserIds.includes(VIEWER_ID)).length;
    return { messages, requests, quarters, total: messages + requests + quarters };
  }, [state.conversations, state.quarters, unreadConversationCount, unreadQuarterCount]);

  return {
    ...state,
    viewerId: VIEWER_ID,
    counts,
    getUser,
    unreadConversationCount,
    unreadQuarterCount,
    sendMessage,
    markConversationRead,
    markQuarterRead,
    acceptRequest,
    declineRequest,
    react,
    startConversation,
    createQuarter,
    inviteToQuarter,
    acceptQuarterInvite,
    leaveQuarter,
    removeQuarterMember,
    promoteQuarterModerator,
    removeQuarterModerator,
    deleteQuarterMessage,
  };
}
