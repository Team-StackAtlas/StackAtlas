import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { addPost as addMockPost, getPosts, type Post } from '../data/mockData';
import { supabase, isBackendConfigured } from '../services/supabase/client';
import { createSupabasePost, loadSupabasePosts } from '../services/posts';
import { useAuth } from './AuthContext';

interface PostsContextValue {
  posts: Post[];
  loading: boolean;
  source: 'supabase' | 'mock';
  refresh: () => Promise<void>;
  /**
   * Publishes to Supabase when the backend is configured and the viewer is
   * signed in; otherwise falls back to the local mock store. Throws on a
   * failed Supabase publish so callers can surface the error.
   */
  publishPost: (post: Post) => Promise<void>;
}

const PostsContext = createContext<PostsContextValue | undefined>(undefined);

/**
 * Mirrors CatalogProvider: the mock/localStorage feed renders immediately,
 * then Supabase posts (real content) are prepended once loaded. Seed posts
 * stay below so the feed has life until the community produces enough
 * real content.
 */
export function PostsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [remotePosts, setRemotePosts] = useState<Post[] | null>(null);
  const [localVersion, setLocalVersion] = useState(0);
  const [loading, setLoading] = useState(isBackendConfigured);

  const refresh = useCallback(async () => {
    if (!isBackendConfigured || !supabase) {
      await Promise.resolve().then(() => setLocalVersion((v) => v + 1));
      return;
    }
    const loaded = await loadSupabasePosts(supabase);
    await Promise.resolve().then(() => {
      if (loaded) setRemotePosts(loaded);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publishPost = useCallback(
    async (post: Post) => {
      if (isBackendConfigured && supabase && user) {
        await createSupabasePost(supabase, post);
        await refresh();
        return;
      }
      addMockPost(post);
      setLocalVersion((v) => v + 1);
    },
    [refresh, user],
  );

  // localVersion invalidates this memo-less read after local writes.
  void localVersion;
  const posts = remotePosts ? [...remotePosts, ...getPosts()] : getPosts();

  return (
    <PostsContext.Provider
      value={{
        posts,
        loading,
        source: remotePosts ? 'supabase' : 'mock',
        refresh,
        publishPost,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error('usePosts must be used within a PostsProvider');
  return ctx;
}
