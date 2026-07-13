import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AdminResearch from './AdminResearch';
import { useAuth } from '../context/AuthContext';
import type { ModerationQueueItem, ProfileDTO } from '../services/types';

type Tab = 'review' | 'suggest' | 'users' | 'deleted' | 'quarters' | 'research' | 'log';
const tabs: [Tab, string][] = [
  ['research', 'Research'],
  ['review', 'Review'],
  ['suggest', 'Suggest Edits'],
  ['users', 'Users'],
  ['deleted', 'Deleted'],
  ['quarters', 'Quarters'],
  ['log', 'Log'],
];

function isAdmin(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
}

export default function Admin() {
  const { profile, user, services, isBackendConfigured } = useAuth();
  const [tab, setTab] = useState<Tab>('research');
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [users, setUsers] = useState<ProfileDTO[]>([]);
  const [query, setQuery] = useState('');
  const [log, setLog] = useState<
    {
      id: string;
      actionType: string;
      targetType: string;
      targetId: string;
      note?: string;
      createdAt: string;
      adminUsername?: string;
    }[]
  >([]);
  const [deletedPosts, setDeletedPosts] = useState<
    { id: string; kind: string; title: string; authorUsername?: string; deletedAt: string }[]
  >([]);
  const [message, setMessage] = useState('');

  const allowed = isAdmin(profile);
  const isOwner = profile?.siteRole === 'site_owner';

  const load = async () => {
    if (!services || tab === 'research') return;
    setMessage('');
    try {
      if (tab === 'review' || tab === 'suggest') setItems(await services.moderation.listQueue());
      if (tab === 'log') setLog(await services.moderation.listLog());
      if (tab === 'users') setUsers(await services.moderation.listUsers(query));
      if (tab === 'deleted') setDeletedPosts(await services.moderation.listDeletedPosts());
    } catch (err) {
      console.error('Admin tab load failed', err);
      setMessage(err instanceof Error ? err.message : 'Failed to load this admin tab.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is redefined every render; including it would refetch on every render instead of only when services/tab change.
  }, [services, tab]);

  if (isBackendConfigured && !allowed) return <Navigate to="/map" replace />;

  const reports = items.filter((item) => item.submissionType === 'report');
  const suggestions = items.filter((item) => item.submissionType === 'suggest_edit');

  const act = async (
    item: ModerationQueueItem,
    status: 'reviewed' | 'rejected' | 'action_taken' | 'approved',
  ) => {
    if (!services) return;
    try {
      await services.moderation.updateStatus(item.submissionType, item.id, status as never);
      await load();
    } catch (err) {
      console.error('Admin action failed', err);
      setMessage(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const userAction = async (target: ProfileDTO, status: string) => {
    if (!services) return;
    try {
      if (status === 'site_admin' || status === 'user')
        await services.moderation.setSiteRole(target.id, status);
      else await services.moderation.setUserStatus(target.id, status);
      setUsers(await services.moderation.listUsers(query));
    } catch (err) {
      console.error('User moderation failed', err);
      setMessage(err instanceof Error ? err.message : 'User action failed.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12 pt-6">
      <div>
        <h1 className="text-3xl font-black">Admin</h1>
        <p className="text-sm text-slate-500">
          Research, site-wide reports, suggest edits, users, deleted content, Quarters, and
          moderation log.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {message}
        </div>
      )}
      {tab === 'review' && (
        <QueueTable
          items={reports}
          onAct={act}
          actions={['reviewed', 'rejected', 'action_taken']}
        />
      )}
      {tab === 'suggest' && (
        <QueueTable
          items={suggestions}
          onAct={act}
          actions={['reviewed', 'approved', 'rejected']}
        />
      )}
      {tab === 'users' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search username or email"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
            <button
              onClick={async () => services && setUsers(await services.moderation.listUsers(query))}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-white"
            >
              Search
            </button>
          </div>
          <div className="space-y-2">
            {users.map((target) => (
              <div
                key={target.id}
                className="rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800"
              >
                <strong>@{target.username}</strong>{' '}
                <span className="text-slate-500">{target.email}</span>
                <p>
                  Status: {target.accountStatus} · Role: {target.siteRole}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['warned', 'suspended', 'banned', 'active'].map((status) => (
                    <button
                      key={status}
                      onClick={() => userAction(target, status)}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs dark:bg-zinc-800"
                    >
                      {status}
                    </button>
                  ))}
                  {isOwner && target.siteRole !== 'site_owner' && (
                    <>
                      <button
                        onClick={() => userAction(target, 'site_admin')}
                        className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-700"
                      >
                        Grant admin
                      </button>
                      <button
                        onClick={() => userAction(target, 'user')}
                        className="rounded-lg bg-red-100 px-2 py-1 text-xs text-red-700"
                      >
                        Remove admin
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === 'deleted' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-2">
            {deletedPosts.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
                No soft-deleted posts. Content removed by moderation appears here and can be
                restored.
              </p>
            )}
            {deletedPosts.map((post) => (
              <div
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">
                    {post.kind}
                  </span>
                  <strong>{post.title}</strong>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {post.authorUsername ? `@${post.authorUsername} · ` : ''}
                    Deleted {new Date(post.deletedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!services) return;
                    try {
                      await services.moderation.moderatePost(post.id, 'restore');
                      setDeletedPosts(await services.moderation.listDeletedPosts());
                    } catch (err) {
                      console.error('Restore failed', err);
                      setMessage(err instanceof Error ? err.message : 'Restore failed.');
                    }
                  }}
                  className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      {tab === 'quarters' && (
        <Empty
          title="Quarters"
          text="Site admins can moderate Quarter messages and members through the Quarter Controls in Comms; private DM bodies are not shown here."
        />
      )}
      {tab === 'research' && <AdminResearch profile={profile} user={user} />}
      {tab === 'log' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="space-y-2">
            {log.length === 0 && (
              <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-zinc-950">
                No moderation or admin actions have been logged yet.
              </p>
            )}
            {log.map((entry) => (
              <div key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-zinc-950">
                <strong>{entry.actionType}</strong> on {entry.targetType}:{entry.targetId}
                <p className="text-xs text-slate-500">
                  {entry.adminUsername ? `@${entry.adminUsername} · ` : ''}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.note && <p>{entry.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QueueTable({
  items,
  actions,
  onAct,
}: {
  items: ModerationQueueItem[];
  actions: string[];
  onAct: (item: ModerationQueueItem, status: never) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-zinc-800">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Reporter/Submitter</th>
              <th className="px-4 py-3">Reported user</th>
              <th className="px-4 py-3">Reason/Field</th>
              <th className="px-4 py-3">Note / Suggestion</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={`${item.submissionType}-${item.id}`}>
                <td className="px-4 py-3 font-mono text-xs">{item.id}</td>
                <td className="px-4 py-3">
                  <strong>{item.targetType}</strong>
                  <br />
                  {item.targetLabel ?? item.targetId}
                </td>
                <td className="px-4 py-3">{item.username ? `@${item.username}` : 'Unknown'}</td>
                <td className="px-4 py-3">
                  {item.reportedUsername ? `@${item.reportedUsername}` : '—'}
                </td>
                <td className="px-4 py-3">{item.reason ?? item.targetField ?? '—'}</td>
                <td className="max-w-xs px-4 py-3">{item.preview || '—'}</td>
                <td className="px-4 py-3">{item.status}</td>
                <td className="px-4 py-3 text-xs">
                  {new Date(item.createdAt).toLocaleString()}
                  <br />
                  {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : ''}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => onAct(item, action as never)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-zinc-800"
                      >
                        {action.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </section>
  );
}
