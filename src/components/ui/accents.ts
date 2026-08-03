// The Create-page visual language, captured as reusable accent kits so every
// surface can match it without re-deriving class strings. Tailwind's purge
// only keeps classes it can see verbatim, so each accent enumerates its full
// literal strings — never build these with template interpolation.

export type Accent = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'teal';

export interface AccentKit {
  /** Gradient strip across the top of a card. */
  topBar: string;
  /** 12x12 gradient icon tile with glow shadow. */
  iconTile: string;
  /** Card hover/focus treatment (border + colored shadow + ring). */
  cardInteractive: string;
  /** Benefit-bullet dot. */
  dot: string;
  /** Bold CTA text color. */
  cta: string;
}

// Stable accent order for surfaces that color the twelve goal categories by
// canonical index (GoalsPicker, the Map category rail), so a category wears
// the same accent everywhere regardless of per-surface reordering.
export const ACCENT_CYCLE: Accent[] = ['emerald', 'blue', 'purple', 'amber', 'rose', 'teal'];

export const ACCENTS: Record<Accent, AccentKit> = {
  emerald: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:hover:border-emerald-500/60',
    dot: 'bg-emerald-500',
    cta: 'text-emerald-700 dark:text-emerald-400',
  },
  blue: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-blue-500 to-sky-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-500 shadow-md shadow-blue-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:hover:border-blue-500/60',
    dot: 'bg-blue-500',
    cta: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-purple-500 to-fuchsia-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 shadow-md shadow-purple-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:hover:border-purple-500/60',
    dot: 'bg-purple-500',
    cta: 'text-purple-700 dark:text-purple-400',
  },
  amber: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-amber-500 to-orange-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-md shadow-amber-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:hover:border-amber-500/60',
    dot: 'bg-amber-500',
    cta: 'text-amber-700 dark:text-amber-400',
  },
  rose: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-rose-500 to-pink-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 shadow-md shadow-rose-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:hover:border-rose-500/60',
    dot: 'bg-rose-500',
    cta: 'text-rose-700 dark:text-rose-400',
  },
  teal: {
    topBar: 'h-1.5 w-full bg-gradient-to-r from-teal-500 to-cyan-400',
    iconTile:
      'mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-md shadow-teal-500/25 transition-transform group-hover:scale-110',
    cardInteractive:
      'hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:hover:border-teal-500/60',
    dot: 'bg-teal-500',
    cta: 'text-teal-700 dark:text-teal-400',
  },
};
