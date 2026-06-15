import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AuthService,
  ProfileService,
  SavedService,
  HiddenService,
  FollowService,
  NotificationService,
  ReportService,
  SuggestEditService,
  LibraryService,
  PostLikeService,
} from '../contracts';
import { isProfileComplete, normalizeUsername, validateUsername } from '../../lib/account';
import type {
  SessionUser,
  ProfileDTO,
  ProfileUpdate,
  SavedItem,
  HiddenItem,
  Follow,
  FollowRequest,
  NotificationDTO,
  ID,
  ReportInput,
  SuggestEditInput,
} from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Unknown error';
}

function fallbackUsername(userId: string) {
  return `user_${userId.replace(/-/g, '').slice(0, 19)}`;
}

function readableProfileError(error: { message?: string; code?: string }) {
  const message = error.message ?? 'Failed to save profile.';
  if (error.code === '23505' || message.toLowerCase().includes('duplicate')) {
    return 'That username is already taken.';
  }
  if (message.includes('username_change_cooldown')) {
    return 'Usernames can only be changed once every 30 days.';
  }
  if (message.includes('profiles_username_format')) {
    return 'Username must be 3–24 characters using lowercase letters, numbers, or underscores.';
  }
  return message;
}

function mapProfile(row: any, stats?: any): ProfileDTO {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? undefined,
    bio: row.bio ?? undefined,
    website: row.website ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    age: row.age ?? null,
    weight: row.weight ?? null,
    height: row.height ?? null,
    sex: row.sex ?? null,
    bodyFatPercentage: row.body_fat_percentage ?? null,
    usernameLastChangedAt: row.username_last_changed_at ?? null,
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
    isProfileComplete: isProfileComplete(profile),
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
  reports: ReportService;
  suggestEdits: SuggestEditService;
  library: LibraryService;
  postLikes: PostLikeService;
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
      if (patch.username !== undefined) {
        const username = normalizeUsername(patch.username);
        const usernameError = validateUsername(username);
        if (usernameError) throw new Error(usernameError);
        payload.username = username;
      }
      if (patch.displayName !== undefined) payload.display_name = patch.displayName.trim();
      if (patch.bio !== undefined) payload.bio = patch.bio;
      if (patch.website !== undefined) payload.website = patch.website;
      if (patch.researchScope !== undefined) payload.research_scope = patch.researchScope;
      if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl || null;
      if (patch.age !== undefined) payload.age = patch.age;
      if (patch.weight !== undefined) payload.weight = patch.weight;
      if (patch.height !== undefined) payload.height = patch.height;
      if (patch.sex !== undefined) payload.sex = patch.sex || null;
      if (patch.bodyFatPercentage !== undefined) payload.body_fat_percentage = patch.bodyFatPercentage;
      if (patch.settings !== undefined) payload.settings = patch.settings;
      payload.updated_at = new Date().toISOString();
      const { data, error } = await client
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .single();
      if (error) throw new Error(readableProfileError(error));
      return mapProfile(data);
    },
  };

  async function createProfileForAuthUser(authUser: { id: string; email?: string | null }) {
    const { error: userError } = await client
      .from('users')
      .insert({ id: authUser.id, email: authUser.email ?? null });
    if (userError && userError.code !== '23505') {
      throw new Error(getErrorMessage(userError));
    }

    const { data, error } = await client
      .from('profiles')
      .insert({ id: authUser.id, username: fallbackUsername(authUser.id), settings: {} })
      .select('*')
      .single();
    if (error) throw new Error(readableProfileError(error));
    return mapProfile(data);
  }

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
      const normalizedUsername = username ? normalizeUsername(username) : undefined;
      if (normalizedUsername) {
        const usernameError = validateUsername(normalizedUsername);
        if (usernameError) throw new Error(usernameError);
      }
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: normalizedUsername ? { data: { username: normalizedUsername } } : undefined,
      });
      if (error) throw error;
      if (!data.user) return null; // email confirmation required
      const profile = await profiles.get(data.user.id);
      return profile ? mapSessionUser(profile, data.user.email ?? null) : null;
    },
    async signInWithEmail(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(`Sign-in failed: ${error.message}`);
      if (!data.user) throw new Error('Sign-in failed: Supabase did not return an authenticated user.');

      let profile: ProfileDTO | null;
      try {
        profile = await profiles.get(data.user.id);
      } catch (profileError) {
        throw new Error(
          `Sign-in succeeded, but StackAtlas could not load your profile: ${getErrorMessage(profileError)}`,
        );
      }

      if (!profile) {
        try {
          profile = await createProfileForAuthUser(data.user);
        } catch (profileError) {
          throw new Error(
            `Sign-in succeeded, but StackAtlas could not create your profile: ${getErrorMessage(profileError)}`,
          );
        }
      }

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
      return (data ?? []).map((r: any) => ({ itemType: r.item_type, itemId: r.item_id, savedAt: r.created_at, title: r.title ?? undefined, url: r.url ?? undefined, description: r.description ?? undefined, siteName: r.site_name ?? undefined, relatedType: r.related_type ?? undefined, relatedId: r.related_id ?? undefined, relatedName: r.related_name ?? undefined }) as SavedItem);
    },
    async add(userId: ID, item: SavedItem) {
      const { error } = await client
        .from('saved_items')
        .upsert({ user_id: userId, item_type: item.itemType, item_id: item.itemId, title: item.title ?? null, url: item.url ?? null, description: item.description ?? null, site_name: item.siteName ?? null, related_type: item.relatedType ?? null, related_id: item.relatedId ?? null, related_name: item.relatedName ?? null });
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


  const library: LibraryService = {
    async listAlbums(userId: ID) {
      const { data, error } = await client.from('library_albums').select('*, profiles(username)').eq('owner_id', userId).order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, ownerId: r.owner_id, title: r.title, description: r.description ?? undefined, privacy: r.privacy, createdAt: r.created_at, updatedAt: r.updated_at, ownerUsername: r.profiles?.username }));
    },
    async getAlbum(albumId: ID) {
      const { data, error } = await client.from('library_albums').select('*, profiles(username)').eq('id', albumId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, ownerId: data.owner_id, title: data.title, description: data.description ?? undefined, privacy: data.privacy, createdAt: data.created_at, updatedAt: data.updated_at, ownerUsername: data.profiles?.username };
    },
    async createAlbum(userId: ID, input) {
      const { data, error } = await client.from('library_albums').insert({ owner_id: userId, title: input.title, description: input.description ?? null, privacy: input.privacy }).select('*, profiles(username)').single();
      if (error) throw error;
      return { id: data.id, ownerId: data.owner_id, title: data.title, description: data.description ?? undefined, privacy: data.privacy, createdAt: data.created_at, updatedAt: data.updated_at, ownerUsername: data.profiles?.username };
    },
    async updateAlbum(albumId: ID, input) {
      const { data, error } = await client.from('library_albums').update({ title: input.title, description: input.description ?? null, privacy: input.privacy, updated_at: new Date().toISOString() }).eq('id', albumId).select('*, profiles(username)').single();
      if (error) throw error;
      return { id: data.id, ownerId: data.owner_id, title: data.title, description: data.description ?? undefined, privacy: data.privacy, createdAt: data.created_at, updatedAt: data.updated_at, ownerUsername: data.profiles?.username };
    },
    async deleteAlbum(albumId: ID) {
      const { error } = await client.from('library_albums').delete().eq('id', albumId);
      if (error) throw error;
    },
    async listAlbumItems(albumId: ID) {
      const { data, error } = await client.from('library_album_items').select('*').eq('album_id', albumId).order('added_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, albumId: r.album_id, savedItemType: r.saved_item_type, savedItemId: r.saved_item_id, addedAt: r.added_at }));
    },
    async addAlbumItem(albumId: ID, item: SavedItem) {
      const { error } = await client.from('library_album_items').upsert({ album_id: albumId, saved_item_type: item.itemType, saved_item_id: item.itemId });
      if (error) throw error;
    },
    async removeAlbumItem(albumItemId: ID) {
      const { error } = await client.from('library_album_items').delete().eq('id', albumItemId);
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
    async count(target: Follow) {
      const { count, error } = await client.from('follows').select('*', { count: 'exact', head: true }).match({ target_type: target.targetType, target_id: target.targetId });
      if (error) throw error;
      return count ?? 0;
    },
    async follow(userId: ID, target: Follow) {
      if (target.targetType === 'user') {
        const { data: targetProfile, error: profileError } = await client.from('profiles').select('settings').eq('id', target.targetId).maybeSingle();
        if (profileError) throw profileError;
        if (targetProfile?.settings?.accountPrivacy === 'private') {
          const { error } = await client.from('follow_requests').upsert({ requester_id: userId, target_user_id: target.targetId });
          if (error) throw error;
          await notifications.create?.(userId, { recipientId: target.targetId, actorId: userId, kind: 'follow_request', category: 'follows', title: 'requested to follow you', link: '/profile?tab=following', targetType: 'follow_request', targetId: userId });
          return 'requested';
        }
      }
      const { error } = await client
        .from('follows')
        .upsert({ follower_id: userId, target_type: target.targetType, target_id: target.targetId });
      if (error) throw error;
      if (target.targetType === 'user' && userId !== target.targetId) {
        await notifications.create?.(userId, { recipientId: target.targetId, actorId: userId, kind: 'follow', category: 'follows', title: 'followed you', link: `/profile/${userId}`, targetType: 'user', targetId: userId });
      }
      return 'following';
    },
    async unfollow(userId: ID, target: Follow) {
      const { error } = await client
        .from('follows')
        .delete()
        .match({ follower_id: userId, target_type: target.targetType, target_id: target.targetId });
      if (error) throw error;
      if (target.targetType === 'user') {
        const { error: requestError } = await client.from('follow_requests').delete().match({ requester_id: userId, target_user_id: target.targetId });
        if (requestError) throw requestError;
      }
    },
    async listRequests(userId: ID) {
      const { data, error } = await client.from('follow_requests').select('requester_id,target_user_id,created_at,profiles!follow_requests_requester_id_fkey(username,avatar_url)').eq('target_user_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ requesterId: r.requester_id, targetUserId: r.target_user_id, username: r.profiles?.username, avatarUrl: r.profiles?.avatar_url, createdAt: r.created_at }) as FollowRequest);
    },
    async listOutgoingRequests(userId: ID) {
      const { data, error } = await client.from('follow_requests').select('requester_id,target_user_id,created_at,profiles!follow_requests_target_user_id_fkey(username,avatar_url)').eq('requester_id', userId).eq('status', 'pending').order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ requesterId: r.requester_id, targetUserId: r.target_user_id, username: r.profiles?.username, avatarUrl: r.profiles?.avatar_url, createdAt: r.created_at }) as FollowRequest);
    },
    async approveRequest(userId: ID, requesterId: ID) {
      const { error } = await client.rpc('approve_follow_request', { p_target_user_id: userId, p_requester_id: requesterId });
      if (error) throw error;
      await notifications.create?.(userId, { recipientId: requesterId, actorId: userId, kind: 'follow_approved', category: 'follows', title: 'approved your follow request', link: `/profile/${userId}`, targetType: 'user', targetId: userId });
    },
    async rejectRequest(userId: ID, requesterId: ID) {
      const { error } = await client.from('follow_requests').delete().match({ requester_id: requesterId, target_user_id: userId });
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
            actorId: r.actor_id ?? undefined,
            targetType: r.target_type ?? undefined,
            targetId: r.target_id ?? undefined,
            category: r.category ?? undefined,
            metadata: r.metadata ?? undefined,
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
    async getSettings(userId: ID) {
      const { data, error } = await client.from('notification_settings').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      return data ?? {};
    },
    async updateSettings(userId: ID, settings) {
      const { error } = await client.from('notification_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async create(userId: ID, input) {
      if (input.recipientId === userId) return;
      const { error } = await client.rpc('create_notification', {
        p_recipient_id: input.recipientId,
        p_actor_id: input.actorId ?? userId,
        p_kind: input.kind,
        p_category: input.category ?? input.kind,
        p_title: input.title,
        p_body: input.body ?? null,
        p_link: input.link ?? null,
        p_target_type: input.targetType ?? null,
        p_target_id: input.targetId ?? null,
        p_metadata: input.metadata ?? {},
      });
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


  const postLikes: PostLikeService = {
    async isLiked(userId: ID, postId: ID) {
      const { data, error } = await client.from('post_votes').select('post_id').match({ user_id: userId, post_id: postId }).maybeSingle();
      if (error) throw error;
      return !!data;
    },
    async count(postId: ID) {
      const { count, error } = await client.from('post_votes').select('*', { count: 'exact', head: true }).match({ post_id: postId, value: 1 });
      if (error) throw error;
      return count ?? 0;
    },
    async like(userId: ID, postId: ID, postAuthorId?: ID) {
      const { error } = await client.from('post_votes').upsert({ user_id: userId, post_id: postId, value: 1 });
      if (error) throw error;
      if (postAuthorId && postAuthorId !== userId) {
        await notifications.create?.(userId, { recipientId: postAuthorId, actorId: userId, kind: 'post_like', category: 'likes', title: 'liked your post', link: `/post/${postId}`, targetType: 'post', targetId: postId });
      }
    },
    async unlike(userId: ID, postId: ID) {
      const { error } = await client.from('post_votes').delete().match({ user_id: userId, post_id: postId });
      if (error) throw error;
    },
  };

  const reports: ReportService = {
    async create(userId: ID | null, input: ReportInput) {
      const { error } = await client.from('reports').insert({
        reporter_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        target_name: input.targetName ?? null,
        category: input.category,
        details: input.details ?? null,
      });
      if (error) throw error;
    },
  };

  const suggestEdits: SuggestEditService = {
    async create(userId: ID | null, input: SuggestEditInput) {
      const { error } = await client.from('suggest_edits').insert({
        user_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        sources: input.sources ?? null,
        details: input.details,
      });
      if (error) throw error;
    },
  };

  return { auth, profiles, saved, hidden, follows, notifications, reports, suggestEdits, library, postLikes };
}
