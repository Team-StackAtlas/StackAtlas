// Mirrors useMockComms's interface so Comms.tsx stays a thin consumer.
//
// Quarters and their messages always come from useMockComms (phase 1 does
// not wire Quarters to Supabase). DM conversations/messages come from
// Supabase when the backend is configured and the viewer is signed in;
// mock demo DM conversations are hidden in that case. Otherwise everything
// (including DMs) falls back to the mock hook, unchanged.

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
  type CommsConversationDTO,
  type CommsMessageDTO,
  type CommsProfileDTO,
} from '../services/comms';
import {
  useMockComms,
  type CommsAttachment,
  type CommsConversation,
  type CommsMessage,
  type CommsUser,
} from './useMockComms';

export type { CommsAttachment, CommsConversation, CommsMessage, CommsUser, Quarter } from './useMockComms';

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

  const refresh = useCallback(async () => {
    if (!usingReal || !supabase || !user) return;
    try {
      const result = await loadComms(supabase, user.id);
      await Promise.resolve().then(() => {
        setRealConversations(result.conversations);
        setRealMessages(result.messages);
        setRealProfiles(result.profiles);
        setLastReadAt(result.lastReadAt);
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
    if (usingReal && user) {
      map.set(user.id, toCommsUser({ id: user.id, username: user.username }));
    }
    return map;
  }, [realProfiles, usingReal, user]);

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

  const messages: CommsMessage[] = useMemo(() => {
    const quarterMessages = mock.messages.filter((m) => m.scope === 'quarter');
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
    return [...dmMessages, ...quarterMessages];
  }, [usingReal, realMessages, mock.messages]);

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

  const counts = useMemo(() => {
    if (!usingReal) return mock.counts;
    const messagesUnread = realConversations
      .filter((c) => c.status === 'accepted')
      .reduce((sum, c) => sum + unreadConversationCount(c.id), 0);
    const requests = realConversations.filter(
      (c) => c.status === 'requested' && c.requestedBy !== viewerId,
    ).length;
    const quarters = mock.counts.quarters;
    return { messages: messagesUnread, requests, quarters, total: messagesUnread + requests + quarters };
  }, [usingReal, realConversations, unreadConversationCount, viewerId, mock.counts]);

  const sendMessage = useCallback(
    async (target: { conversationId?: string; quarterId?: string }, body: string, attachment?: CommsAttachment) => {
      if (target.quarterId || !usingReal) {
        mock.sendMessage(target, body, attachment);
        return;
      }
      if (!target.conversationId || !user || !body.trim()) return;
      const message = await sendCommsMessage(supabase!, target.conversationId, user.id, body.trim());
      setRealMessages((current) => [...current, message]);
    },
    [usingReal, mock, user],
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
    searchUsers,
    getUser,
    unreadConversationCount,
    counts,
    sendMessage,
    markConversationRead,
    acceptRequest,
    declineRequest,
    startConversation,
  };
}
