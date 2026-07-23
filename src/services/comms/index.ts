// Supabase adapter for Comms direct messages and Quarters.
//
// DMs (phase 1): reads/writes go straight to the 0009 comms tables under
// their existing RLS policies + grants (conversations/
// conversation_participants/messages select, messages insert into an
// accepted conversation, profiles select for search). Conversation
// creation, request accept/decline, and marking a conversation read have
// no covering direct-table policy, so those three go through the
// SECURITY DEFINER RPCs in
// supabase/migrations/20260713100000_comms_dm_persistence.sql.
//
// Quarters (phase 2): reads and message sends similarly go straight to the
// 0009/0011 tables under their existing RLS policies + grants (quarters/
// quarter_members/quarter_invites select, quarter_messages select+insert
// for active members, profiles select for username lookups). Quarter
// creation, inviting by username, invite accept/decline, leaving, and
// marking a quarter read have no covering direct-table policy, so those
// five go through the SECURITY DEFINER RPCs in
// supabase/migrations/20260713190000_comms_quarters_persistence.sql.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CommsProfileDTO {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface CommsConversationDTO {
  id: string;
  status: 'accepted' | 'requested' | 'declined';
  requestedBy: string | null;
  otherUserId: string;
}

export interface CommsMessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  attachments: CommsAttachmentDTO[];
}

export interface CommsReactionDTO {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface CommsLoadResult {
  conversations: CommsConversationDTO[];
  messages: CommsMessageDTO[];
  profiles: CommsProfileDTO[];
  lastReadAt: Record<string, string | null>;
  reactions: CommsReactionDTO[];
}

// An uploaded image/file attachment on a persisted DM or Quarter message.
// `url` is an eagerly-created signed URL for images (safe to render
// directly in an <img>); for non-image files it's left null and a signed
// URL is fetched on demand via getCommsAttachmentDownloadUrl when the user
// clicks the download link, since it's not needed just to render the chip.
export interface CommsAttachmentDTO {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  url: string | null;
}

const COMMS_MEDIA_BUCKET = 'comms-media';
const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
];

function extensionFromFile(file: File): string {
  const dot = file.name.lastIndexOf('.');
  if (dot > 0 && dot < file.name.length - 1) return file.name.slice(dot + 1).toLowerCase();
  const byMimeType: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
  };
  return byMimeType[file.type] ?? 'bin';
}

async function toAttachmentDTOs(client: SupabaseClient, rows: any[]): Promise<CommsAttachmentDTO[]> {
  return Promise.all(
    rows.map(async (row: any) => {
      let url: string | null = null;
      if ((row.mime_type as string).startsWith('image/')) {
        const { data, error } = await client.storage
          .from(COMMS_MEDIA_BUCKET)
          .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
        if (!error) url = data.signedUrl;
      }
      return {
        id: row.id,
        fileName: row.file_name,
        mimeType: row.mime_type,
        fileSize: row.file_size,
        storagePath: row.storage_path,
        url,
      };
    }),
  );
}

// Fetches a fresh signed URL for a single attachment's storage path. Used
// for the non-image "download on click" path (see CommsAttachmentDTO).
export async function getCommsAttachmentDownloadUrl(client: SupabaseClient, storagePath: string): Promise<string> {
  const { data, error } = await client.storage
    .from(COMMS_MEDIA_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

// Uploads a File to the private comms-media bucket under the dm/{id}/ or
// quarter/{id}/ prefix the storage.objects policies key off of, then
// inserts the attachment row against the already-created message. Validated
// client-side against the same size/mime allow-list the bucket and the
// message_attachments/quarter_message_attachments check constraints enforce
// server-side, so a rejected upload fails fast with a clear message instead
// of a raw storage/DB error.
export async function uploadCommsImageOrFile(
  client: SupabaseClient,
  params: { scope: { type: 'dm' | 'quarter'; id: string }; messageId: string; file: File },
): Promise<CommsAttachmentDTO> {
  const { scope, messageId, file } = params;
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error('Files must be 10 MB or smaller.');
  }
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)) {
    throw new Error('Allowed attachments are PDF, text, and image files only.');
  }

  const storagePath = `${scope.type}/${scope.id}/${crypto.randomUUID()}.${extensionFromFile(file)}`;
  const { error: uploadError } = await client.storage
    .from(COMMS_MEDIA_BUCKET)
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const table = scope.type === 'dm' ? 'message_attachments' : 'quarter_message_attachments';
  const idColumn = scope.type === 'dm' ? 'message_id' : 'quarter_message_id';
  const { data, error } = await client
    .from(table)
    .insert({
      [idColumn]: messageId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    })
    .select('id, storage_path, file_name, mime_type, file_size')
    .single();
  if (error) throw error;

  const [attachment] = await toAttachmentDTOs(client, [data]);
  return attachment;
}

