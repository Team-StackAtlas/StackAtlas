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
  ModerationService,
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
  ModerationStatus,
  ModerationQueueItem,
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

function mapProfile(row: any, stats?: any, email?: string | null): ProfileDTO {
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
    email: email ?? row.email ?? null,
    siteRole: row.site_role ?? (row.username === 'domonic' || email?.toLowerCase() === 'matadomonic@gmail.com' || row.email?.toLowerCase() === 'matadomonic@gmail.com' ? 'site_owner' : 'user'),
    accountStatus: row.account_status ?? 'active',
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
    siteRole: profile.siteRole,
    accountStatus: profile.accountStatus,
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
  moderation: ModerationService;
  library: LibraryService;
  postLikes: PostLikeService;
} {
  async function getUserEmail(userId: ID) {
    const { data, error } = await client.from('users').select('email').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data?.email ?? null;
  }

  const profiles: ProfileService = {
    async get(userId: ID) {
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [email, { data: stats }] = await Promise.all([
        getUserEmail(userId),
        client.from('profile_stats').select('*').eq('id', userId).maybeSingle(),
      ]);
      return mapProfile(data, stats, email);
    },
    async getByUsername(username: string) {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [email, { data: stats }] = await Promise.all([
        getUserEmail(data.id),
        client.from('profile_stats').select('*').eq('id', data.id).maybeSingle(),
      ]);
      return mapProfile(data, stats, email);
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
      .insert({ id: authUser.id, username: authUser.email === 'matadomonic@gmail.com' ? 'domonic' : fallbackUsername(authUser.id), settings: {}, site_role: authUser.email === 'matadomonic@gmail.com' ? 'site_owner' : 'user' })
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
      return (data ?? []).map((r: any) => ({ id: r.id, albumId: r.album_id, savedItemType: r.saved_item_type, savedItemId: r.saved_item_id, addedAt: r.added_at, note: r.note ?? undefined }));
    },
    async addAlbumItem(albumId: ID, item: SavedItem) {
      const { error } = await client.from('library_album_items').upsert({ album_id: albumId, saved_item_type: item.itemType, saved_item_id: item.itemId });
      if (error) throw error;
    },
    async removeAlbumItem(albumItemId: ID) {
      const { error } = await client.from('library_album_items').delete().eq('id', albumItemId);
      if (error) throw error;
    },
    async setAlbumItemNote(albumItemId: ID, note: string) {
      const { error } = await client.from('library_album_items').update({ note: note.trim() || null }).eq('id', albumItemId);
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
      const { data, error } = await client
        .from('follower_counts')
        .select('followers_count')
        .match({ target_type: target.targetType, target_id: target.targetId })
        .maybeSingle();
      if (error) throw error;
      return Number(data?.followers_count ?? 0);
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
      const { error } = await client.from('reports').upsert({
        reporter_user_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        target_name: input.targetName ?? null,
        reason: input.reason,
        note: input.note ?? null,
        status: 'pending',
      }, { onConflict: 'reporter_user_id,target_type,target_id' });
      if (error) throw error;
    },
    async getOwn(userId: ID, targetType, targetId) {
      const { data, error } = await client.from('reports').select('target_type,target_id,target_name,reason,note').match({ reporter_user_id: userId, target_type: targetType, target_id: targetId }).maybeSingle();
      if (error) throw error;
      return data ? { targetType: data.target_type, targetId: data.target_id, targetName: data.target_name ?? undefined, reason: data.reason, note: data.note ?? undefined } : null;
    },
    async listOwn(userId: ID) {
      const { data, error } = await client.from('reports').select('id,target_type,target_id,target_name,reason,note,status,created_at,updated_at').eq('reporter_user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ id: row.id, submissionType: 'report', targetType: row.target_type, targetId: row.target_id, targetLabel: row.target_name ?? row.target_id, reason: row.reason, preview: row.note ?? '', status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
    },
  };

  const suggestEdits: SuggestEditService = {
    async create(userId: ID | null, input: SuggestEditInput) {
      const { error } = await client.from('suggest_edits').insert({
        submitter_user_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        target_field: input.targetField ?? null,
        suggestion_text: input.suggestionText,
      });
      if (error) throw error;
    },
  };


  const moderation: ModerationService = {
    async queue() { return []; },
    async resolve() { return; },
    async listQueue() {
      const { data: reportRows, error: reportError } = await client
        .from('reports')
        .select('id,target_type,target_id,target_name,reason,note,status,created_at,updated_at,profiles:reporter_user_id(username),reported:reported_user_id(username)')
        .order('created_at', { ascending: false });
      if (reportError) throw reportError;
      const { data: editRows, error: editError } = await client
        .from('suggest_edits')
        .select('id,target_type,target_id,target_field,suggestion_text,status,created_at,updated_at,profiles:submitter_user_id(username)')
        .order('created_at', { ascending: false });
      if (editError) throw editError;

      const reports = (reportRows ?? []).map((row: any): ModerationQueueItem => ({
        id: row.id,
        submissionType: 'report',
        targetType: row.target_type,
        targetId: row.target_id,
        targetLabel: row.target_name ?? row.target_id,
        username: row.profiles?.username,
        reason: row.reason,
        preview: row.note ?? '',
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        reportedUsername: row.reported?.username,
      }));
      const edits = (editRows ?? []).map((row: any): ModerationQueueItem => ({
        id: row.id,
        submissionType: 'suggest_edit',
        targetType: row.target_type,
        targetId: row.target_id,
        targetLabel: row.target_id,
        username: row.profiles?.username,
        targetField: row.target_field ?? undefined,
        preview: row.suggestion_text,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      return [...reports, ...edits].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
    async updateStatus(submissionType: ModerationQueueItem['submissionType'], id: ID, status: ModerationStatus) {
      const table = submissionType === 'report' ? 'reports' : 'suggest_edits';
      const { error } = await client.from(table).update({ status }).eq('id', id);
      if (error) throw error;
      await client.from('moderation_log').insert({ action_type: submissionType === 'report' ? `report ${status}` : `suggest edit ${status}`, target_type: submissionType, target_id: id, related_report_id: submissionType === 'report' ? id : null, related_suggest_edit_id: submissionType === 'suggest_edit' ? id : null });
    },
    async addAdminNote(targetType: string, targetId: ID, note: string) {
      const { error } = await client.from('admin_notes').insert({ target_type: targetType, target_id: targetId, note });
      if (error) throw error;
    },
    async setUserStatus(userId: ID, status: string, note?: string) {
      // Audited server-side; the RPC also protects the site_owner account.
      const { error } = await client.rpc('admin_set_account_status', { p_user_id: userId, p_status: status, p_note: note ?? null });
      if (error) throw error;
    },
    async setSiteRole(userId: ID, role: string) {
      // Owner-only, enforced in the database (RPC check + profiles trigger).
      const { error } = await client.rpc('admin_set_site_role', { p_user_id: userId, p_role: role });
      if (error) throw error;
    },
    async listUsers(query = '') {
      const search = query.trim();
      const { data: matchingUsers, error: matchingUsersError } = search
        ? await client.from('users').select('id,email').ilike('email', `%${search}%`)
        : { data: [], error: null };
      if (matchingUsersError) throw matchingUsersError;
      const matchingUserIds = (matchingUsers ?? []).map((row: any) => row.id);

      const profileQuery = client.from('profiles').select('*').order('username');
      const { data: rows, error } = search
        ? await profileQuery.or(`username.ilike.%${search}%,id.in.(${matchingUserIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)
        : await profileQuery.limit(50);
      if (error) throw error;

      const userIds = Array.from(new Set([...(rows ?? []).map((row: any) => row.id), ...matchingUserIds]));
      const { data: users, error: usersError } = userIds.length
        ? await client.from('users').select('id,email').in('id', userIds)
        : { data: [], error: null };
      if (usersError) throw usersError;
      const emailById = new Map((users ?? []).map((row: any) => [row.id, row.email ?? null]));
      return (rows ?? []).map((row: any) => mapProfile(row, undefined, emailById.get(row.id) ?? null));
    },
    async listLog() {
      const { data, error } = await client.from('moderation_log').select('id,action_type,target_type,target_id,note,created_at,profiles:admin_user_id(username)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ id: row.id, actionType: row.action_type, targetType: row.target_type, targetId: row.target_id, note: row.note ?? undefined, createdAt: row.created_at, adminUsername: row.profiles?.username }));
    },
    async listDeletedPosts() {
      const { data, error } = await client.from('posts').select('id,kind,title,deleted_at,profiles(username)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({ id: row.id, kind: row.kind, title: row.title, authorUsername: row.profiles?.username, deletedAt: row.deleted_at }));
    },
    async moderatePost(postId: ID, action: 'soft_delete' | 'restore') {
      const { error } = await client.rpc('admin_moderate_post', { p_post_id: postId, p_action: action });
      if (error) throw error;
    },
  };

  return { auth, profiles, saved, hidden, follows, notifications, reports, suggestEdits, moderation, library, postLikes };
}
