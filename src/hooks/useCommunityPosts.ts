import { useEffect, useMemo, useState } from 'react';
import { getPosts, type Post } from '../data/mockData';
import { supabase } from '../services/supabase/client';
import { listCommunityPosts } from '../services/community';
import { useAuth } from '../context/AuthContext';

export function useCommunityPosts() {
  const { user, isBackendConfigured } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => getPosts());
  const [loading, setLoading] = useState(isBackendConfigured);

  useEffect(() => {
    let active = true;
    if (!isBackendConfigured || !supabase) {
      setPosts(getPosts());
      setLoading(false);
      return;
    }
    setLoading(true);
    listCommunityPosts(supabase, user?.id)
      .then((items) => {
        if (active) setPosts(items.length > 0 ? items : getPosts());
      })
      .catch(() => {
        if (active) setPosts(getPosts());
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isBackendConfigured, user?.id]);

  return useMemo(() => ({ posts, loading }), [loading, posts]);
}
