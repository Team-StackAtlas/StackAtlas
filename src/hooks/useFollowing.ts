import { useEffect, useState } from 'react';
import { useToast } from '../components/ui/ToastProvider';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';

export type FollowTarget = 'user' | 'substance' | 'stack' | 'brand' | 'album';
export interface FollowEntry {
  targetType: FollowTarget;
  targetId: string;
}

const STORAGE_KEY = 'stackatlas_following';
const REQUESTS_KEY = 'stackatlas_follow_requests';

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
  const { toast } = useToast();
  const backed = !!(isBackendConfigured && services && user);
  const [following, setFollowing] = useState<FollowEntry[]>(() => readLocal());
  const [requests, setRequests] = useState<FollowEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(REQUESTS_KEY) || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (backed && services && user) {
      services.follows
        .list(user.id)
        .then((rows) => setFollowing(rows.map((r) => ({ targetType: r.targetType as FollowTarget, targetId: r.targetId }))))
        .catch((error) => console.error('Failed to load follows', error));
      services.follows
        .listOutgoingRequests(user.id)
        .then((rows) => setRequests(rows.map((r) => ({ targetType: 'user', targetId: r.targetUserId }))))
        .catch((error) => console.error('Failed to load follow requests', error));
    } else if (!isBackendConfigured) {
      queueMicrotask(() => setFollowing(readLocal()));
    } else {
      queueMicrotask(() => {
        setFollowing([]);
        setRequests([]);
      });
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

  const persistLocalRequests = (next: FollowEntry[]) => {
    setRequests(next);
    try {
      localStorage.setItem(REQUESTS_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures
    }
  };

  const isFollowing = (targetType: FollowTarget, targetId: string) =>
    following.some((f) => f.targetType === targetType && f.targetId === targetId);

  const requestStatus = (targetType: FollowTarget, targetId: string) =>
    requests.some((f) => f.targetType === targetType && f.targetId === targetId) ? 'pending' : null;

  const toggleFollow = async (targetType: FollowTarget, targetId: string) => {
    if (!requireAccount()) return;
    const currentlyFollowing = isFollowing(targetType, targetId);
    const currentlyRequested = requestStatus(targetType, targetId) === 'pending';

    if (backed && services && user) {
      if (currentlyFollowing || currentlyRequested) {
        setFollowing((prev) => prev.filter((f) => !(f.targetType === targetType && f.targetId === targetId)));
        setRequests((prev) => prev.filter((f) => !(f.targetType === targetType && f.targetId === targetId)));
        try {
          await services.follows.unfollow(user.id, { targetType, targetId });
        } catch (error) {
          console.error('Failed to unfollow', error);
          toast('Could not unfollow. Please try again.', 'error');
          if (currentlyFollowing) setFollowing((prev) => [...prev, { targetType, targetId }]);
          if (currentlyRequested) setRequests((prev) => [...prev, { targetType, targetId }]);
        }
        return;
      }

      try {
        const status = await services.follows.follow(user.id, { targetType, targetId });
        if (status === 'requested') {
          setRequests((prev) => prev.some((f) => f.targetType === targetType && f.targetId === targetId) ? prev : [...prev, { targetType, targetId }]);
          return;
        }
        setFollowing((prev) => prev.some((f) => f.targetType === targetType && f.targetId === targetId) ? prev : [...prev, { targetType, targetId }]);
      } catch (error) {
        console.error('Failed to follow', error);
        toast('Could not follow. Please try again.', 'error');
      }
      return;
    }

    if (currentlyRequested) {
      persistLocalRequests(requests.filter((f) => !(f.targetType === targetType && f.targetId === targetId)));
      return;
    }
    persistLocal(
      currentlyFollowing
        ? following.filter((f) => !(f.targetType === targetType && f.targetId === targetId))
        : [...following, { targetType, targetId }],
    );
  };

  return { following, requests, isFollowing, requestStatus, toggleFollow };
}
