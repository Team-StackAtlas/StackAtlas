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
  quarterSetMemberRole,
  quarterRemoveMember,
  quarterModerateMessage,
  uploadCommsImageOrFile,
  getCommsAttachmentDownloadUrl,
  type CommsConversationDTO,
  type CommsMessageDTO,
  type CommsProfileDTO,
  type CommsQuarterDTO,
  type CommsQuarterMemberDTO,
  type CommsQuarterMessageDTO,
  type CommsQuarterInviteDTO,
  type CommsAttachmentDTO,
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
// Fallback heartbeat while Realtime is connected -- postgres_changes should
// make polling redundant, but this catches anything the channel misses
// (e.g. a dropped connection that hasn't reported an error yet).
const REFRESH_INTERVAL_REALTIME_MS = 60000;
// Coalesces bursts of postgres_changes events (e.g. several DMs in a row)
// into a single refresh() call instead of one per row.
const REALTIME_DEBOUNCE_MS = 300;

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

function toCommsAttachment(attachment: CommsAttachmentDTO): CommsAttachment {
  return {
    id: attachment.id,
    type: attachment.mimeType.startsWith('image/') ? 'image' : 'file',
    name: attachment.fileName,
    url: attachment.url ?? '',
    mimeType: attachment.mimeType,
    size: attachment.fileSize,
    storagePath: attachment.storagePath,
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

  const [pollIntervalMs, setPollIntervalMs] = useState(REFRESH_INTERVAL_MS);

  useEffect(() => {
    if (!usingReal) return;
    void refresh();
    const interval = window.setInterval(() => void refresh(), pollIntervalMs);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [usingReal, refresh, pollIntervalMs]);

  // Realtime: one channel per signed-in session, subscribed to the events
  // that can change what refresh() would load. Payloads aren't read -- any
  // matching event is just a signal to re-run the existing RLS-scoped
  // refresh() (debounced so a burst of inserts collapses into one refetch).
  // While SUBSCRIBED, the poll above stretches to a 60s fallback heartbeat;
  // if the channel errors/closes/times out, it drops back to 15s.
  useEffect(() => {
    if (!usingReal || !supabase || !user) return;
    let debounceTimer: number | undefined;
    const debouncedRefresh = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void refresh(), REALTIME_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel(`comms-realtime-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debouncedRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quarter_messages' }, debouncedRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quarter_invites' }, debouncedRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, debouncedRefresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, debouncedRefresh)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setPollIntervalMs(REFRESH_INTERVAL_REALTIME_MS);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setPollIntervalMs(REFRESH_INTERVAL_MS);
        }
      });

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      setPollIntervalMs(REFRESH_INTERVAL_MS);
      void supabase!.removeChannel(channel);
    };
  }, [usingReal, user, refresh]);

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
      attachments: m.attachments.map(toCommsAttachment),
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
      attachments: m.deleted ? [] : m.attachments.map(toCommsAttachment),
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

  // Persisted-only: creates the message (body may be empty -- an
  // attachment-only send is allowed) then uploads the file against that
  // message's id, patching the attachment onto the already-inserted local
  // message once the upload completes.
  const sendAttachment = useCallback(
    async (target: { conversationId?: string; quarterId?: string }, file: File, body: string) => {
      if (!usingReal || !user) return;
      if (target.quarterId) {
        const quarterId = target.quarterId;
        const message = await sendQuarterMessage(supabase!, quarterId, user.id, body.trim());
        setRealQuarterMessages((current) => [...current, message]);
        const attachment = await uploadCommsImageOrFile(supabase!, {
          scope: { type: 'quarter', id: quarterId },
          messageId: message.id,
          file,
        });
        setRealQuarterMessages((current) =>
          current.map((m) => (m.id === message.id ? { ...m, attachments: [...m.attachments, attachment] } : m)),
        );
        return;
      }
      if (!target.conversationId) return;
      const conversationId = target.conversationId;
      const message = await sendCommsMessage(supabase!, conversationId, user.id, body.trim());
      setRealMessages((current) => [...current, message]);
      const attachment = await uploadCommsImageOrFile(supabase!, {
        scope: { type: 'dm', id: conversationId },
        messageId: message.id,
        file,
      });
      setRealMessages((current) =>
        current.map((m) => (m.id === message.id ? { ...m, attachments: [...m.attachments, attachment] } : m)),
      );
    },
    [usingReal, user],
  );

  // Persisted-only: fetches a fresh signed URL for a non-image attachment's
  // storage path (see toCommsAttachment -- non-image attachments carry no
  // eager url) so the UI can open/download it on click.
  const getAttachmentDownloadUrl = useCallback(
    (storagePath: string) => {
      if (!usingReal || !supabase) return Promise.reject(new Error('Attachments are not available.'));
      return getCommsAttachmentDownloadUrl(supabase, storagePath);
    },
    [usingReal],
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

  // Phase 3 in-quarter governance. Mock branches reuse useMockComms's
  // functions unchanged; real branches call the quarter_* RPCs and patch
  // local state directly (not a full refresh()) so a soft-deleted message
  // stays visible-as-deleted to the actor for a possible restore -- a
  // refresh() would re-run loadQuarters, whose query excludes deleted_at
  // rows entirely and would make it disappear even for the owner/moderator.
  const promoteQuarterModerator = useCallback(
    (quarterId: string, userId: string) => {
      if (!usingReal) {
        mock.promoteQuarterModerator(quarterId, userId);
        return Promise.resolve();
      }
      return quarterSetMemberRole(supabase!, quarterId, userId, 'quarter_moderator').then(() => {
        setRealQuarterMembers((current) =>
          current.map((m) =>
            m.quarterId === quarterId && m.userId === userId
              ? { ...m, role: 'quarter_moderator' }
              : m,
          ),
        );
      });
    },
    [usingReal, mock],
  );

  const removeQuarterModerator = useCallback(
    (quarterId: string, userId: string) => {
      if (!usingReal) {
        mock.removeQuarterModerator(quarterId, userId);
        return Promise.resolve();
      }
      return quarterSetMemberRole(supabase!, quarterId, userId, 'quarter_member').then(() => {
        setRealQuarterMembers((current) =>
          current.map((m) =>
            m.quarterId === quarterId && m.userId === userId
              ? { ...m, role: 'quarter_member' }
              : m,
          ),
        );
      });
    },
    [usingReal, mock],
  );

  const removeQuarterMember = useCallback(
    (quarterId: string, userId: string) => {
      if (!usingReal) {
        mock.removeQuarterMember(quarterId, userId);
        return Promise.resolve();
      }
      return quarterRemoveMember(supabase!, quarterId, userId).then(() => {
        setRealQuarterMembers((current) =>
          current.filter((m) => !(m.quarterId === quarterId && m.userId === userId)),
        );
      });
    },
    [usingReal, mock],
  );

  const deleteQuarterMessage = useCallback(
    (messageId: string) => {
      if (!usingReal) {
        mock.deleteQuarterMessage(messageId);
        return Promise.resolve();
      }
      return quarterModerateMessage(supabase!, messageId, 'soft_delete').then(() => {
        setRealQuarterMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, deleted: true } : m)),
        );
      });
    },
    [usingReal, mock],
  );

  const restoreQuarterMessage = useCallback(
    (messageId: string) => {
      if (!usingReal) return Promise.resolve();
      return quarterModerateMessage(supabase!, messageId, 'restore').then(() => {
        setRealQuarterMessages((current) =>
          current.map((m) => (m.id === messageId ? { ...m, deleted: false } : m)),
        );
      });
    },
    [usingReal],
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
    sendAttachment,
    getAttachmentDownloadUrl,
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
    promoteQuarterModerator,
    removeQuarterModerator,
    removeQuarterMember,
    deleteQuarterMessage,
    restoreQuarterMessage,
  };
}
