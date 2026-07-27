/**
 * Whether the user asked the OS to reduce motion. CSS handles transitions and
 * animations, but scrollIntoView/scrollBy take their behavior as a JS argument
 * and ignore the stylesheet — so those call sites have to ask.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/** Scroll behavior honoring the reduce-motion preference. */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
