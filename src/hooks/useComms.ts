// Mirrors useMockComms's interface so Comms.tsx stays a thin consumer.
//
// DM conversations/messages and Quarters both come from Supabase when the
// backend is configured and the viewer is signed in; mock demo DMs and
// Quarters are hidden in that case. Otherwise everything falls back to the
// mock hook, unchanged.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isBackendConfigured } from '../services/supabase/client';
import { useAuth } from '../context/AuthContext';
import {
  loadComms,
  searchProfiles,
  sendCommsMessage,
  createConversationRequest,
  respondToRequest,
  markConversationRead as markConversationReadRemote,
  loadQuarters,
  sendQuarterMessage,
  createQuarterRemote,
  inviteToQuarterRemote,
  respondToQuarterInvite as respondToQuarterInviteRemote,
  leaveQuarterRemote,
  markQuarterReadRemote,
  type CommsConversationDTO,
  type CommsMessageDTO,
  type CommsProfileDTO,
  type CommsQuarterDTO,
  type CommsQuarterMemberDTO,
  type CommsQuarterMessageDTO,
  type CommsQuarterInviteDTO,
} from '../services/comms';
import {
  useMockComms,
  type CommsAttachment,
  type CommsConversation,
  type CommsMessage,
  type CommsUser,
  type Quarter,
} from './useMockComms';

export type { CommsAttachment, CommsConversation, CommsMessage, CommsUser, Quarter } from './useMockComms';
export type { CommsQuarterInviteDTO } from '../services/comms';

const REFRESH_INTERVAL_MS = 15000;

function avatarInitial(username?: string) {
  return (username?.[0] ?? '?').toUpperCase();
}

function toCommsUser(profile: CommsProfileDTO): CommsUser {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName ?? profile.username,
    avatarInitial: avatarInitial(profile.username),
  };
}

