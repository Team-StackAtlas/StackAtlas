import ReactMarkdown from 'react-markdown';
import about from '../content/about.md?raw';
import { usePageMeta } from '../hooks/usePageMeta';

// The mission statement lives as Markdown in src/content so it can be
// reviewed and diffed like any other document; this page just renders it.
export default function About() {
  usePageMeta('About', 'Why StackAtlas exists and what it is for.');
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <article className="legal-doc">
        <ReactMarkdown>{about}</ReactMarkdown>
      </article>
    </div>
  );
}
