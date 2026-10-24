import { Link, Navigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import privacy from '../content/legal/privacy.md?raw';
import terms from '../content/legal/terms.md?raw';
import cookies from '../content/legal/cookies.md?raw';
import refunds from '../content/legal/refunds.md?raw';
import about from '../content/about.md?raw';

const LEGAL_DOCS = {
  about: { title: 'About', body: about, path: '/about' },
  privacy: { title: 'Privacy Policy', body: privacy },
  terms: { title: 'Terms of Service', body: terms },
  cookies: { title: 'Cookie & Local Storage Policy', body: cookies },
  refunds: { title: 'Refund Policy', body: refunds },
} as const;

type LegalDocKey = keyof typeof LEGAL_DOCS;

function pathFor(k: LegalDocKey) {
  const entry = LEGAL_DOCS[k] as { path?: string };
  return entry.path ?? `/legal/${k}`;
}

// The About & Privacy hub. Text lives as Markdown in src/content so it can be
// reviewed and diffed like any other document; this page just renders it.
// `/about` mounts it with a fixed doc; `/legal/:doc` reads the route param.
export default function Legal({ doc: fixedDoc }: { doc?: LegalDocKey } = {}) {
  const params = useParams<{ doc: string }>();
  const doc = fixedDoc ?? params.doc;
  if (!doc || !(doc in LEGAL_DOCS)) return <Navigate to="/about" replace />;
  const key = doc as LegalDocKey;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="About and legal documents" className="mb-6 flex flex-wrap gap-2 text-sm">
        {(Object.keys(LEGAL_DOCS) as LegalDocKey[]).map((k) => (
          <Link
            key={k}
            to={pathFor(k)}
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
