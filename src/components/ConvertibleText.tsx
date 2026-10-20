import { useState, type ReactNode } from 'react';
import { CM_PER_IN, LB_PER_KG } from '../lib/units';
import { useUnitSystem } from '../hooks/useUnitSystem';
import type { UnitSystem } from '../services/types';

/**
 * Post text is never rewritten: a Dispatch that says "squatted 500 lb" stays
 * exactly as written. Instead, numbers carrying a convertible unit become
 * tappable, and a tap shows the other system's value inline. Only
 * body-weight, distance, height and temperature units qualify; doses
 * (mg, mcg, g, IU, ml) are never touched because those are not a unit
 * system difference and must read exactly as the author wrote them.
 */

type Conv = { to: (n: number) => number; unit: string; system: UnitSystem; digits?: number };

// Longest spellings first inside each alternative so "pounds" wins over "lb".
const UNIT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s?(pounds?|lbs?|kilograms?|kilos?|kgs?|kilomet(?:er|re)s?|km|miles?|mi|centimet(?:er|re)s?|cm|feet|foot|ft|°\s?[FC]|degrees?\s?(?:F|C|fahrenheit|celsius))(?![a-z])|(\d)\s?[′']\s?(\d{1,2})\s?(?:″|"|”)?(?![a-z\d])/gi;

function convFor(unitRaw: string): Conv | null {
  const u = unitRaw.toLowerCase().replace(/\s+/g, '');
  if (/^(pounds?|lbs?)$/.test(u)) return { to: (n) => n / LB_PER_KG, unit: 'kg', system: 'imperial', digits: 1 };
  if (/^(kilograms?|kilos?|kgs?)$/.test(u)) return { to: (n) => n * LB_PER_KG, unit: 'lb', system: 'metric' };
  if (/^(kilomet(?:er|re)s?|km)$/.test(u)) return { to: (n) => n * 0.621371, unit: 'mi', system: 'metric', digits: 1 };
  if (/^(miles?|mi)$/.test(u)) return { to: (n) => n * 1.609344, unit: 'km', system: 'imperial', digits: 1 };
  if (/^(centimet(?:er|re)s?|cm)$/.test(u)) return { to: (n) => n / CM_PER_IN, unit: 'in', system: 'metric', digits: 1 };
  if (/^(feet|foot|ft)$/.test(u)) return { to: (n) => n * 12 * CM_PER_IN, unit: 'cm', system: 'imperial' };
  if (/^(°f|degreesf|degreef|degreesfahrenheit|degreefahrenheit)$/.test(u)) return { to: (n) => ((n - 32) * 5) / 9, unit: '°C', system: 'imperial' };
  if (/^(°c|degreesc|degreec|degreescelsius|degreecelsius)$/.test(u)) return { to: (n) => (n * 9) / 5 + 32, unit: '°F', system: 'metric' };
  return null;
}

function fmt(n: number, digits = 0) {
  const rounded = Math.round(n * 10 ** digits) / 10 ** digits;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function ConvertibleText({ children }: { children: ReactNode }) {
  const [viewerUnits] = useUnitSystem();
  if (typeof children !== 'string') return <>{children}</>;

  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of children.matchAll(UNIT_PATTERN)) {
    const index = m.index ?? 0;
    let converted: string | null = null;
    let from: UnitSystem | null = null;
    if (m[3] !== undefined) {
      // 5'11" style height
      const cm = (Number(m[3]) * 12 + Number(m[4])) * CM_PER_IN;
      converted = `${fmt(cm)} cm`;
      from = 'imperial';
    } else {
      const conv = convFor(m[2]);
      if (!conv) continue;
      converted = `${fmt(conv.to(Number(m[1].replace(',', '.'))), conv.digits)} ${conv.unit}`;
      from = conv.system;
    }
    // Only offer the tap when the text is in the *other* system from the viewer.
    if (from === viewerUnits) continue;
    if (index > last) nodes.push(children.slice(last, index));
    nodes.push(<Convertible key={key++} label={m[0]} converted={converted} />);
    last = index + m[0].length;
  }
  if (last === 0) return <>{children}</>;
  if (last < children.length) nodes.push(children.slice(last));
  return <>{nodes}</>;
}

function Convertible({ label, converted }: { label: string; converted: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
      aria-pressed={open}
      aria-label={open ? `${label}, converted: ${converted}` : `${label}, tap to convert`}
      className="inline rounded-sm border-b border-dotted border-slate-400 text-inherit hover:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-500"
    >
      {label}
      {open && <span className="ml-1 rounded bg-emerald-100 px-1 text-[0.85em] font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">≈ {converted}</span>}
    </button>
  );
}