export async function searchProfiles(
  client: SupabaseClient,
  query: string,
  excludeUserId: string,
): Promise<CommsProfileDTO[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await client
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${trimmed}%`)
    .neq('id', excludeUserId)
    .order('username')
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  }));
}

// Loads every conversation the viewer participates in, plus all messages
// in those conversations and the other participants' profiles. Phase-1
// scale (a handful of DMs) keeps this as a small, fixed number of queries
// rather than a paginated/aggregated RPC.
export async function loadComms(client: SupabaseClient, viewerId: string): Promise<CommsLoadResult> {
  const { data: mine, error: mineError } = await client
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('user_id', viewerId);
  if (mineError) throw mineError;

  const ids = (mine ?? []).map((row: any) => row.conversation_id as string);
  const lastReadAt: Record<string, string | null> = {};
  (mine ?? []).forEach((row: any) => {
    lastReadAt[row.conversation_id] = row.last_read_at;
  });
  if (ids.length === 0) return { conversations: [], messages: [], profiles: [], lastReadAt, reactions: [] };

  const [convResult, participantResult, messageResult] = await Promise.all([
    client.from('conversations').select('id, status, requested_by').in('id', ids),
    client
      .from('conversation_participants')
      .select(
        'conversation_id, user_id, profiles!conversation_participants_user_id_fkey(id, username, display_name, avatar_url)',
      )
      .in('conversation_id', ids),
    client
      .from('messages')
      .select('id, conversation_id, sender_id, body, created_at')
      .in('conversation_id', ids)
      .order('created_at', { ascending: true }),
  ]);
  if (convResult.error) throw convResult.error;
  if (participantResult.error) throw participantResult.error;
  if (messageResult.error) throw messageResult.error;

  const otherByConversation = new Map<string, string>();
  const profilesById = new Map<string, CommsProfileDTO>();
  (participantResult.data ?? []).forEach((row: any) => {
    if (row.user_id !== viewerId) otherByConversation.set(row.conversation_id, row.user_id);
    const profile = row.profiles;
    if (profile) {
      profilesById.set(profile.id, {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name ?? undefined,
        avatarUrl: profile.avatar_url ?? undefined,
      });
    }
  });

  const conversations: CommsConversationDTO[] = (convResult.data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    requestedBy: row.requested_by,
    otherUserId: otherByConversation.get(row.id) ?? '',
  }));

  const messageIds = (messageResult.data ?? []).map((row: any) => row.id as string);
  const attachmentsResult = messageIds.length
    ? await client
        .from('message_attachments')
        .select('id, message_id, storage_path, file_name, mime_type, file_size')
        .in('message_id', messageIds)
    : { data: [] as any[], error: null };
  if (attachmentsResult.error) throw attachmentsResult.error;
  const attachmentDTOs = await toAttachmentDTOs(client, attachmentsResult.data ?? []);
  const attachmentsByMessage = new Map<string, CommsAttachmentDTO[]>();
  (attachmentsResult.data ?? []).forEach((row: any, index: number) => {
    const list = attachmentsByMessage.get(row.message_id) ?? [];
    list.push(attachmentDTOs[index]);
    attachmentsByMessage.set(row.message_id, list);
  });

  const messages: CommsMessageDTO[] = (messageResult.data ?? []).map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    attachments: attachmentsByMessage.get(row.id) ?? [],
  }));

  // Reactions on those messages. Before the dm_reaction migration the RLS
  // select policy only returns the viewer's own rows — the UI still works,
  // it just can't see other people's reactions until the policy lands.
  const reactionsResult = messageIds.length
    ? await client
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', messageIds)
    : { data: [] as any[], error: null };
  if (reactionsResult.error) throw reactionsResult.error;
  const reactions: CommsReactionDTO[] = (reactionsResult.data ?? []).map((row: any) => ({
    messageId: row.message_id,
    userId: row.user_id,
    emoji: row.emoji,
  }));

  return { conversations, messages, profiles: Array.from(profilesById.values()), lastReadAt, reactions };
}

/**
 * Adds or removes the viewer's reaction on a DM message. Removal needs the
 * delete grant from the dm_reaction migration; callers treat failures as
 * non-fatal and re-sync via refresh().
 */
export async function toggleDmReaction(
  client: SupabaseClient,
  messageId: string,
  userId: string,
  emoji: string,
  active: boolean,
): Promise<void> {
  if (active) {
    const { error } = await client
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  } else {
    const { error } = await client
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: userId, emoji });
    if (error) throw error;
  }
}

export async function sendCommsMessage(
  client: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<CommsMessageDTO> {
  const { data, error } = await client
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body, kind: 'text' })
    .select('id, conversation_id, sender_id, body, created_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    body: data.body,
    createdAt: data.created_at,
    attachments: [],
  };
}

export async function createConversationRequest(client: SupabaseClient, targetUserId: string): Promise<string> {
  const { data, error } = await client.rpc('create_dm_request', { p_target_user_id: targetUserId });
  if (error) throw error;
  return data as string;
}

export async function respondToRequest(
  client: SupabaseClient,
  conversationId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await client.rpc('respond_to_conversation_request', {
    p_conversation_id: conversationId,
    p_accept: accept,
  });
  if (error) throw error;
}

export async function markConversationRead(client: SupabaseClient, conversationId: string): Promise<void> {
  const { error } = await client.rpc('mark_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export type CommsQuarterRole = 'quarter_owner' | 'quarter_moderator' | 'quarter_member';

export interface CommsQuarterDTO {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  role: CommsQuarterRole;
}

export interface CommsQuarterMemberDTO {
  quarterId: string;
  userId: string;
  role: CommsQuarterRole;
}

export interface CommsQuarterMessageDTO {
  id: string;
  quarterId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  attachments: CommsAttachmentDTO[];
}

export interface CommsQuarterInviteDTO {
  id: string;
  quarterId: string;
  quarterTitle: string;
  inviterId: string;
  inviterUsername: string;
  createdAt: string;
}

export interface CommsQuartersLoadResult {
  quarters: CommsQuarterDTO[];
  members: CommsQuarterMemberDTO[];
  messages: CommsQuarterMessageDTO[];
  profiles: CommsProfileDTO[];
  lastReadAt: Record<string, string | null>;
  invites: CommsQuarterInviteDTO[];
  reactions: CommsReactionDTO[];
}

// Loads every quarter the viewer belongs to (plus its members, messages,
// and member profiles) and every pending invite addressed to the viewer.
// Phase-2 scale keeps this as a small, fixed number of queries rather than
// a paginated/aggregated RPC, mirroring loadComms above.
export async function loadQuarters(client: SupabaseClient, viewerId: string): Promise<CommsQuartersLoadResult> {
  const [mineResult, invitesResult] = await Promise.all([
    client
      .from('quarter_members')
      .select('quarter_id, role, last_read_at')
      .eq('user_id', viewerId)
      .is('removed_at', null),
    client
      .from('quarter_invites')
      .select('id, quarter_id, inviter_id, created_at, quarters(title), profiles!quarter_invites_inviter_id_fkey(username)')
      .eq('invitee_id', viewerId)
      .eq('status', 'pending'),
  ]);
  if (mineResult.error) throw mineResult.error;
  if (invitesResult.error) throw invitesResult.error;

  const invites: CommsQuarterInviteDTO[] = (invitesResult.data ?? []).map((row: any) => ({
    id: row.id,
    quarterId: row.quarter_id,
    quarterTitle: row.quarters?.title ?? '',
    inviterId: row.inviter_id,
    inviterUsername: row.profiles?.username ?? '',
    createdAt: row.created_at,
  }));

  const ids = (mineResult.data ?? []).map((row: any) => row.quarter_id as string);
  const lastReadAt: Record<string, string | null> = {};
  const roleByQuarter = new Map<string, CommsQuarterRole>();
  (mineResult.data ?? []).forEach((row: any) => {
    lastReadAt[row.quarter_id] = row.last_read_at;
    roleByQuarter.set(row.quarter_id, row.role);
  });
  if (ids.length === 0) {
    return { quarters: [], members: [], messages: [], profiles: [], lastReadAt, invites, reactions: [] };
  }

  const [quartersResult, membersResult, messagesResult] = await Promise.all([
    client.from('quarters').select('id, owner_id, title, description').in('id', ids),
    client
      .from('quarter_members')
      .select('quarter_id, user_id, role, profiles!quarter_members_user_id_fkey(id, username, display_name, avatar_url)')
      .in('quarter_id', ids)
      .is('removed_at', null),
    client
      .from('quarter_messages')
      .select('id, quarter_id, sender_id, body, created_at, deleted_at')
      .in('quarter_id', ids)
      // quarter_messages_member_read does not filter deleted_at, so a
      // soft-deleted message's body would otherwise still cross the wire to
      // every member (the Comms UI only hides it client-side via the
      // `deleted` flag below). Excluding it here keeps admin soft-deletes
      // actually private from members, not just visually hidden.
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
  ]);
  if (quartersResult.error) throw quartersResult.error;
  if (membersResult.error) throw membersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const profilesById = new Map<string, CommsProfileDTO>();
  const members: CommsQuarterMemberDTO[] = (membersResult.data ?? []).map((row: any) => {
    const profile = row.profiles;
    if (profile) {
      profilesById.set(profile.id, {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name ?? undefined,
        avatarUrl: profile.avatar_url ?? undefined,
      });
    }
    return { quarterId: row.quarter_id, userId: row.user_id, role: row.role };
  });

  const quarters: CommsQuarterDTO[] = (quartersResult.data ?? []).map((row: any) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    role: roleByQuarter.get(row.id) ?? 'quarter_member',
  }));

  const quarterMessageIds = (messagesResult.data ?? []).map((row: any) => row.id as string);
  const quarterAttachmentsResult = quarterMessageIds.length
    ? await client
        .from('quarter_message_attachments')
        .select('id, quarter_message_id, storage_path, file_name, mime_type, file_size')
        .in('quarter_message_id', quarterMessageIds)
    : { data: [] as any[], error: null };
  if (quarterAttachmentsResult.error) throw quarterAttachmentsResult.error;
  const quarterAttachmentDTOs = await toAttachmentDTOs(client, quarterAttachmentsResult.data ?? []);
  const attachmentsByQuarterMessage = new Map<string, CommsAttachmentDTO[]>();
  (quarterAttachmentsResult.data ?? []).forEach((row: any, index: number) => {
    const list = attachmentsByQuarterMessage.get(row.quarter_message_id) ?? [];
    list.push(quarterAttachmentDTOs[index]);
    attachmentsByQuarterMessage.set(row.quarter_message_id, list);
  });

  const messages: CommsQuarterMessageDTO[] = (messagesResult.data ?? []).map((row: any) => ({
    id: row.id,
    quarterId: row.quarter_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    deleted: row.deleted_at != null,
    attachments: attachmentsByQuarterMessage.get(row.id) ?? [],
  }));

  // Reactions on those messages. Before the quarter_message_reactions
  // migration the table doesn't exist — degrade to an empty set.
  let reactions: CommsReactionDTO[] = [];
  if (quarterMessageIds.length) {
    const reactionsResult = await client
      .from('quarter_message_reactions')
      .select('quarter_message_id, user_id, emoji')
      .in('quarter_message_id', quarterMessageIds);
    if (!reactionsResult.error) {
      reactions = (reactionsResult.data ?? []).map((row: any) => ({
        messageId: row.quarter_message_id,
        userId: row.user_id,
        emoji: row.emoji,
      }));
    }
  }

  return { quarters, members, messages, profiles: Array.from(profilesById.values()), lastReadAt, invites, reactions };
}

/** Quarter counterpart of toggleDmReaction; same graceful-failure contract. */
export async function toggleQuarterReaction(
  client: SupabaseClient,
  quarterMessageId: string,
  userId: string,
  emoji: string,
  active: boolean,
): Promise<void> {
  if (active) {
    const { error } = await client
      .from('quarter_message_reactions')
      .delete()
      .eq('quarter_message_id', quarterMessageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);
    if (error) throw error;
  } else {
    const { error } = await client
      .from('quarter_message_reactions')
      .insert({ quarter_message_id: quarterMessageId, user_id: userId, emoji });
    if (error) throw error;
  }
}

export async function sendQuarterMessage(
  client: SupabaseClient,
  quarterId: string,
  senderId: string,
  body: string,
): Promise<CommsQuarterMessageDTO> {
  const { data, error } = await client
    .from('quarter_messages')
    .insert({ quarter_id: quarterId, sender_id: senderId, body, kind: 'text' })
    .select('id, quarter_id, sender_id, body, created_at, deleted_at')
    .single();
  if (error) throw error;
  return {
    id: data.id,
    quarterId: data.quarter_id,
    senderId: data.sender_id,
    body: data.body,
    createdAt: data.created_at,
    deleted: data.deleted_at != null,
    attachments: [],
  };
}

export async function createQuarterRemote(
  client: SupabaseClient,
  title: string,
  description: string,
): Promise<string> {
  const { data, error } = await client.rpc('create_quarter', { p_title: title, p_description: description });
  if (error) throw error;
  return data as string;
}

export async function inviteToQuarterRemote(
  client: SupabaseClient,
  quarterId: string,
  username: string,
): Promise<void> {
  const { error } = await client.rpc('invite_to_quarter', { p_quarter_id: quarterId, p_username: username });
  if (error) throw error;
}

export async function respondToQuarterInvite(
  client: SupabaseClient,
  inviteId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await client.rpc('respond_to_quarter_invite', { p_invite_id: inviteId, p_accept: accept });
  if (error) throw error;
}

export async function leaveQuarterRemote(client: SupabaseClient, quarterId: string): Promise<void> {
  const { error } = await client.rpc('leave_quarter', { p_quarter_id: quarterId });
  if (error) throw error;
}

export async function markQuarterReadRemote(client: SupabaseClient, quarterId: string): Promise<void> {
  const { error } = await client.rpc('mark_quarter_read', { p_quarter_id: quarterId });
  if (error) throw error;
}

// Phase 3 in-quarter governance (owner/moderator controls on a persisted
// quarter). Distinct from the site-admin RPCs below: these check the
// caller's own quarter role and write no moderation_log entry. See
// supabase/migrations/20260713210000_quarter_governance.sql.

export async function quarterSetMemberRole(
  client: SupabaseClient,
  quarterId: string,
  userId: string,
  role: 'quarter_moderator' | 'quarter_member',
): Promise<void> {
  const { error } = await client.rpc('quarter_set_member_role', {
    p_quarter_id: quarterId,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw error;
}

export async function quarterRemoveMember(
  client: SupabaseClient,
  quarterId: string,
  userId: string,
): Promise<void> {
  const { error } = await client.rpc('quarter_remove_member', {
    p_quarter_id: quarterId,
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function quarterModerateMessage(
  client: SupabaseClient,
  messageId: string,
  action: 'soft_delete' | 'restore',
): Promise<void> {
  const { error } = await client.rpc('quarter_moderate_message', {
    p_message_id: messageId,
    p_action: action,
  });
  if (error) throw error;
}

// Site-admin moderation (Admin -> Quarters tab). Reads go straight to the
// quarters/quarter_members/quarter_messages tables under the site-admin
// SELECT policies added in
// supabase/migrations/20260713200000_quarters_admin_controls.sql (is_site_
// admin()), which let an admin see every quarter, not just ones they
// belong to. Unlike loadQuarters above, the message read here intentionally
// does NOT filter deleted_at -- admins need to see soft-deleted messages
// (visibly marked) to review/restore them. Moderation writes go through the
// admin_moderate_quarter_message / admin_remove_quarter_member SECURITY
// DEFINER RPCs from that same migration.

export interface AdminQuarterSummaryDTO {
  id: string;
  title: string;
  ownerId: string;
  ownerUsername: string;
  memberCount: number;
  messageCount: number;
  createdAt: string;
}

export async function adminListQuarters(client: SupabaseClient): Promise<AdminQuarterSummaryDTO[]> {
  const [quartersResult, membersResult, messagesResult] = await Promise.all([
    client
      .from('quarters')
      .select('id, owner_id, title, created_at, profiles!quarters_owner_id_fkey(username)')
      .order('created_at', { ascending: false }),
    client.from('quarter_members').select('quarter_id').is('removed_at', null),
    client.from('quarter_messages').select('quarter_id'),
  ]);
  if (quartersResult.error) throw quartersResult.error;
  if (membersResult.error) throw membersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const memberCounts = new Map<string, number>();
  (membersResult.data ?? []).forEach((row: any) => {
    memberCounts.set(row.quarter_id, (memberCounts.get(row.quarter_id) ?? 0) + 1);
  });
  const messageCounts = new Map<string, number>();
  (messagesResult.data ?? []).forEach((row: any) => {
    messageCounts.set(row.quarter_id, (messageCounts.get(row.quarter_id) ?? 0) + 1);
  });

  return (quartersResult.data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    ownerUsername: row.profiles?.username ?? '',
    memberCount: memberCounts.get(row.id) ?? 0,
    messageCount: messageCounts.get(row.id) ?? 0,
    createdAt: row.created_at,
  }));
}

export interface AdminQuarterMemberDTO {
  userId: string;
  username: string;
  role: CommsQuarterRole;
  joinedAt: string;
}

export interface AdminQuarterMessageDTO {
  id: string;
  senderId: string;
  senderUsername: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
}

export interface AdminQuarterDetail {
  members: AdminQuarterMemberDTO[];
  messages: AdminQuarterMessageDTO[];
}

export async function adminLoadQuarterDetail(client: SupabaseClient, quarterId: string): Promise<AdminQuarterDetail> {
  const [membersResult, messagesResult] = await Promise.all([
    client
      .from('quarter_members')
      .select('user_id, role, created_at, profiles!quarter_members_user_id_fkey(username)')
      .eq('quarter_id', quarterId)
      .is('removed_at', null)
      .order('created_at', { ascending: true }),
    client
      .from('quarter_messages')
      .select(
        'id, sender_id, body, created_at, deleted_at, deleted_by, deletion_reason, profiles!quarter_messages_sender_id_fkey(username)',
      )
      .eq('quarter_id', quarterId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (messagesResult.error) throw messagesResult.error;

  const members: AdminQuarterMemberDTO[] = (membersResult.data ?? []).map((row: any) => ({
    userId: row.user_id,
    username: row.profiles?.username ?? '',
    role: row.role,
    joinedAt: row.created_at,
  }));

  const messages: AdminQuarterMessageDTO[] = (messagesResult.data ?? [])
    .map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      senderUsername: row.profiles?.username ?? '',
      body: row.body,
      createdAt: row.created_at,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      deletionReason: row.deletion_reason,
    }))
    // Fetched most-recent-first (for the limit), re-ordered to chronological
    // for display.
    .reverse();

  return { members, messages };
}

export async function adminModerateQuarterMessage(
  client: SupabaseClient,
  messageId: string,
  action: 'soft_delete' | 'restore',
  reason?: string,
): Promise<void> {
  const { error } = await client.rpc('admin_moderate_quarter_message', {
    p_message_id: messageId,
    p_action: action,
    p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function adminRemoveQuarterMember(
  client: SupabaseClient,
  quarterId: string,
  userId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_quarter_member', {
    p_quarter_id: quarterId,
    p_user_id: userId,
  });
  if (error) throw error;
}
