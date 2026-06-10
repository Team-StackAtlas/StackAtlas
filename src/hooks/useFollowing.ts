import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';

export type FollowTarget = 'user' | 'substance' | 'stack' | 'brand';
export interface FollowEntry {
  targetType: FollowTarget;
  targetId: string;
}

const STORAGE_KEY = 'stackatlas_following';

/**
 * Following is PUBLIC/social and drives the Following feed — distinct from Saved
 * (private/research). Users can save privately without following.
 *
 * Dual-mode: when the backend is configured AND the user is authenticated, this
 * reads/writes through the Supabase `FollowService`. Otherwise it falls back to
 * localStorage (offline/dev). The hook's API stays synchronous so callers don't
 * change.
 */
function readLocal(): FollowEntry[] {
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
  const { services, user, isBackendConfigured } = useAuth();
  const requireAccount = useRequireAccountAction();
  const backed = !!(isBackendConfigured && services && user);
  const [following, setFollowing] = useState<FollowEntry[]>(() => readLocal());

  useEffect(() => {
    if (backed && services && user) {
      services.follows
        .list(user.id)
        .then((rows) =>
          setFollowing(rows.map((r) => ({ targetType: r.targetType as FollowTarget, targetId: r.targetId }))),
        )
        .catch(() => {});
    } else if (!isBackendConfigured) {
      setFollowing(readLocal());
    } else {
      setFollowing([]);
    }
  }, [backed, isBackendConfigured, services, user]);

  const persistLocal = (next: FollowEntry[]) => {
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
    if (!requireAccount()) return;
    const currentlyFollowing = isFollowing(targetType, targetId);
    if (backed && services && user) {
      const op = currentlyFollowing
        ? services.follows.unfollow(user.id, { targetType, targetId })
        : services.follows.follow(user.id, { targetType, targetId });
      // optimistic update
      setFollowing((prev) =>
        currentlyFollowing
          ? prev.filter((f) => !(f.targetType === targetType && f.targetId === targetId))
          : [...prev, { targetType, targetId }],
      );
      op.catch(() => {
        // revert on failure
        setFollowing((prev) =>
          currentlyFollowing
            ? [...prev, { targetType, targetId }]
            : prev.filter((f) => !(f.targetType === targetType && f.targetId === targetId)),
        );
      });
      return;
    }
    persistLocal(
      currentlyFollowing
        ? following.filter((f) => !(f.targetType === targetType && f.targetId === targetId))
        : [...following, { targetType, targetId }],
    );
  };

  return { following, isFollowing, toggleFollow };
}
