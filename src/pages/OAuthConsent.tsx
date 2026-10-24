import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import { useAuth } from '../context/AuthContext';
import { usePageMeta } from '../hooks/usePageMeta';

interface AuthDetails {
  authorization_id?: string;
  redirect_url?: string;
  redirect_uri?: string;
  scope?: string;
  client?: { name?: string; client_id?: string };
}

/**
 * Supabase Auth OAuth 2.1 consent screen (Authentication → OAuth Server →
 * Authorization Path must point here: /oauth/consent). When an MCP client
 * such as Claude's custom connector asks for access, Supabase redirects the
 * signed-in user here with ?authorization_id; approving issues that client a
 * token that acts *as this user*, so only administrators can usefully grant
 * the research connector.
 */
export default function OAuthConsent() {
  usePageMeta('Authorize an app');
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id');
  const { status, profile } = useAuth();
  const [details, setDetails] = useState<AuthDetails | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase || !authorizationId || status !== 'authenticated') return;
    let active = true;
    supabase.auth.oauth.getAuthorizationDetails(authorizationId).then(({ data, error: err }) => {
      if (!active) return;
      if (err || !data) { setError(err?.message ?? 'Invalid authorization request.'); return; }
      const d = data as unknown as AuthDetails;
      // Already consented earlier: Supabase hands back the redirect straight away.
      if (!d.authorization_id && d.redirect_url) { window.location.assign(d.redirect_url); return; }
      setDetails(d);
    });
    return () => { active = false; };
  }, [authorizationId, status]);

  if (!supabase) return <Panel title="Not available" body="Accounts are not configured in this environment." />;
  if (!authorizationId) return <Panel title="Missing authorization request" body="This page is only reached from an app asking for access." />;
  if (status === 'loading') return <Panel title="Checking your session…" body="" />;
  if (status !== 'authenticated') {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`} replace />;
  }

  const decide = async (approve: boolean) => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    const call = approve ? supabase.auth.oauth.approveAuthorization(authorizationId) : supabase.auth.oauth.denyAuthorization(authorizationId);
    const { data, error: err } = await call;
    if (err || !data?.redirect_url) { setError(err?.message ?? 'Could not complete the request.'); setBusy(false); return; }
    window.location.assign(data.redirect_url);
  };

  const isAdmin = profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
  const scopes = (details?.scope ?? '').split(' ').filter(Boolean);

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400" />
        <div className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><ShieldCheck size={22} /></span>
            <div>
              <h1 className="text-xl font-black tracking-tight">Authorize {details?.client?.name ?? 'this app'}</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">It wants to act in StackAtlas as <strong className="text-slate-700 dark:text-zinc-200">@{profile?.username}</strong>.</p>
            </div>
          </div>

          {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">{error}</p>}

          {details && (
            <dl className="mb-4 space-y-2 text-sm">
              <div><dt className="text-slate-500 dark:text-zinc-400">Returns to</dt><dd className="break-all font-mono text-xs">{details.redirect_uri}</dd></div>
              {scopes.length > 0 && <div><dt className="text-slate-500 dark:text-zinc-400">Requested access</dt><dd>{scopes.join(', ')}</dd></div>}
            </dl>
          )}

          <div className={`mb-5 flex items-start gap-2 rounded-xl p-3 text-sm ${isAdmin ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-slate-50 text-slate-600 dark:bg-zinc-950/60 dark:text-zinc-300'}`}>
            <ShieldAlert size={16} className="mt-0.5 shrink-0" />
            <span>
              {isAdmin
                ? 'You are an administrator. An app you approve can read the research queue and submit research for your review through the connector. It cannot publish anything; you still approve every submission in Admin → Research.'
                : 'Your account is not an administrator, so the research connector will refuse this app even if you approve. Approving still signs it in as you.'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => void decide(true)} disabled={busy || !details} className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">Approve</button>
            <button onClick={() => void decide(false)} disabled={busy || !details} className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">Deny</button>
            <Link to="/" className="ml-auto self-center text-sm text-slate-500 hover:underline dark:text-zinc-400">Cancel</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h1 className="text-lg font-bold">{title}</h1>
        {body && <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">{body}</p>}
      </div>
    </div>
  );
}
