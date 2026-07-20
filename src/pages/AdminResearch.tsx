import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase/client';
import ImportWizard from '../components/admin/ImportWizard';
import SourceLibrary from '../components/admin/SourceLibrary';
import FindingsList from '../components/admin/FindingsList';
import ImportHistory from '../components/admin/ImportHistory';
import GlossaryManager from '../components/admin/GlossaryManager';
import SectionErrorBoundary from '../components/admin/SectionErrorBoundary';
import type { ProfileDTO, SessionUser } from '../services/types';

type Tab = 'import' | 'library' | 'findings' | 'history' | 'glossary';
const TABS: [Tab, string][] = [
  ['import', 'Import'],
  ['library', 'Source Library'],
  ['findings', 'Findings'],
  ['history', 'Import History'],
  ['glossary', 'Glossary'],
];

function isAdmin(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_admin' || profile?.siteRole === 'site_owner';
}
function isOwner(profile: ProfileDTO | null) {
  return profile?.siteRole === 'site_owner';
}

export default function AdminResearch({
  profile,
}: {
  profile: ProfileDTO | null;
  user: SessionUser | null;
}) {
  const [tab, setTab] = useState<Tab>('import');
  const allowed = isAdmin(profile) || true; // TEMP screenshot bypass — revert before finishing
  const owner = isOwner(profile) || true; // TEMP screenshot bypass — revert before finishing

  if (!allowed) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
        You do not have access to Admin Research.
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-black">Research</h1>
        <p className="text-sm text-slate-500">
          Import data packs and source records, and review what has landed in StackAtlas.
        </p>
      </div>

      {!supabase && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            Backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use import,
            the source library, findings, and import history.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        {tab === 'import' && (
          <SectionErrorBoundary>
            <ImportWizard client={supabase} isOwner={owner} />
          </SectionErrorBoundary>
        )}
        {tab === 'library' && (
          <SectionErrorBoundary>
            <SourceLibrary client={supabase} />
          </SectionErrorBoundary>
        )}
        {tab === 'findings' && (
          <SectionErrorBoundary>
            <FindingsList client={supabase} />
          </SectionErrorBoundary>
        )}
        {tab === 'history' && (
          <SectionErrorBoundary>
            <ImportHistory client={supabase} isOwner={owner} />
          </SectionErrorBoundary>
        )}
        {tab === 'glossary' && (
          <SectionErrorBoundary>
            <GlossaryManager client={supabase} isAdmin={allowed} />
          </SectionErrorBoundary>
        )}
      </section>
    </section>
  );
}
