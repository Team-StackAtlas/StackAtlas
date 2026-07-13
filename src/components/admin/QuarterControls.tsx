import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import {
  adminListQuarters,
  adminLoadQuarterDetail,
  adminModerateQuarterMessage,
  adminRemoveQuarterMember,
  type AdminQuarterDetail,
  type AdminQuarterMemberDTO,
  type AdminQuarterMessageDTO,
  type AdminQuarterSummaryDTO,
  type CommsQuarterRole,
} from '../../services/comms';
import Badge from './Badge';

const ROLE_LABELS: Record<CommsQuarterRole, string> = {
  quarter_owner: 'Owner',
  quarter_moderator: 'Moderator',
  quarter_member: 'Member',
};

export default function QuarterControls({
  client,
  isAdmin,
}: {
  client: SupabaseClient | null;
  isAdmin: boolean;
}) {
  const [quarters, setQuarters] = useState<AdminQuarterSummaryDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminQuarterDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError('');
    try {
      setQuarters(await adminListQuarters(client));
      setLoaded(true);
    } catch (err) {
      console.error('Load admin quarters failed', err);
      setError(err instanceof Error ? err.message : 'Failed to load Quarters.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const loadDetail = async (quarterId: string) => {
    if (!client) return;
    setDetailLoading(true);
    setDetailError('');
    try {
      setDetail(await adminLoadQuarterDetail(client, quarterId));
    } catch (err) {
      console.error('Load quarter detail failed', err);
      setDetailError(err instanceof Error ? err.message : 'Failed to load this quarter.');
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleExpand = (quarterId: string) => {
    if (expandedId === quarterId) {
      setExpandedId(null);
      setDetail(null);
      setDetailError('');
      return;
    }
    setExpandedId(quarterId);
    setDetail(null);
    setDetailError('');
    void loadDetail(quarterId);
  };

  const moderateMessage = async (message: AdminQuarterMessageDTO, action: 'soft_delete' | 'restore') => {
    if (!client || !expandedId) return;
    let reason: string | undefined;
    if (action === 'soft_delete') {
      const confirmed = window.confirm('Soft-delete this message? Members will see "Message unavailable".');
      if (!confirmed) return;
      reason = window.prompt('Deletion reason (optional):') ?? undefined;
    }
    setActingId(message.id);
    setDetailError('');
    try {
      await adminModerateQuarterMessage(client, message.id, action, reason || undefined);
      await Promise.all([loadDetail(expandedId), load()]);
    } catch (err) {
      console.error('Moderate quarter message failed', err);
      setDetailError(err instanceof Error ? err.message : 'Failed to update the message.');
    } finally {
      setActingId(null);
    }
  };

  const removeMember = async (member: AdminQuarterMemberDTO) => {
    if (!client || !expandedId) return;
    const confirmed = window.confirm(`Remove @${member.username} from this quarter?`);
    if (!confirmed) return;
    setActingId(member.userId);
    setDetailError('');
    try {
      await adminRemoveQuarterMember(client, expandedId, member.userId);
      await Promise.all([loadDetail(expandedId), load()]);
    } catch (err) {
      console.error('Remove quarter member failed', err);
      setDetailError(err instanceof Error ? err.message : 'Failed to remove the member.');
    } finally {
      setActingId(null);
    }
  };

  if (!client) {
    return (
      <Empty text="Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to moderate Quarters." />
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-zinc-950">
        Site admins can review every Quarter's members and messages here, soft-delete or restore a
        message, and remove a member. Private DM bodies are never visible to admins — this tab
        only covers Quarters.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
          {loaded ? `${quarters.length} quarter${quarters.length === 1 ? '' : 's'}` : 'Quarters'}
        </h2>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:bg-zinc-800"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <span>{error}</span>
          <button
            onClick={() => void load()}
            className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold dark:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !loaded && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
          <Loader2 size={16} className="animate-spin" />
          Loading Quarters…
        </div>
      )}

      {!loading && loaded && quarters.length === 0 && <Empty text="No Quarters have been created yet." />}

      <div className="space-y-2">
        {quarters.map((quarter) => {
          const expanded = expandedId === quarter.id;
          return (
            <div
              key={quarter.id}
              className="rounded-2xl border border-slate-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            >
              <button
                onClick={() => toggleExpand(quarter.id)}
                className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {expanded ? (
                    <ChevronDown size={16} className="shrink-0 text-slate-400" />
                  ) : (
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold">{quarter.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Owned by @{quarter.ownerUsername || 'unknown'} · Created{' '}
                      {new Date(quarter.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs">
                  <Badge tone="slate">
                    {quarter.memberCount} member{quarter.memberCount === 1 ? '' : 's'}
                  </Badge>
                  <Badge tone="blue">
                    {quarter.messageCount} message{quarter.messageCount === 1 ? '' : 's'}
                  </Badge>
                </div>
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-slate-200 p-4 dark:border-zinc-800">
                  {detailError && (
                    <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                      <span>{detailError}</span>
                      <button
                        onClick={() => void loadDetail(quarter.id)}
                        className="shrink-0 rounded-lg bg-red-100 px-3 py-1 text-xs font-semibold dark:bg-red-500/20"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {detailLoading && !detail && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
                      <Loader2 size={16} className="animate-spin" />
                      Loading members and messages…
                    </div>
                  )}

                  {detail && (
                    <>
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                          Members ({detail.members.length})
                        </h3>
                        <div className="space-y-1.5">
                          {detail.members.map((member) => (
                            <div
                              key={member.userId}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-zinc-950"
                            >
                              <div>
                                <strong>@{member.username || 'unknown'}</strong>{' '}
                                <span className="text-xs text-slate-500">
                                  {ROLE_LABELS[member.role]} · joined{' '}
                                  {new Date(member.joinedAt).toLocaleDateString()}
                                </span>
                              </div>
                              {isAdmin && member.role !== 'quarter_owner' && (
                                <button
                                  onClick={() => void removeMember(member)}
                                  disabled={actingId === member.userId}
                                  className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-50 dark:bg-red-500/15 dark:text-red-300"
                                >
                                  {actingId === member.userId ? 'Removing…' : 'Remove'}
                                </button>
                              )}
                            </div>
                          ))}
                          {detail.members.length === 0 && (
                            <Empty text="No active members." />
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                          Recent messages ({detail.messages.length})
                        </h3>
                        <div className="space-y-1.5">
                          {detail.messages.map((message) => {
                            const deleted = message.deletedAt != null;
                            return (
                              <div
                                key={message.id}
                                className="rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-zinc-950"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs text-slate-500">
                                    @{message.senderUsername || 'unknown'} ·{' '}
                                    {new Date(message.createdAt).toLocaleString()}
                                  </span>
                                  {deleted && <Badge tone="red">Deleted</Badge>}
                                </div>
                                <p className={deleted ? 'mt-1 italic text-slate-400' : 'mt-1'}>
                                  {message.body}
                                </p>
                                {deleted && message.deletionReason && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Reason: {message.deletionReason}
                                  </p>
                                )}
                                {isAdmin && (
                                  <div className="mt-2 flex gap-2">
                                    {!deleted && (
                                      <button
                                        onClick={() => void moderateMessage(message, 'soft_delete')}
                                        disabled={actingId === message.id}
                                        className="rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 disabled:opacity-50 dark:bg-red-500/15 dark:text-red-300"
                                      >
                                        {actingId === message.id ? 'Deleting…' : 'Delete'}
                                      </button>
                                    )}
                                    {deleted && (
                                      <button
                                        onClick={() => void moderateMessage(message, 'restore')}
                                        disabled={actingId === message.id}
                                        className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-300"
                                      >
                                        {actingId === message.id ? 'Restoring…' : 'Restore'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {detail.messages.length === 0 && <Empty text="No messages yet." />}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">{text}</p>;
}
