import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import privacy from '../content/legal/privacy.md?raw';
import terms from '../content/legal/terms.md?raw';
import cookies from '../content/legal/cookies.md?raw';
import refunds from '../content/legal/refunds.md?raw';

const LEGAL_DOCS = {
  privacy: { title: 'Privacy Policy', body: privacy },
  terms: { title: 'Terms of Service', body: terms },
  cookies: { title: 'Cookie & Local Storage Policy', body: cookies },
  refunds: { title: 'Refund Policy', body: refunds },
} as const;

type LegalDocKey = keyof typeof LEGAL_DOCS;

// Legal text lives as Markdown in src/content/legal so it can be reviewed and
// diffed like any other document; this page just renders it.
export default function Legal() {
  const { doc } = useParams<{ doc: string }>();
  if (!doc || !(doc in LEGAL_DOCS)) return <Navigate to="/legal/privacy" replace />;
  const key = doc as LegalDocKey;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="Legal documents" className="mb-6 flex flex-wrap gap-2 text-sm">
        {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((k) => (
          <Link
            key={k}
            to={`/legal/${k}`}
            aria-current={k === key ? 'page' : undefined}
            className={
              k === key
                ? 'rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }
          >
            {LEGAL_DOCS[k].title}
          </Link>
        ))}
      </nav>
      <article className="legal-doc">
        <ReactMarkdown>{LEGAL_DOCS[key].body}</ReactMarkdown>
      </article>
    </div>
  );
}
