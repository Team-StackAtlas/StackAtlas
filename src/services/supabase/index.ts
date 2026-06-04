import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthService,
  ProfileService,
  SavedService,
  HiddenService,
  FollowService,
  NotificationService,
} from '../contracts';
import type {
  SessionUser,
  ProfileDTO,
  ProfileUpdate,
  SavedItem,
  HiddenItem,
  Follow,
  NotificationDTO,
  ID,
} from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfile(row: any, stats?: any): ProfileDTO {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? undefined,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role ?? 'User',
    researchScope: row.research_scope ?? 'Citizen',
    isVerified: !!row.is_verified,
    joinDate: row.created_at,
    settings: row.settings ?? {},
    stats: stats
      ? {
          followersCount: stats.followers_count ?? 0,
          followingCount: stats.following_count ?? 0,
          dispatchCount: stats.dispatch_count ?? 0,
          signalCount: stats.signal_count ?? 0,
        }
      : undefined,
  };
}

function mapSessionUser(profile: ProfileDTO, email: string | null): SessionUser {
  return {
    id: profile.id,
    email,
    username: profile.username,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
    researchScope: profile.researchScope,
    isVerified: profile.isVerified,
  };
}

/**
 * Account/state services backed by Supabase. Only the contracts relevant to
 * accounts are implemented here; catalog/posts continue to come from the mock
 * adapter until those surfaces are migrated.
 */
export function createSupabaseAccountServices(client: SupabaseClient): {
  auth: AuthService;
  profiles: ProfileService;
  saved: SavedService;
  hidden: HiddenService;
  follows: FollowService;
  notifications: NotificationService;
} {
  const profiles: ProfileService = {
    async get(userId: ID) {
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: stats } = await client.from('profile_stats').select('*').eq('id', userId).maybeSingle();
      return mapProfile(data, stats);
    },
    async getByUsername(username: string) {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: stats } = await client.from('profile_stats').select('*').eq('id', data.id).maybeSingle();
      return mapProfile(data, stats);
    },
    async update(userId: ID, patch: ProfileUpdate) {
      const payload: Record<string, unknown> = {};
      if (patch.displayName !== undefined) payload.display_name = patch.displayName;
      if (patch.bio !== undefined) payload.bio = patch.bio;
      if (patch.website !== undefined) payload.website = patch.website;
      if (patch.researchScope !== undefined) payload.research_scope = patch.researchScope;
      if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
      if (patch.settings !== undefined) payload.settings = patch.settings;
      payload.updated_at = new Date().toISOString();
      const { data, error } = await client
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw error;
      return mapProfile(data);
    },
  };

  const auth: AuthService = {
    async getCurrentUser() {
      const { data: sessionData } = await client.auth.getUser();
      const authUser = sessionData.user;
      if (!authUser) return null;
      const profile = await profiles.get(authUser.id);
      if (!profile) return null;
      return mapSessionUser(profile, authUser.email ?? null);
    },
    async signUpWithEmail(email, password, username) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: username ? { data: { username } } : undefined,
      });
      if (error) throw error;
      if (!data.user) return null; // email confirmation required
      const profile = await profiles.get(data.user.id);
      return profile ? mapSessionUser(profile, data.user.email ?? null) : null;
    },
    async signInWithEmail(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const profile = await profiles.get(data.user.id);
      if (!profile) throw new Error('Profile not found for authenticated user');
      return mapSessionUser(profile, data.user.email ?? null);
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    },
  };

  const saved: SavedService = {
    async list(userId: ID) {
      const { data, error } = await client.from('saved_items').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ itemType: r.item_type, itemId: r.item_id }) as SavedItem);
    },
    async add(userId: ID, item: SavedItem) {
      const { error } = await client
        .from('saved_items')
        .upsert({ user_id: userId, item_type: item.itemType, item_id: item.itemId });
      if (error) throw error;
    },
    async remove(userId: ID, item: SavedItem) {
      const { error } = await client
        .from('saved_items')
        .delete()
        .match({ user_id: userId, item_type: item.itemType, item_id: item.itemId });
      if (error) throw error;
    },
  };

  const hidden: HiddenService = {
    async list(userId: ID) {
      const { data, error } = await client.from('hidden_items').select('*').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map(
        (r: any) => ({ itemType: r.item_type, itemId: r.item_id, tagType: r.tag_type ?? undefined }) as HiddenItem,
      );
    },
    async add(userId: ID, item: HiddenItem) {
      const { error } = await client.from('hidden_items').upsert({
        user_id: userId,
        item_type: item.itemType,
        item_id: item.itemId,
        tag_type: item.tagType ?? null,
      });
      if (error) throw error;
    },
    async remove(userId: ID, item: HiddenItem) {
      const { error } = await client
        .from('hidden_items')
        .delete()
        .match({ user_id: userId, item_type: item.itemType, item_id: item.itemId });
      if (error) throw error;
    },
  };

  const follows: FollowService = {
    async list(userId: ID) {
      const { data, error } = await client.from('follows').select('*').eq('follower_id', userId);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ targetType: r.target_type, targetId: r.target_id }) as Follow);
    },
    async follow(userId: ID, target: Follow) {
      const { error } = await client
        .from('follows')
        .upsert({ follower_id: userId, target_type: target.targetType, target_id: target.targetId });
      if (error) throw error;
    },
    async unfollow(userId: ID, target: Follow) {
      const { error } = await client
        .from('follows')
        .delete()
        .match({ follower_id: userId, target_type: target.targetType, target_id: target.targetId });
      if (error) throw error;
    },
  };

  const notifications: NotificationService = {
    async list(userId: ID) {
      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r: any) =>
          ({
            id: r.id,
            kind: r.kind,
            title: r.title,
            body: r.body ?? undefined,
            link: r.link ?? undefined,
            readAt: r.read_at,
            createdAt: r.created_at,
          }) as NotificationDTO,
      );
    },
    async markRead(userId: ID, notificationId: ID) {
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .match({ id: notificationId, user_id: userId });
      if (error) throw error;
    },
    async markAllRead(userId: ID) {
      const { error } = await client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
  };

  return { auth, profiles, saved, hidden, follows, notifications };
}
