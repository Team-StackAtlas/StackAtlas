import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';

const STORAGE_KEY = 'stackatlas_post_likes';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StoredPostLike = { postId: string; userId: string };

function readLocal(): StoredPostLike[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: StoredPostLike[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function usePostLike(postId: string, initialCount: number, authorId?: string) {
  const { services, user, isBackendConfigured } = useAuth();
  const requireAccount = useRequireAccountAction();
  const userId = user?.id ?? 'local-user';
  const canUseBackend = !!(isBackendConfigured && services?.postLikes && user && UUID_RE.test(postId));
  const [liked, setLiked] = useState(() => readLocal().some((row) => row.postId === postId && row.userId === userId));
  const [localDelta, setLocalDelta] = useState(0);
  const [remoteCount, setRemoteCount] = useState<number | null>(null);

  useEffect(() => {
    if (canUseBackend && services?.postLikes && user) {
      Promise.all([services.postLikes.isLiked(user.id, postId), services.postLikes.count(postId)])
        .then(([nextLiked, nextCount]) => {
          setLiked(nextLiked);
          setRemoteCount(nextCount);
          setLocalDelta(0);
        })
        .catch((error) => console.error('Failed to load post like state', error));
      return;
    }
    Promise.resolve().then(() => {
      setLiked(readLocal().some((row) => row.postId === postId && row.userId === userId));
      setRemoteCount(null);
      setLocalDelta(0);
    });
  }, [canUseBackend, postId, services, user, userId]);

  const count = useMemo(() => Math.max(0, (remoteCount ?? initialCount) + localDelta), [initialCount, localDelta, remoteCount]);

  const toggleLike = async () => {
    if (!requireAccount()) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLocalDelta((value) => value + (nextLiked ? 1 : -1));

    try {
      if (canUseBackend && services?.postLikes && user) {
        if (nextLiked) await services.postLikes.like(user.id, postId, authorId);
        else await services.postLikes.unlike(user.id, postId);
        setRemoteCount(await services.postLikes.count(postId));
        setLocalDelta(0);
        return;
      }
      const rows = readLocal().filter((row) => !(row.postId === postId && row.userId === userId));
      if (nextLiked) rows.push({ postId, userId });
      writeLocal(rows);
    } catch (error) {
      console.error('Failed to update post like', error);
      setLiked(!nextLiked);
      setLocalDelta((value) => value + (nextLiked ? -1 : 1));
    }
  };

  return { liked, count, toggleLike };
}
