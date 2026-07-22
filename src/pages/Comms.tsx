import { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Image, MessageSquare, Mic, Paperclip, Plus, Search, Send, Shield, Users } from 'lucide-react';
import { useComms, type CommsAttachment, type CommsMessage } from '../hooks/useComms';
import { ReportAction } from '../components/ReportAction';
import { EmptyState } from '../components/EmptyState';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VOICE_SECONDS = 60;
const SAFE_FILES = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_PERSISTED_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const PERSISTED_ATTACHMENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
];

type Tab = 'messages' | 'requests' | 'quarters';

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(value),
  );
}

function bytes(value: number) {
  if (value > 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

type QuarterRole = 'quartermaster' | 'moderator' | null;

/** A member's display role in a quarter: owner > moderator > plain member. */
function quarterRoleOf(quarter: { ownerId: string; adminIds: string[] } | undefined, userId: string): QuarterRole {
  if (!quarter) return null;
  if (quarter.ownerId === userId) return 'quartermaster';
  if (quarter.adminIds.includes(userId)) return 'moderator';
  return null;
}

/** Little role badge shown next to quartermasters and moderators. */
function QuarterRoleBadge({ role }: { role: QuarterRole }) {
  if (!role) return null;
  if (role === 'quartermaster') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" title="Quartermaster (owner)">
        <Crown size={10} /> Quartermaster
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" title="Moderator">
      <Shield size={10} /> Mod
    </span>
  );
}

export default function Comms() {
  const [query, setQuery] = useState('');
  const comms = useComms(query);
  const [tab, setTab] = useState<Tab>('messages');
  const [activeConversationId, setActiveConversationId] = useState('dm-marlow');
  const [activeQuarterId, setActiveQuarterId] = useState('quarter-sleep');
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [quarterTitle, setQuarterTitle] = useState('');
  const [quarterDescription, setQuarterDescription] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [recording, setRecording] = useState(false);
  const recordTimer = useRef<number | undefined>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Counts elapsed seconds while recording (ticked by recordTickInterval
  // below) so the sent attachment can carry an approximate durationSeconds
  // without reading the clock (Date.now) from an event-handler closure.
  const recordSecondsRef = useRef(0);
  const recordTickInterval = useRef<number | undefined>(undefined);
  const [controlsError, setControlsError] = useState('');
  const [attachError, setAttachError] = useState('');
  const [attachSending, setAttachSending] = useState(false);

  // Phase 3 in-quarter governance controls (persisted quarters only): runs
  // an owner/moderator action, optionally confirming first, and surfaces a
  // failure inline instead of silently swallowing it.
  const runQuarterAction = (run: () => Promise<void>, errorMessage: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setControlsError('');
    run().catch((err) => setControlsError(err instanceof Error ? err.message : errorMessage));
  };

  const conversations = comms.conversations.filter(
    (conversation) => conversation.accepted && !conversation.declined,
  );
  const requests = comms.conversations.filter(
    (conversation) =>
      !conversation.accepted &&
      !conversation.declined &&
      conversation.requestedBy !== comms.viewerId,
  );
  // Requests the viewer sent that the other side hasn't accepted yet. These
  // aren't "accepted" so they're excluded from `conversations`, and they
  // aren't incoming so they're excluded from `requests` -- without this list
  // clicking a search result to start a DM would create a conversation that
  // shows up nowhere, looking like the click did nothing.
  const pendingSentConversations = comms.conversations.filter(
    (conversation) =>
      !conversation.accepted &&
      !conversation.declined &&
      conversation.requestedBy === comms.viewerId,
  );
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    pendingSentConversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[0];
  const isPendingSentConversation =
    tab !== 'quarters' &&
    !!activeConversation &&
    !activeConversation.accepted &&
    !activeConversation.declined;
  const activeQuarter =
    comms.quarters.find((quarter) => quarter.id === activeQuarterId) ?? comms.quarters[0];
  // Whether the right-hand panel has an actual thread to show. When this is
  // false (nothing selected/nothing exists yet) we show a placeholder
  // instead of a live composer with no destination to send to.
  const hasActiveThread = tab === 'quarters' ? !!activeQuarter : !!activeConversation;
  const activeMessages = comms.messages.filter(
    (message) => message.conversationId === activeConversation?.id,
  );
  const activeQuarterMessages = comms.messages.filter(
    (message) => message.quarterId === activeQuarter?.id,
  );
  // Attachments/voice aren't part of DM or Quarter persistence; only mock threads keep them.
  const showRichComposer =
    tab === 'quarters' ? !activeQuarter?.persisted : !activeConversation?.persisted;
  // Image/file attachments on persisted DMs and Quarters (voice stays out of scope, hidden either way).
  const showPersistedAttach =
    tab === 'quarters' ? !!activeQuarter?.persisted : !!activeConversation?.persisted;

  useEffect(() => {
    if (tab === 'messages' && activeConversation) comms.markConversationRead(activeConversation.id);
    if (tab === 'quarters' && activeQuarter) comms.markQuarterRead(activeQuarter.id);
    // mark read only when the selected thread changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeConversation?.id, activeQuarter?.id]);

  // Release the microphone if the user navigates away mid-recording.
  useEffect(() => {
    return () => {
      window.clearTimeout(recordTimer.current);
      window.clearInterval(recordTickInterval.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const matches = useMemo(
    () =>
      comms.searchUsers.filter(
        (user) => user.id !== comms.viewerId && user.username.includes(query.toLowerCase()),
      ),
    [comms.searchUsers, comms.viewerId, query],
  );

  const send = (attachment?: CommsAttachment) => {
    setError('');
    if (!draft.trim() && !attachment) return;
    if (tab === 'quarters' && activeQuarter)
      comms.sendMessage({ quarterId: activeQuarter.id }, draft, attachment);
    else if (activeConversation)
      comms.sendMessage({ conversationId: activeConversation.id }, draft, attachment);
    setDraft('');
  };

  const fileToAttachment = (file: File, type: CommsAttachment['type']): CommsAttachment | null => {
    if (type === 'image' && (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE)) {
      setError('Images must be PNG, JPG, WebP, or GIF and 5 MB or smaller.');
      return null;
    }
    if (type === 'file' && !SAFE_FILES.includes(file.type)) {
      setError('Allowed attachments are PDF, text, and image files only.');
      return null;
    }
    return {
      id: `att-${Date.now()}`,
      type,
      name: file.name,
      url: URL.createObjectURL(file),
      mimeType: file.type,
      size: file.size,
    };
  };

  // Persisted DMs/Quarters only: uploads an image/file attachment, sending
  // the current draft (possibly empty -- attachment-only messages are
  // allowed) as the message body.
  const sendPersistedAttachment = async (file: File) => {
    setAttachError('');
    if (file.size > MAX_PERSISTED_ATTACHMENT_SIZE) {
      setAttachError('Files must be 10 MB or smaller.');
      return;
    }
    if (!PERSISTED_ATTACHMENT_TYPES.includes(file.type)) {
      setAttachError('Allowed attachments are PDF, text, and image files only.');
      return;
    }
    const target =
      tab === 'quarters' && activeQuarter
        ? { quarterId: activeQuarter.id }
        : activeConversation
          ? { conversationId: activeConversation.id }
          : null;
    if (!target) return;
    setAttachSending(true);
    try {
      await comms.sendAttachment(target, file, draft);
      setDraft('');
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Failed to send attachment.');
    } finally {
      setAttachSending(false);
    }
  };

  // Persisted non-image attachments carry no eager signed url (see
  // toCommsAttachment in useComms.ts); fetch one on click. Mock/image
  // attachments already have a ready-to-use url and open directly.
  const downloadAttachment = async (attachment: CommsAttachment) => {
    if (attachment.url) {
      window.open(attachment.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!attachment.storagePath) return;
    try {
      const url = await comms.getAttachmentDownloadUrl(attachment.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setAttachError('Failed to load attachment.');
    }
  };

  const startVoice = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recordSecondsRef.current = 0;
      recordTickInterval.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
      }, 1000);
      recorder.start();
      setRecording(true);
      recordTimer.current = window.setTimeout(() => stopVoice(), MAX_VOICE_SECONDS * 1000);
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  };

  const stopVoice = () => {
    window.clearTimeout(recordTimer.current);
    window.clearInterval(recordTickInterval.current);
    const recorder = mediaRecorderRef.current;
    setRecording(false);
    if (!recorder) return;
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || 'audio/webm';
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      const durationSeconds = Math.max(1, recordSecondsRef.current);
      recorder.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
      if (blob.size === 0) return;
      send({
        id: `voice-${Date.now()}`,
        type: 'voice',
        name: 'voice-note.webm',
        url: URL.createObjectURL(blob),
        mimeType,
        size: blob.size,
        durationSeconds,
      });
    };
    recorder.stop();
  };

  const renderMessage = (message: CommsMessage) => {
    const mine = message.senderId === comms.viewerId;
    const sender = comms.getUser(message.senderId);
    const reactions = Object.entries(message.reactions).filter(([, users]) => users.length > 0);
    const latestMine = mine && activeMessages[activeMessages.length - 1]?.id === message.id;
    // Reactions aren't part of DM or Quarter persistence; only mock (non-persisted) threads keep them.
    const hideReactions = message.persisted === true;
    // Persisted messages carry an `attachments` array (possibly empty); mock messages carry a single `attachment`.
    const attachments = message.attachments ?? (message.attachment ? [message.attachment] : []);
    return (
      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}
        >
          <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="opacity-70">{sender?.username} · {formatTime(message.createdAt)}</span>
            {message.scope === 'quarter' && <QuarterRoleBadge role={quarterRoleOf(activeQuarter, message.senderId)} />}
          </div>
          {message.deleted ? <em>Message unavailable</em> : message.body && <p>{message.body}</p>}
          {attachments.map((attachment) => {
            if (attachment.type === 'image') {
              return attachment.url ? (
                <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="mt-2 max-h-48 rounded-xl object-cover"
                  />
                </a>
              ) : (
                <p key={attachment.id} className="mt-2 text-xs italic opacity-70">
                  Image unavailable
                </p>
              );
            }
            if (attachment.type === 'voice') {
              return (
                <div key={attachment.id} className="mt-2">
                  <audio controls src={attachment.url} className="max-w-full" />
                  {attachment.durationSeconds != null && (
                    <div className="text-[11px] opacity-70">{attachment.durationSeconds}s</div>
                  )}
                </div>
              );
            }
            return (
              <button
                key={attachment.id}
                type="button"
                onClick={() => void downloadAttachment(attachment)}
                className="mt-2 block rounded-lg bg-white/20 p-2 text-left text-xs underline"
              >
                {attachment.name} · {bytes(attachment.size)}
              </button>
            );
          })}
          <div className="mt-2 flex items-center gap-2 text-xs">
            {message.scope === 'quarter' && <ReportAction targetType="quarter_message" targetId={message.id} entityName="Quarter message" />}
            {message.scope === 'quarter' && !activeQuarter?.persisted && (activeQuarter?.ownerId === comms.viewerId || activeQuarter?.adminIds.includes(comms.viewerId)) && !message.deleted && <button type="button" onClick={() => comms.deleteQuarterMessage(message.id)} className="text-red-500">delete</button>}
            {message.scope === 'quarter' && activeQuarter?.persisted && (activeQuarter?.ownerId === comms.viewerId || activeQuarter?.adminIds.includes(comms.viewerId)) && !message.deleted && (
              <button
                type="button"
                onClick={() =>
                  runQuarterAction(
                    () => comms.deleteQuarterMessage(message.id),
                    'Failed to delete message.',
                    'Delete this message?',
                  )
                }
                className="text-red-500"
              >
                delete
              </button>
            )}
            {message.scope === 'quarter' && activeQuarter?.persisted && (activeQuarter?.ownerId === comms.viewerId || activeQuarter?.adminIds.includes(comms.viewerId)) && message.deleted && (
              <button
                type="button"
                onClick={() =>
                  runQuarterAction(() => comms.restoreQuarterMessage(message.id), 'Failed to restore message.')
                }
                className="text-emerald-600"
              >
                restore
              </button>
            )}
            {!hideReactions && (
              <>
                <button type="button" onClick={() => comms.react(message.id)}>
                  👍
                </button>
                {reactions.map(([emoji, users]) => (
                  <span key={emoji}>
                    {emoji} {users.length}
                  </span>
                ))}
              </>
            )}
            {latestMine && message.readBy.length > 1 && <span className="ml-auto">Seen</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
          <MessageSquare size={22} className="text-emerald-500" />
          Comms
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">
          Direct messages, message requests, and your Quarters.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['messages', 'requests', 'quarters'] as Tab[]).map((name) => (
            <button
              key={name}
              onClick={() => setTab(name)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === name ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
            >
              {name === 'messages'
                ? 'Messages'
                : name === 'requests'
                  ? 'Message Requests'
                  : 'Quarters'}{' '}
              <span className="ml-1 rounded-full bg-black/10 px-1.5">{comms.counts[name]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users to start a DM"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
          {query && (
            <div className="space-y-2">
              {matches.map((user) => {
                const blocked = user.isPrivate && !user.followsViewer;
                return (
                  <button
                    key={user.id}
                    disabled={blocked}
                    onClick={async () => {
                      setError('');
                      try {
                        await comms.startConversation(user.id);
                        setQuery('');
                        setTab('messages');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not start that conversation.');
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm disabled:opacity-50 dark:border-zinc-800"
                  >
                    <strong>@{user.username}</strong>
                    <p>
                      {blocked
                        ? 'Private account: only approved followers can DM.'
                        : 'Start conversation'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {tab === 'messages' && (
            <div className="space-y-2">
              {conversations.length === 0 && (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations yet"
                  description="Search for someone above to start a private conversation."
                />
              )}
              {conversations.map((conversation) => {
                const other = comms.getUser(
                  conversation.participantIds.find((id) => id !== comms.viewerId) || '',
                );
                const last = comms.messages
                  .filter((m) => m.conversationId === conversation.id)
                  .at(-1);
                const unread = comms.unreadConversationCount(conversation.id);
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setActiveConversationId(conversation.id)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
                        {other?.avatarInitial}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong>@{other?.username}</strong>
                        <p className="truncate text-slate-500">{last?.body}</p>
                      </span>
                      {unread > 0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              {pendingSentConversations.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                    Pending
                  </p>
                  {pendingSentConversations.map((conversation) => {
                    const other = comms.getUser(
                      conversation.participantIds.find((id) => id !== comms.viewerId) || '',
                    );
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveConversationId(conversation.id)}
                        className="w-full rounded-xl border border-dashed border-slate-300 p-3 text-left text-sm dark:border-zinc-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500 dark:bg-zinc-800">
                            {other?.avatarInitial}
                          </span>
                          <span className="min-w-0 flex-1">
                            <strong>@{other?.username}</strong>
                            <p className="truncate text-slate-500">Request sent · awaiting response</p>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'requests' && (
            <div className="space-y-2">
              {requests.length === 0 && (
                <p className="text-sm text-slate-500">No active message requests.</p>
              )}
              {requests.map((request) => {
                const other = comms.getUser(request.requestedBy || '');
                return (
                  <div
                    key={request.id}
                    className="rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800"
                  >
                    <strong>@{other?.username}</strong>
                    <p className="text-slate-500">Wants to send you a message.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => comms.acceptRequest(request.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-white"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => comms.declineRequest(request.id)}
                        className="rounded-lg bg-slate-100 px-3 py-1 dark:bg-zinc-800"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                  Quarter Invites
                </p>
                {comms.quarterInvites.length === 0 && (
                  <p className="text-sm text-slate-500">No pending quarter invites.</p>
                )}
                {comms.quarterInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800"
                  >
                    <strong>{invite.quarterTitle}</strong>
                    <p className="text-slate-500">Invited by @{invite.inviterUsername}.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => comms.acceptQuarterInvite(invite.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-white"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => comms.declineQuarterInvite(invite.id)}
                        className="rounded-lg bg-slate-100 px-3 py-1 dark:bg-zinc-800"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'quarters' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-zinc-800">
                <input
                  value={quarterTitle}
                  onChange={(e) => setQuarterTitle(e.target.value)}
                  placeholder="Quarter title"
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
                <input
                  value={quarterDescription}
                  onChange={(e) => setQuarterDescription(e.target.value)}
                  placeholder="Description"
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
                <button
                  disabled={!quarterTitle.trim()}
                  onClick={async () => {
                    setError('');
                    try {
                      await comms.createQuarter(quarterTitle, quarterDescription);
                      setQuarterTitle('');
                      setQuarterDescription('');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Could not create that Quarter.');
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  <Plus size={14} /> Create Quarter
                </button>
              </div>
              {comms.quarters.map((quarter) => {
                const last = comms.messages.filter((m) => m.quarterId === quarter.id).at(-1);
                return (
                <button
                  key={quarter.id}
                  onClick={() => setActiveQuarterId(quarter.id)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left text-sm dark:border-zinc-800"
                >
                  <strong>{quarter.title}</strong>
                  {last && <p className="truncate text-slate-500">{last.body}</p>}
                  <p className="text-slate-500">
                    {quarter.memberIds.length} members · {comms.unreadQuarterCount(quarter.id)}{' '}
                    unread
                  </p>
                </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          {!hasActiveThread && (
            <EmptyState
              icon={tab === 'quarters' ? Users : MessageSquare}
              title={tab === 'quarters' ? 'Select a Quarter' : 'Select a conversation'}
              description={
                tab === 'quarters'
                  ? 'Choose a Quarter from the list on the left, or create one to get started.'
                  : 'Choose a conversation from the list on the left, or search above to start a new one.'
              }
            />
          )}
          {tab !== 'quarters' && activeConversation && (
            <>
              <h2 className="font-bold">
                @
                {
                  comms.getUser(
                    activeConversation.participantIds.find((id) => id !== comms.viewerId) || '',
                  )?.username
                }
              </h2>
              <div className="mt-4 space-y-3">
                {activeMessages.map(renderMessage)}
                {isPendingSentConversation && (
                  <p className="text-sm text-slate-500">
                    Message request sent. You&apos;ll be able to chat once they accept.
                  </p>
                )}
                {!isPendingSentConversation &&
                  activeConversation.typingUserIds.filter((id) => id !== comms.viewerId).length >
                    0 && <p className="text-sm text-slate-500">typing...</p>}
              </div>
            </>
          )}
          {tab === 'quarters' && activeQuarter && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">
                    <Users className="mr-1 inline" size={17} />
                    {activeQuarter.title}
                  </h2>
                  <p className="text-sm text-slate-500">{activeQuarter.description}</p>
                </div>
                {!(activeQuarter.persisted && activeQuarter.ownerId === comms.viewerId) && (
                  <button
                    onClick={() => comms.leaveQuarter(activeQuarter.id)}
                    className="rounded-lg bg-slate-100 px-3 py-1 text-sm dark:bg-zinc-800"
                  >
                    Leave
                  </button>
                )}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800"><h3 className="mb-2 text-sm font-bold">Quarter Controls</h3><p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">Your role: {quarterRoleOf(activeQuarter, comms.viewerId) ? <QuarterRoleBadge role={quarterRoleOf(activeQuarter, comms.viewerId)} /> : 'Member'}</p>
              {controlsError && (
                <p className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
                  {controlsError}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {activeQuarter.memberIds.map((id) => {
                  const isOwner = activeQuarter.ownerId === comms.viewerId;
                  const isMod = activeQuarter.adminIds.includes(comms.viewerId);
                  const targetIsMod = activeQuarter.adminIds.includes(id);
                  const username = comms.getUser(id)?.username;
                  return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-zinc-800">
                    @{username}
                    <QuarterRoleBadge role={quarterRoleOf(activeQuarter, id)} />{' '}
                    {!activeQuarter.persisted && (isOwner || isMod) && id !== activeQuarter.ownerId && id !== comms.viewerId && <button onClick={() => comms.removeQuarterMember(activeQuarter.id, id)} className="ml-1 text-red-500">remove</button>}
                    {!activeQuarter.persisted && isOwner && id !== comms.viewerId && !targetIsMod && <button onClick={() => comms.promoteQuarterModerator(activeQuarter.id, id)} className="ml-1 text-emerald-600">promote</button>}
                    {!activeQuarter.persisted && isOwner && id !== comms.viewerId && targetIsMod && <button onClick={() => comms.removeQuarterModerator(activeQuarter.id, id)} className="ml-1 text-amber-600">remove mod</button>}
                    {activeQuarter.persisted && (isOwner || isMod) && id !== activeQuarter.ownerId && id !== comms.viewerId && (isOwner || !targetIsMod) && (
                      <button
                        onClick={() =>
                          runQuarterAction(
                            () => comms.removeQuarterMember(activeQuarter.id, id),
                            'Failed to remove member.',
                            `Remove @${username} from this quarter?`,
                          )
                        }
                        className="ml-1 text-red-500"
                      >
                        remove
                      </button>
                    )}
                    {activeQuarter.persisted && isOwner && id !== comms.viewerId && !targetIsMod && (
                      <button
                        onClick={() =>
                          runQuarterAction(
                            () => comms.promoteQuarterModerator(activeQuarter.id, id),
                            'Failed to promote member.',
                          )
                        }
                        className="ml-1 text-emerald-600"
                      >
                        promote
                      </button>
                    )}
                    {activeQuarter.persisted && isOwner && id !== comms.viewerId && targetIsMod && (
                      <button
                        onClick={() =>
                          runQuarterAction(
                            () => comms.removeQuarterModerator(activeQuarter.id, id),
                            'Failed to demote moderator.',
                          )
                        }
                        className="ml-1 text-amber-600"
                      >
                        remove mod
                      </button>
                    )}
                  </span>
                  );
                })}
              </div></div>
              {activeQuarter.persisted ? (
                <div className="mt-3 flex gap-2">
                  <input
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="Invite by username"
                    className="flex-1 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                  />
                  <button
                    disabled={!inviteUsername.trim()}
                    onClick={async () => {
                      setError('');
                      try {
                        await comms.inviteToQuarterByUsername(activeQuarter.id, inviteUsername);
                        setInviteUsername('');
                      } catch (err) {
                        setError(err instanceof Error ? err.message : `Could not invite @${inviteUsername.trim()}. Check the username and try again.`);
                      }
                    }}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    Invite
                  </button>
                </div>
              ) : (
                <select
                  onChange={(e) =>
                    e.target.value && comms.inviteToQuarter(activeQuarter.id, e.target.value)
                  }
                  className="mt-3 rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <option value="">Invite user…</option>
                  {comms.users
                    .filter((u) => u.id !== comms.viewerId && !activeQuarter.memberIds.includes(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        @{u.username}
                      </option>
                    ))}
                </select>
              )}
              <div className="mt-4 space-y-3">{activeQuarterMessages.map(renderMessage)}</div>
            </>
          )}

          {hasActiveThread && !isPendingSentConversation && (
          <div className="mt-5 border-t border-slate-200 pt-3 dark:border-zinc-800">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
            {attachError && (
              <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {attachError}
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                tab === 'quarters' ? 'Write a message. Use @username to mention someone.' : 'Write a message…'
              }
              className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {showPersistedAttach && (
                <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-zinc-800 aria-disabled:opacity-50">
                  <Paperclip className="inline" size={15} /> {attachSending ? 'Uploading…' : 'Attach'}
                  <input
                    hidden
                    type="file"
                    disabled={attachSending}
                    accept={PERSISTED_ATTACHMENT_TYPES.join(',')}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) void sendPersistedAttachment(file);
                    }}
                  />
                </label>
              )}
              {showRichComposer && (
                <>
                  <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-zinc-800">
                    <Image className="inline" size={15} /> Image
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const att = file && fileToAttachment(file, 'image');
                        if (att) send(att);
                      }}
                    />
                  </label>
                  <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-zinc-800">
                    <Paperclip className="inline" size={15} /> File
                    <input
                      hidden
                      type="file"
                      accept="application/pdf,text/plain,image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const att = file && fileToAttachment(file, 'file');
                        if (att) send(att);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => (recording ? stopVoice() : void startVoice())}
                    className={`rounded-lg px-3 py-2 text-sm ${recording ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
                  >
                    <Mic className="inline" size={15} /> {recording ? 'Stop recording' : 'Record voice'}
                  </button>
                </>
              )}
              <button
                onClick={() => send()}
                disabled={!draft.trim()}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send size={15} /> Send
              </button>
            </div>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
