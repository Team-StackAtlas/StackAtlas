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
}

export interface CommsLoadResult {
  conversations: CommsConversationDTO[];
  messages: CommsMessageDTO[];
  profiles: CommsProfileDTO[];
  lastReadAt: Record<string, string | null>;
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
    .select('id, username, display_name')
    .ilike('username', `%${trimmed}%`)
    .neq('id', excludeUserId)
    .order('username')
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? undefined,
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
  if (ids.length === 0) return { conversations: [], messages: [], profiles: [], lastReadAt };

  const [convResult, participantResult, messageResult] = await Promise.all([
    client.from('conversations').select('id, status, requested_by').in('id', ids),
    client
      .from('conversation_participants')
      .select(
        'conversation_id, user_id, profiles!conversation_participants_user_id_fkey(id, username, display_name)',
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
      });
    }
  });

  const conversations: CommsConversationDTO[] = (convResult.data ?? []).map((row: any) => ({
    id: row.id,
    status: row.status,
    requestedBy: row.requested_by,
    otherUserId: otherByConversation.get(row.id) ?? '',
  }));

  const messages: CommsMessageDTO[] = (messageResult.data ?? []).map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));

  return { conversations, messages, profiles: Array.from(profilesById.values()), lastReadAt };
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
    return { quarters: [], members: [], messages: [], profiles: [], lastReadAt, invites };
  }

  const [quartersResult, membersResult, messagesResult] = await Promise.all([
    client.from('quarters').select('id, owner_id, title, description').in('id', ids),
    client
      .from('quarter_members')
      .select('quarter_id, user_id, role, profiles!quarter_members_user_id_fkey(id, username, display_name)')
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

  const messages: CommsQuarterMessageDTO[] = (messagesResult.data ?? []).map((row: any) => ({
    id: row.id,
    quarterId: row.quarter_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    deleted: row.deleted_at != null,
  }));

  return { quarters, members, messages, profiles: Array.from(profilesById.values()), lastReadAt, invites };
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
