// Supabase adapter for community posts (Dispatches/Signals).
//
// Reads map database rows into the exact mock `Post` shape the UI consumes
// (see src/data/mockData.ts); writes go through the create_post RPC from
// supabase/migrations/20260713001500_posts_persistence.sql, which resolves
// substance slugs and bearing labels server-side.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '../../data/mockData';
import type { CommentNode } from '../../lib/comments';

const POSTS_SELECT_BASE =
  'id, kind, title, content, domain, category, subcategory, quality_score, is_gold, ' +
  'structured_content, log_details, dispatch_protocol, created_at, stack_id, ' +
  'substances(slug), brands(slug), ' +
  'profiles(id, username, display_name, avatar_url, is_verified, verification_type), ' +
  'post_bearings(bearings(label)), post_votes(count), post_comments(count)';

// image_url lands with the post_images migration; until it's applied the
// select retries without the column so reads keep working.
const POSTS_SELECT = `${POSTS_SELECT_BASE}, image_url`;

function countOf(embed: any): number {
  return Array.isArray(embed) && embed.length > 0 ? Number(embed[0]?.count ?? 0) : 0;
}

function mapPostRow(row: any): Post {
  const author = row.profiles ?? {};
  const bearings = (row.post_bearings ?? [])
    .map((pb: any) => pb?.bearings?.label)
    .filter((label: unknown): label is string => typeof label === 'string');

  return {
    id: row.id,
    type: row.kind === 'dispatch' ? 'Dispatch' : 'Signal',
    title: row.title,
    content: row.content,
    isGold: !!row.is_gold,
    structuredContent: row.structured_content ?? undefined,
    author: {
      id: author.id ?? '',
      username: author.username ?? 'unknown',
      displayName: author.display_name ?? undefined,
      avatarUrl: author.avatar_url ?? undefined,
      isVerified: !!author.is_verified,
      verificationType: author.verification_type ?? undefined,
    },
    domain: row.domain ?? 'All',
    category: row.category ?? 'General',
    subcategory: row.subcategory ?? undefined,
    supplementId: row.substances?.slug ?? undefined,
    brandId: row.brands?.slug ?? undefined,
    stackId: row.stack_id ?? undefined,
    helpfulCount: countOf(row.post_votes),
    comments: countOf(row.post_comments),
    createdAt: row.created_at,
    logDetails: row.log_details ?? undefined,
    qualityScore: row.quality_score ?? 0,
    bearings: bearings.length > 0 ? bearings : undefined,
    imageUrl: row.image_url ?? undefined,
    dispatchProtocol: row.dispatch_protocol ?? undefined,
    persisted: true,
  };
}

export async function loadSupabasePosts(client: SupabaseClient): Promise<Post[] | null> {
  const run = (select: string): Promise<{ data: any[] | null; error: { message: string } | null }> =>
    client.from('posts').select(select).order('created_at', { ascending: false }).limit(200) as any;
  let { data, error } = await run(POSTS_SELECT);
  if (error && /image_url/.test(error.message)) {
    ({ data, error } = await run(POSTS_SELECT_BASE));
  }
  if (error) {
    console.warn('Supabase posts unavailable, using local data:', error.message);
    return null;
  }
  return (data ?? []).map(mapPostRow);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Accepts the mock-shaped Post built by Create.tsx and publishes it.
export async function createSupabasePost(client: SupabaseClient, post: Post): Promise<string> {
  const payload = {
    kind: post.type.toLowerCase(),
    title: post.title,
    content: post.content,
    domain: post.domain,
    category: post.category,
    subcategory: post.subcategory ?? null,
    substance_slug: post.supplementId ?? null,
    brand_slug: post.brandId ?? null,
    // Seed stacks have ids like 's1'; only real catalog stacks (uuids) link.
    stack_id: post.stackId && UUID_RE.test(post.stackId) ? post.stackId : null,
    bearings: post.bearings ?? [],
    structured_content: post.structuredContent ?? null,
    log_details: post.logDetails ?? null,
    dispatch_protocol: post.dispatchProtocol ?? null,
    quality_score: String(post.qualityScore ?? 0),
    // Ignored by the pre-post_images create_post RPC; persisted once the
    // migration lands.
    image_url: post.imageUrl ?? null,
  };
  const { data, error } = await client.rpc('create_post', { p_post: payload });
  if (error) throw error;
  return data as string;
}

// ---------------------------------------------------------------------------
// Comments (post_comments + post_comment_votes)
// ---------------------------------------------------------------------------

export async function loadSupabaseComments(
  client: SupabaseClient,
  postId: string,
  viewerId?: string,
): Promise<CommentNode[]> {
  const { data, error } = await client
    .from('post_comments')
    .select('id, parent_id, body, deleted_at, created_at, profiles(username), post_comment_votes(count)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  let viewerVotes = new Set<string>();
  if (viewerId && (data ?? []).length > 0) {
    const { data: votes } = await client
      .from('post_comment_votes')
      .select('comment_id')
      .eq('user_id', viewerId)
      .in('comment_id', (data ?? []).map((row: any) => row.id));
    viewerVotes = new Set((votes ?? []).map((row: any) => row.comment_id));
  }

  const nodes = new Map<string, CommentNode>();
  (data ?? []).forEach((row: any) => {
    nodes.set(row.id, {
      id: row.id,
      author: row.profiles?.username ?? 'member',
      content: row.deleted_at ? 'Comment deleted' : row.body,
      createdAt: row.created_at,
      deleted: !!row.deleted_at,
      likes: countOf(row.post_comment_votes),
      likedBy: viewerVotes.has(row.id) && viewerId ? [viewerId] : [],
      replies: [],
    });
  });

  const roots: CommentNode[] = [];
  (data ?? []).forEach((row: any) => {
    const node = nodes.get(row.id)!;
    const parent = row.parent_id ? nodes.get(row.parent_id) : undefined;
    if (parent) parent.replies!.push(node);
    else roots.push(node);
  });
  return roots;
}

export async function createSupabaseComment(
  client: SupabaseClient,
  input: { postId: string; parentId?: string; body: string },
): Promise<void> {
  const { error } = await client.from('post_comments').insert({
    post_id: input.postId,
    parent_id: input.parentId ?? null,
    body: input.body,
  });
  if (error) throw error;
}

export async function softDeleteSupabaseComment(client: SupabaseClient, commentId: string): Promise<void> {
  const { error } = await client
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) throw error;
}

export async function toggleSupabaseCommentVote(
  client: SupabaseClient,
  commentId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    const { error } = await client
      .from('post_comment_votes')
      .upsert({ comment_id: commentId, user_id: userId }, { onConflict: 'comment_id,user_id' });
    if (error) throw error;
    return;
  }
  const { error } = await client
    .from('post_comment_votes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', userId);
  if (error) throw error;
}