export function useComms(searchQuery: string) {
  const mock = useMockComms();
  const { user } = useAuth();
  const usingReal = isBackendConfigured && !!supabase && !!user;

  const [realConversations, setRealConversations] = useState<CommsConversationDTO[]>([]);
  const [realMessages, setRealMessages] = useState<CommsMessageDTO[]>([]);
  const [realProfiles, setRealProfiles] = useState<CommsProfileDTO[]>([]);
  const [lastReadAt, setLastReadAt] = useState<Record<string, string | null>>({});
  const [searchResults, setSearchResults] = useState<CommsProfileDTO[]>([]);

  const [realQuarters, setRealQuarters] = useState<CommsQuarterDTO[]>([]);
  const [realQuarterMembers, setRealQuarterMembers] = useState<CommsQuarterMemberDTO[]>([]);
  const [realQuarterMessages, setRealQuarterMessages] = useState<CommsQuarterMessageDTO[]>([]);
  const [realQuarterProfiles, setRealQuarterProfiles] = useState<CommsProfileDTO[]>([]);
  const [quarterLastReadAt, setQuarterLastReadAt] = useState<Record<string, string | null>>({});
  const [quarterInvites, setQuarterInvites] = useState<CommsQuarterInviteDTO[]>([]);

  const refresh = useCallback(async () => {
    if (!usingReal || !supabase || !user) return;
    try {
      const [result, quarterResult] = await Promise.all([
        loadComms(supabase, user.id),
        loadQuarters(supabase, user.id),
      ]);
      await Promise.resolve().then(() => {
        setRealConversations(result.conversations);
        setRealMessages(result.messages);
        setRealProfiles(result.profiles);
        setLastReadAt(result.lastReadAt);
        setRealQuarters(quarterResult.quarters);
        setRealQuarterMembers(quarterResult.members);
        setRealQuarterMessages(quarterResult.messages);
        setRealQuarterProfiles(quarterResult.profiles);
        setQuarterLastReadAt(quarterResult.lastReadAt);
        setQuarterInvites(quarterResult.invites);
      });
    } catch (err) {
      console.warn('Comms refresh failed:', err);
    }
  }, [usingReal, user]);

  useEffect(() => {
    if (!usingReal) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [usingReal, refresh]);

  // Debounced live profile search for the DM search box (real mode only).
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!usingReal || !supabase || !user || !trimmed) {
      void Promise.resolve().then(() => setSearchResults([]));
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchProfiles(supabase!, trimmed, user.id)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .catch((err) => console.warn('Comms search failed:', err));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [usingReal, searchQuery, user]);

  const viewerId = usingReal && user ? user.id : mock.viewerId;

  const profileMap = useMemo(() => {
    const map = new Map<string, CommsUser>();
    realProfiles.forEach((profile) => map.set(profile.id, toCommsUser(profile)));
    realQuarterProfiles.forEach((profile) => map.set(profile.id, toCommsUser(profile)));
    if (usingReal && user) {
      map.set(user.id, toCommsUser({ id: user.id, username: user.username }));
    }
    return map;
  }, [realProfiles, realQuarterProfiles, usingReal, user]);

  const getUser = useCallback(
    (id: string): CommsUser | undefined => profileMap.get(id) ?? mock.getUser(id),
    [profileMap, mock],
  );

  const conversations: CommsConversation[] = useMemo(() => {
    if (!usingReal) return mock.conversations;
    return realConversations.map((c) => ({
      id: c.id,
      participantIds: [viewerId, c.otherUserId],
      accepted: c.status === 'accepted',
      declined: c.status === 'declined',
      requestedBy: c.requestedBy ?? undefined,
      typingUserIds: [],
      persisted: true,
    }));
  }, [usingReal, realConversations, viewerId, mock.conversations]);

  const quarters: Quarter[] = useMemo(() => {
    if (!usingReal) return mock.quarters;
    return realQuarters.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description ?? undefined,
      ownerId: q.ownerId,
      adminIds: realQuarterMembers
        .filter((m) => m.quarterId === q.id && m.role === 'quarter_moderator')
        .map((m) => m.userId),
      memberIds: realQuarterMembers.filter((m) => m.quarterId === q.id).map((m) => m.userId),
      invitedUserIds: [],
      declinedUserIds: [],
      typingUserIds: [],
      persisted: true,
    }));
  }, [usingReal, realQuarters, realQuarterMembers, mock.quarters]);

  const messages: CommsMessage[] = useMemo(() => {
    if (!usingReal) return mock.messages;
    const dmMessages: CommsMessage[] = realMessages.map((m) => ({
      id: m.id,
      scope: 'dm',
      conversationId: m.conversationId,
      senderId: m.senderId,
      kind: 'text',
      body: m.body,
      createdAt: m.createdAt,
      readBy: [],
      reactions: {},
      persisted: true,
    }));
    const quarterMessages: CommsMessage[] = realQuarterMessages.map((m) => ({
      id: m.id,
      scope: 'quarter',
      quarterId: m.quarterId,
      senderId: m.senderId,
      kind: 'text',
      body: m.deleted ? '[deleted]' : m.body,
      createdAt: m.createdAt,
      readBy: [],
      reactions: {},
      deleted: m.deleted,
      persisted: true,
    }));
    return [...dmMessages, ...quarterMessages];
  }, [usingReal, realMessages, realQuarterMessages, mock.messages]);

  const unreadConversationCount = useCallback(
    (conversationId: string) => {
      if (!usingReal) return mock.unreadConversationCount(conversationId);
      const readAt = lastReadAt[conversationId];
      return realMessages.filter(
        (m) =>
          m.conversationId === conversationId &&
          m.senderId !== viewerId &&
          (!readAt || new Date(m.createdAt) > new Date(readAt)),
      ).length;
    },
    [usingReal, mock, lastReadAt, realMessages, viewerId],
  );

  const unreadQuarterCount = useCallback(
    (quarterId: string) => {
      if (!usingReal) return mock.unreadQuarterCount(quarterId);
      const readAt = quarterLastReadAt[quarterId];
      return realQuarterMessages.filter(
        (m) =>
          m.quarterId === quarterId &&
          m.senderId !== viewerId &&
          (!readAt || new Date(m.createdAt) > new Date(readAt)),
      ).length;
    },
    [usingReal, mock, quarterLastReadAt, realQuarterMessages, viewerId],
  );

  const counts = useMemo(() => {
    if (!usingReal) return mock.counts;
    const messagesUnread = realConversations
      .filter((c) => c.status === 'accepted')
      .reduce((sum, c) => sum + unreadConversationCount(c.id), 0);
    const requests = realConversations.filter(
      (c) => c.status === 'requested' && c.requestedBy !== viewerId,
    ).length;
    const quarters =
      realQuarters.reduce((sum, q) => sum + unreadQuarterCount(q.id), 0) + quarterInvites.length;
    return { messages: messagesUnread, requests, quarters, total: messagesUnread + requests + quarters };
  }, [usingReal, realConversations, unreadConversationCount, viewerId, realQuarters, unreadQuarterCount, quarterInvites, mock.counts]);

  const sendMessage = useCallback(
    async (target: { conversationId?: string; quarterId?: string }, body: string, attachment?: CommsAttachment) => {
      if (!usingReal) {
        mock.sendMessage(target, body, attachment);
        return;
      }
      if (!user || !body.trim()) return;
      if (target.quarterId) {
        const message = await sendQuarterMessage(supabase!, target.quarterId, user.id, body.trim());
        setRealQuarterMessages((current) => [...current, message]);
        return;
      }
      if (!target.conversationId) return;
      const message = await sendCommsMessage(supabase!, target.conversationId, user.id, body.trim());
      setRealMessages((current) => [...current, message]);
    },
    [usingReal, mock, user],
  );

  const markQuarterRead = useCallback(
    (quarterId: string) => {
      if (!usingReal) {
        mock.markQuarterRead(quarterId);
        return;
      }
      setQuarterLastReadAt((current) => ({ ...current, [quarterId]: new Date().toISOString() }));
      void markQuarterReadRemote(supabase!, quarterId).catch((err) =>
        console.warn('Failed to mark quarter read:', err),
      );
    },
    [usingReal, mock],
  );

  const createQuarter = useCallback(
    (title: string, description: string) => {
      if (!usingReal) {
        mock.createQuarter(title, description);
        return;
      }
      void createQuarterRemote(supabase!, title, description)
        .then(() => refresh())
        .catch((err) => console.warn('Failed to create quarter:', err));
    },
    [usingReal, mock, refresh],
  );

  const inviteToQuarterByUsername = useCallback(
    (quarterId: string, username: string) => {
      if (!usingReal || !username.trim()) return;
      void inviteToQuarterRemote(supabase!, quarterId, username.trim())
        .then(() => refresh())
        .catch((err) => console.warn('Failed to invite to quarter:', err));
    },
    [usingReal, refresh],
  );

  const acceptQuarterInvite = useCallback(
    (id: string) => {
      if (!usingReal) {
        mock.acceptQuarterInvite(id);
        return;
      }
      setQuarterInvites((current) => current.filter((invite) => invite.id !== id));
      void respondToQuarterInviteRemote(supabase!, id, true)
        .then(() => refresh())
        .catch((err) => {
          console.warn('Failed to accept quarter invite:', err);
          void refresh();
        });
    },
    [usingReal, mock, refresh],
  );

  const declineQuarterInvite = useCallback(
    (inviteId: string) => {
      if (!usingReal) return;
      setQuarterInvites((current) => current.filter((invite) => invite.id !== inviteId));
      void respondToQuarterInviteRemote(supabase!, inviteId, false)
        .then(() => refresh())
        .catch((err) => {
          console.warn('Failed to decline quarter invite:', err);
          void refresh();
        });
    },
    [usingReal, refresh],
  );

  const leaveQuarter = useCallback(
    (quarterId: string) => {
      if (!usingReal) {
        mock.leaveQuarter(quarterId);
        return;
      }
      void leaveQuarterRemote(supabase!, quarterId)
        .then(() => refresh())
        .catch((err) => console.warn('Failed to leave quarter:', err));
    },
    [usingReal, mock, refresh],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!usingReal) {
        mock.markConversationRead(conversationId);
        return;
      }
      setLastReadAt((current) => ({ ...current, [conversationId]: new Date().toISOString() }));
      void markConversationReadRemote(supabase!, conversationId).catch((err) =>
        console.warn('Failed to mark conversation read:', err),
      );
    },
    [usingReal, mock],
  );

  const acceptRequest = useCallback(
    (conversationId: string) => {
      if (!usingReal) {
        mock.acceptRequest(conversationId);
        return;
      }
      setRealConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, status: 'accepted' } : c)),
      );
      void respondToRequest(supabase!, conversationId, true)
        .then(() => refresh())
        .catch((err) => {
          console.warn('Failed to accept request:', err);
          void refresh();
        });
    },
    [usingReal, mock, refresh],
  );

  const declineRequest = useCallback(
    (conversationId: string) => {
      if (!usingReal) {
        mock.declineRequest(conversationId);
        return;
      }
      setRealConversations((current) =>
        current.map((c) => (c.id === conversationId ? { ...c, status: 'declined' } : c)),
      );
      void respondToRequest(supabase!, conversationId, false)
        .then(() => refresh())
        .catch((err) => {
          console.warn('Failed to decline request:', err);
          void refresh();
        });
    },
    [usingReal, mock, refresh],
  );

  const startConversation = useCallback(
    (userId: string) => {
      if (!usingReal) {
        mock.startConversation(userId);
        return;
      }
      void createConversationRequest(supabase!, userId)
        .then(() => refresh())
        .catch((err) => console.warn('Failed to start conversation:', err));
    },
    [usingReal, mock, refresh],
  );

  const searchUsers: CommsUser[] = usingReal ? searchResults.map(toCommsUser) : mock.users;

  return {
    ...mock,
    viewerId,
    conversations,
    messages,
    quarters,
    quarterInvites: usingReal ? quarterInvites : [],
    searchUsers,
    getUser,
    unreadConversationCount,
    unreadQuarterCount,
    counts,
    sendMessage,
    markConversationRead,
    markQuarterRead,
    acceptRequest,
    declineRequest,
    startConversation,
    createQuarter,
    inviteToQuarterByUsername,
    acceptQuarterInvite,
    declineQuarterInvite,
    leaveQuarter,
  };
}
