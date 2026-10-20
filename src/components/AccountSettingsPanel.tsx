import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Shield, LogOut, Lock, Mail, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ui/ToastProvider';
import type { ProfileDTO, ProfileSettings } from '../services/types';

/**
 * Own-profile account + settings + Privacy & Data panel.
 *
 * - Unconfigured backend: shows a local-preview notice (no production account
 *   data is stored locally).
 * - Configured but signed out: prompts sign-in.
 * - Signed in: edits avatar + privacy settings via the profile service and
 *   exposes sign-out.
 */
export default function AccountSettingsPanel() {
  const { status, user, isBackendConfigured, services, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [settings, setSettings] = useState<ProfileSettings>({ savedPrivate: true });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    if (services && user) {
      services.profiles
        .get(user.id)
        .then((p) => {
          if (!active || !p) return;
          setProfile(p);
          setAvatarUrl(p.avatarUrl ?? '');
          setSettings({ savedPrivate: true, ...p.settings });
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [services, user]);

  if (!isBackendConfigured) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900 dark:text-zinc-100">
          <Shield size={16} className="text-emerald-500" /> Privacy &amp; Data
        </div>
        <p className="text-slate-500 dark:text-zinc-400">
          Your saved items and hidden items are private to you. Accounts aren't configured in this
          environment, so this profile is a local preview — no account data is stored on a server.
        </p>
      </div>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <span className="text-slate-600 dark:text-zinc-400">Sign in to manage your account.</span>
        <Link to="/login" className="rounded-lg bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">
          Sign in
        </Link>
      </div>
    );
  }

  const save = async () => {
    if (!services) return;
    setSaving(true);
    try {
      await services.profiles.update(user.id, { avatarUrl: avatarUrl || undefined, settings });
      toast('Settings saved.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const requestDeletion = async () => {
    if (!services) return;
    setDeleting(true);
    try {
      await services.profiles.requestAccountDeletion();
      toast('Your account has been scheduled for deletion and you have been signed out.', 'success');
      await signOut();
    } catch (err) {
      // The RPC ships in a migration; until it is applied, give people a path
      // that still works instead of a dead button.
      const msg = err instanceof Error ? err.message : '';
      toast(
        /request_account_deletion|function/i.test(msg)
          ? 'Self-service deletion is not enabled yet. Email the privacy contact in the Privacy Policy and we will delete your account manually.'
          : msg || 'Failed to delete account.',
        'error',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-slate-900 dark:text-zinc-100">{user.email}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
            {user.role}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-zinc-400">Avatar URL</label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-zinc-100">
          <Settings size={16} /> Settings &amp; Privacy
        </div>
        <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300">
          <span className="flex items-center gap-1.5"><Lock size={13} /> Keep my saved/watchlist private</span>
          <input
            type="checkbox"
            checked={settings.savedPrivate ?? true}
            onChange={(e) => setSettings((s) => ({ ...s, savedPrivate: e.target.checked }))}
            className="accent-emerald-500"
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300">
          <span>Show my activity publicly</span>
          <input
            type="checkbox"
            checked={settings.showActivity ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, showActivity: e.target.checked }))}
            className="accent-emerald-500"
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-slate-700 dark:text-zinc-300">
          <span className="flex items-center gap-1.5"><Mail size={13} /> Email me product updates (opt-in)</span>
          <input
            type="checkbox"
            checked={settings.emailUpdates ?? false}
            onChange={(e) => setSettings((s) => ({ ...s, emailUpdates: e.target.checked }))}
            className="accent-emerald-500"
          />
        </label>
        <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
          Saved &amp; hidden items are always private. Following is public and drives your feed. We never email you
          unless you opt in above, and you can turn it off here any time.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>

      <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-950/20">
        <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
          <Trash2 size={14} /> Delete my account and data
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-400">
          Erases your profile fields immediately, hides everything you posted, and queues the account for permanent
          deletion within 30 days. Posts may remain as "deleted user" where removing them would break a conversation.
          This cannot be undone.
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={requestDeletion}
              disabled={deleting}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Yes, permanently delete my account'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete account…
          </button>
        )}
      </div>

      {profile?.stats && (
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {profile.stats.followersCount} followers · {profile.stats.followingCount} following ·{' '}
          {profile.stats.dispatchCount} dispatches
        </p>
      )}
    </div>
  );
}
