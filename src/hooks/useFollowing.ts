import { useState } from 'react';

export type FollowTarget = 'user' | 'substance' | 'stack' | 'brand';
export interface FollowEntry {
  targetType: FollowTarget;
  targetId: string;
}

const STORAGE_KEY = 'stackatlas_following';

/**
 * Following is PUBLIC/social and drives the Following feed — distinct from Saved
 * (which is private/research). Users can save privately without following.
 *
 * NOTE: localStorage is the dev/offline fallback. When the backend is configured
 * this moves behind `FollowService` (see src/services/contracts.ts) with no UI
 * change, and following will also drive notifications server-side.
 */
function read(): FollowEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useFollowing() {
  const [following, setFollowing] = useState<FollowEntry[]>(() => read());

  const persist = (next: FollowEntry[]) => {
    setFollowing(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures
    }
  };

  const isFollowing = (targetType: FollowTarget, targetId: string) =>
    following.some((f) => f.targetType === targetType && f.targetId === targetId);

  const toggleFollow = (targetType: FollowTarget, targetId: string) => {
    if (isFollowing(targetType, targetId)) {
      persist(following.filter((f) => !(f.targetType === targetType && f.targetId === targetId)));
    } else {
      persist([...following, { targetType, targetId }]);
    }
  };

  return { following, isFollowing, toggleFollow };
}
