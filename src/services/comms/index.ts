// Supabase adapter for Comms direct messages (phase 1: DMs only; Quarters
// stay mock, see src/hooks/useComms.ts).
//
// Reads/writes go straight to the 0009 comms tables under their existing
// RLS policies + grants (conversations/conversation_participants/messages
// select, messages insert into an accepted conversation, profiles select
// for search). Conversation creation, request accept/decline, and marking
// a conversation read have no covering direct-table policy, so those three
// go through the SECURITY DEFINER RPCs in
// supabase/migrations/20260713100000_comms_dm_persistence.sql.

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
