import type { ReactNode } from 'react';

/**
 * Centered page opener in the Create-page style: big bold headline, one
 * quiet explainer line, generous air above the content.
 */
export function PageIntro({ title, subtitle, children }: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto mb-8 mt-4 max-w-2xl text-center md:mt-10">
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 md:text-4xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-slate-500 dark:text-zinc-400">{subtitle}</p>}
      {children}
    </div>
  );
}

/** The quiet centered helper line that closes a chooser section. */
export function IntroFootnote({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-center text-xs text-slate-500 dark:text-zinc-400">{children}</p>;
}
