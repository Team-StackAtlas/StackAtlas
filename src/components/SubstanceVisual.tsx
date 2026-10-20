import type { ReactElement } from 'react';
import type { Substance } from '../data/mockData';
import type { Accent } from './ui/accents';
import { substanceIdentity, type VisualIdentity, type VisualKind } from '../lib/visualIdentity';
import { cn } from '../lib/utils';

/**
 * The square identity tile used on cards and rails. A handful of SVG
 * templates keyed by `kind`, tinted with the substance's category accent.
 * All literals are enumerated so Tailwind keeps them.
 */

const TILE: Record<Accent, { bg: string; fg: string; stroke: string; soft: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-800 dark:text-emerald-200', stroke: 'text-emerald-500/70 dark:text-emerald-400/60', soft: 'text-emerald-500/25 dark:text-emerald-300/20' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', fg: 'text-blue-800 dark:text-blue-200', stroke: 'text-blue-500/70 dark:text-blue-400/60', soft: 'text-blue-500/25 dark:text-blue-300/20' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', fg: 'text-purple-800 dark:text-purple-200', stroke: 'text-purple-500/70 dark:text-purple-400/60', soft: 'text-purple-500/25 dark:text-purple-300/20' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', fg: 'text-amber-900 dark:text-amber-200', stroke: 'text-amber-500/80 dark:text-amber-400/60', soft: 'text-amber-500/25 dark:text-amber-300/20' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-500/10', fg: 'text-rose-800 dark:text-rose-200', stroke: 'text-rose-500/70 dark:text-rose-400/60', soft: 'text-rose-500/25 dark:text-rose-300/20' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-500/10', fg: 'text-teal-800 dark:text-teal-200', stroke: 'text-teal-500/70 dark:text-teal-400/60', soft: 'text-teal-500/25 dark:text-teal-300/20' },
};

const SIZES = { sm: 'h-9 w-9 rounded-lg text-[11px]', md: 'h-14 w-14 rounded-xl text-sm', lg: 'h-24 w-24 rounded-2xl text-2xl' } as const;
export type TileSize = keyof typeof SIZES;

/** Background motif per kind, drawn in a 48x48 box behind the label. */
function Motif({ kind, seed, className }: { kind: VisualKind; seed: number; className: string }) {
  const common = { className: cn('absolute inset-0 h-full w-full', className), viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true } as const;
  switch (kind) {
    case 'vitamin':
      // Capsule outline, tilted.
      return (
        <svg {...common}>
          <rect x="9" y="17" width="30" height="14" rx="7" transform="rotate(-28 24 24)" />
          <line x1="24" y1="13.5" x2="24" y2="34.5" transform="rotate(-28 24 24)" />
        </svg>
      );
    case 'mineral':
      // Hexagon, element-tile style.
      return (
        <svg {...common}>
          <polygon points="24,5 40,14 40,34 24,43 8,34 8,14" />
        </svg>
      );
    case 'pharma':
      // Scored tablet.
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="15" />
          <line x1="12" y1="24" x2="36" y2="24" />
        </svg>
      );
    case 'botanical':
      // Leaf in the lower-right corner.
      return (
        <svg {...common}>
          <path d="M44 8 C 30 8, 18 18, 18 34 C 34 34, 44 22, 44 8 Z" />
          <path d="M18 34 L 34 16" />
        </svg>
      );
    case 'fungal':
      // Cap and stem.
      return (
        <svg {...common}>
          <path d="M8 24 C 8 13, 40 13, 40 24 Z" />
          <path d="M19 24 L 19 38 Q 24 41 29 38 L 29 24" />
        </svg>
      );
    case 'amino':
      // Three linked nodes.
      return (
        <svg {...common}>
          <circle cx="10" cy="30" r="3.5" /><circle cx="24" cy="18" r="3.5" /><circle cx="38" cy="30" r="3.5" />
          <line x1="13" y1="28" x2="21" y2="20" /><line x1="27" y1="20" x2="35" y2="28" />
        </svg>
      );
    case 'food':
      // Bowl.
      return (
        <svg {...common}>
          <path d="M8 22 H 40 C 40 32, 33 38, 24 38 C 15 38, 8 32, 8 22 Z" />
          <line x1="16" y1="42" x2="32" y2="42" />
        </svg>
      );
    case 'peptide':
    case 'compound': {
      // Quiet dot grid, offset and rotated by seed so no two are alike, and
      // deliberately not a molecule.
      const rot = (seed % 7) * 5 - 15;
      const dx = (seed >> 3) % 6;
      const dy = (seed >> 6) % 6;
      const dots: ReactElement[] = [];
      for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
        if (((x + y + (seed >> 9)) % 3) === 0) continue;
        dots.push(<circle key={`${x}-${y}`} cx={6 + dx + x * 9} cy={6 + dy + y * 9} r={kind === 'peptide' ? 1.4 : 1.1} fill="currentColor" stroke="none" />);
      }
      return <svg {...common}><g transform={`rotate(${rot} 24 24)`}>{dots}</g></svg>;
    }
    default:
      // Soft ring.
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="16" strokeDasharray="4 6" />
        </svg>
      );
  }
}

export function IdentityTile({ identity, size = 'md', className }: { identity: VisualIdentity; size?: TileSize; className?: string }) {
  const t = TILE[identity.accent];
  const mono = identity.kind === 'peptide' || identity.kind === 'compound';
  return (
    <span className={cn('relative flex shrink-0 select-none items-center justify-center overflow-hidden font-bold leading-none', SIZES[size], t.bg, t.fg, className)} aria-hidden>
      <Motif kind={identity.kind} seed={identity.seed} className={t.soft} />
      <span className={cn('relative tracking-tight', mono && 'font-mono', identity.label.length > 3 && size !== 'lg' && 'text-[0.78em]', identity.label.length > 5 && 'text-[0.62em]')}>
        {identity.label}
      </span>
    </span>
  );
}

export function SubstanceVisual({ substance, size = 'md', className }: { substance: Pick<Substance, 'id' | 'name' | 'aliases' | 'typeTags' | 'paths'>; size?: TileSize; className?: string }) {
  return <IdentityTile identity={substanceIdentity(substance)} size={size} className={className} />;
}

export function MonogramTile({ label, accent, size = 'md', className }: { label: string; accent: Accent; size?: TileSize; className?: string }) {
  const t = TILE[accent];
  return (
    <span className={cn('relative flex shrink-0 select-none items-center justify-center overflow-hidden font-bold leading-none', SIZES[size], t.bg, t.fg, className)} aria-hidden>
      <span className="relative tracking-tight">{label}</span>
    </span>
  );
}
