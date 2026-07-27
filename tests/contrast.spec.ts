import { test, expect, type Page } from '@playwright/test';

/**
 * WCAG AA contrast guard. The app was brought to zero failures in #174; this
 * keeps it there, since a single new `text-slate-400` reintroduces them
 * silently. Failures print the offending text, ratio, and class list.
 *
 * Two details matter for correctness and are easy to get wrong:
 *  - Colors are rasterized through a canvas. Tailwind v4 emits `oklch()`,
 *    which getComputedStyle returns verbatim; regex parsing silently misses
 *    it and every element then measures against a bogus white default.
 *  - Elements whose background chain hits a gradient are skipped rather than
 *    measured against a distant ancestor, which would report false failures.
 */

interface Failure {
  text: string;
  ratio: number;
  need: number;
  size: number;
  color: string;
  cls: string;
}

const ROUTES = [
  '/map',
  '/square',
  '/supplement/magnesium-glycinate',
  '/brand/b1',
  '/stack/st1',
  '/lab',
  '/glossary',
  '/library',
  '/notifications',
  '/comms',
  '/compare?type=substance&id1=caffeine&id2=l-theanine',
  '/profile',
];

function auditPage(): Failure[] {
  const srgb = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = (rgb: number[]) => 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const parse = (value: string): { rgb: number[]; a: number } | null => {
    if (!value || value === 'transparent' || value === 'none') return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = value;
    if (ctx.fillStyle === '#000' && !/^#0{3,6}$|black|rgba?\(0, ?0, ?0/.test(value)) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
  };

  const backgroundOf = (el: Element): number[] | null => {
    let node: Element | null = el;
    while (node) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0.95) return c.rgb;
      node = node.parentElement;
    }
    return document.documentElement.classList.contains('dark') ? [9, 9, 11] : [255, 255, 255];
  };

  const failures: Failure[] = [];
  const seen = new Set<string>();
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const box = el as HTMLElement;
    if (!box.offsetWidth && !box.offsetHeight) continue;
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => (n.textContent ?? '').trim())
      .join(' ')
      .trim();
    if (!own) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.15) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = backgroundOf(el);
    if (!bg) continue;

    const alpha = fg.a * parseFloat(cs.opacity);
    const eff = fg.rgb.map((c, i) => c * alpha + bg[i] * (1 - alpha));
    const l1 = lum(eff);
    const l2 = lum(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (ratio >= need) continue;

    const key = `${own.slice(0, 24)}|${cs.color}|${Math.round(size)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    failures.push({
      text: own.slice(0, 40),
      ratio: Number(ratio.toFixed(2)),
      need,
      size,
      color: cs.color,
      cls: String((el as HTMLElement).className ?? '').slice(0, 80),
    });
  }
  return failures.sort((a, b) => a.ratio - b.ratio);
}

async function auditTheme(page: Page, theme: 'light' | 'dark') {
  const found: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    // Contexts hydrate from seed data synchronously, but give layout a beat.
    await page.waitForTimeout(400);
    const failures = await page.evaluate(auditPage);
    for (const f of failures) {
      found.push(`${theme} ${route}: ${f.ratio}:1 (needs ${f.need}) ${f.size}px "${f.text}" ${f.color} :: ${f.cls}`);
    }
  }
  expect(found, `WCAG AA contrast failures:\n${found.join('\n')}`).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} mode meets WCAG AA contrast on primary routes`, async ({ page }) => {
    await page.addInitScript((t) => {
      localStorage.setItem(
        'stackatlas_user_scope',
        JSON.stringify({ id: 'mock-user', username: 'testuser', displayName: 'Test User', onboarded: true }),
      );
      localStorage.setItem('theme', t);
    }, theme);
    await auditTheme(page, theme);
  });
}
