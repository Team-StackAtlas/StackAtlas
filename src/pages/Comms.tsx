import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, MessageSquare, Mic, Paperclip, Plus, Search, Send, Users } from 'lucide-react';
import { useComms, type CommsAttachment, type CommsMessage } from '../hooks/useComms';
import { ReportAction } from '../components/ReportAction';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VOICE_SECONDS = 60;
const SAFE_FILES = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/webp'];

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

  const conversations = comms.conversations.filter(
    (conversation) => conversation.accepted && !conversation.declined,
  );
  const requests = comms.conversations.filter(
    (conversation) =>
      !conversation.accepted &&
      !conversation.declined &&
      conversation.requestedBy !== comms.viewerId,
  );
  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ??
    conversations[0];
  const activeQuarter =
    comms.quarters.find((quarter) => quarter.id === activeQuarterId) ?? comms.quarters[0];
  const activeMessages = comms.messages.filter(
    (message) => message.conversationId === activeConversation?.id,
  );
  const activeQuarterMessages = comms.messages.filter(
    (message) => message.quarterId === activeQuarter?.id,
  );
  // Attachments/voice aren't part of DM or Quarter persistence; only mock threads keep them.
  const showRichComposer =
    tab === 'quarters' ? !activeQuarter?.persisted : !activeConversation?.persisted;

  useEffect(() => {
    if (tab === 'messages' && activeConversation) comms.markConversationRead(activeConversation.id);
    if (tab === 'quarters' && activeQuarter) comms.markQuarterRead(activeQuarter.id);
    // mark read only when the selected thread changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, activeConversation?.id, activeQuarter?.id]);

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
      setError('Images must be PNG, JPG, or WebP and 5 MB or smaller.');
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

  const startVoice = () => {
    setError('');
    setRecording(true);
    recordTimer.current = window.setTimeout(() => stopVoice(), MAX_VOICE_SECONDS * 1000);
  };

  const stopVoice = () => {
    window.clearTimeout(recordTimer.current);
    setRecording(false);
    send({
      id: `voice-${Date.now()}`,
      type: 'voice',
      name: 'voice-note.webm',
      url: 'https://www.w3schools.com/html/horse.mp3',
      mimeType: 'audio/webm',
      size: 44000,
      durationSeconds: 5,
    });
  };

  const renderMessage = (message: CommsMessage) => {
    const mine = message.senderId === comms.viewerId;
    const sender = comms.getUser(message.senderId);
    const reactions = Object.entries(message.reactions).filter(([, users]) => users.length > 0);
    const latestMine = mine && activeMessages[activeMessages.length - 1]?.id === message.id;
    // Reactions aren't part of DM or Quarter persistence; only mock (non-persisted) threads keep them.
    const hideReactions = message.persisted === true;
    return (
      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-100'}`}
        >
          <div className="mb-1 text-[11px] opacity-70">
            {sender?.username} · {formatTime(message.createdAt)}
          </div>
          {message.deleted ? <em>Message unavailable</em> : <p>{message.body}</p>}
          {message.attachment?.type === 'image' && (
            <a href={message.attachment.url} target="_blank" rel="noreferrer">
              <img
                src={message.attachment.url}
                alt={message.attachment.name}
                className="mt-2 max-h-48 rounded-xl object-cover"
              />
            </a>
          )}
          {message.attachment?.type === 'voice' && (
            <div className="mt-2">
              <audio controls src={message.attachment.url} className="max-w-full" />
              <div className="text-[11px] opacity-70">{message.attachment.durationSeconds}s</div>
            </div>
          )}
          {message.attachment?.type === 'file' && (
            <a
              href={message.attachment.url}
              className="mt-2 block rounded-lg bg-white/20 p-2 text-xs underline"
            >
              {message.attachment.name} · {bytes(message.attachment.size)}
            </a>
          )}
          <div className="mt-2 flex items-center gap-2 text-xs">
            {message.scope === 'quarter' && <ReportAction targetType="quarter_message" targetId={message.id} entityName="Quarter message" />}
            {message.scope === 'quarter' && !activeQuarter?.persisted && (activeQuarter?.ownerId === comms.viewerId || activeQuarter?.adminIds.includes(comms.viewerId)) && !message.deleted && <button type="button" onClick={() => comms.deleteQuarterMessage(message.id)} className="text-red-500">delete</button>}
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
        <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <MessageSquare size={18} />
          <span className="text-xs font-bold uppercase tracking-[0.18em]">Comms</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Messages, Requests, and Quarters
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Notifications stay in their own sidebar tab; Comms shows unread activity and creates
          notification events for requests, invites, accepted requests, and mentions.
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
                    onClick={() => {
                      comms.startConversation(user.id);
                      setQuery('');
                      setTab('messages');
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
                <p className="text-sm text-slate-500">
                  No conversations yet. Find someone via search to start one.
                </p>
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
                  onClick={() => {
                    comms.createQuarter(quarterTitle, quarterDescription);
                    setQuarterTitle('');
                    setQuarterDescription('');
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
                {activeConversation.typingUserIds.filter((id) => id !== comms.viewerId).length >
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
              <div className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-zinc-800"><h3 className="mb-2 text-sm font-bold">Quarter Controls</h3><p className="mb-2 text-xs text-slate-500">Role: {activeQuarter.ownerId === comms.viewerId ? 'quarter_owner' : activeQuarter.adminIds.includes(comms.viewerId) ? 'quarter_moderator' : 'quarter_member'}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {activeQuarter.memberIds.map((id) => (
                  <span key={id} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-zinc-800">
                    @{comms.getUser(id)?.username}{' '}
                    {!activeQuarter.persisted && (activeQuarter.ownerId === comms.viewerId || activeQuarter.adminIds.includes(comms.viewerId)) && id !== activeQuarter.ownerId && id !== comms.viewerId && <button onClick={() => comms.removeQuarterMember(activeQuarter.id, id)} className="ml-1 text-red-500">remove</button>}
                    {!activeQuarter.persisted && activeQuarter.ownerId === comms.viewerId && id !== comms.viewerId && !activeQuarter.adminIds.includes(id) && <button onClick={() => comms.promoteQuarterModerator(activeQuarter.id, id)} className="ml-1 text-emerald-600">promote</button>}
                    {!activeQuarter.persisted && activeQuarter.ownerId === comms.viewerId && id !== comms.viewerId && activeQuarter.adminIds.includes(id) && <button onClick={() => comms.removeQuarterModerator(activeQuarter.id, id)} className="ml-1 text-amber-600">remove mod</button>}
                  </span>
                ))}
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
                    onClick={() => {
                      comms.inviteToQuarterByUsername(activeQuarter.id, inviteUsername);
                      setInviteUsername('');
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

          <div className="mt-5 border-t border-slate-200 pt-3 dark:border-zinc-800">
            {error && (
              <p className="mb-2 rounded-lg bg-red-50 p-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message. Use @username to mention someone."
              className="h-20 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {showRichComposer && (
                <>
                  <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-zinc-800">
                    <Image className="inline" size={15} /> Image
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
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
                      accept="application/pdf,text/plain,image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        const att = file && fileToAttachment(file, 'file');
                        if (att) send(att);
                      }}
                    />
                  </label>
                  <button
                    onClick={recording ? stopVoice : startVoice}
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
        </div>
      </section>
    </div>
  );
}
