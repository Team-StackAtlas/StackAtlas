// Supabase adapter for community posts (Dispatches/Signals).
//
// Reads map database rows into the exact mock `Post` shape the UI consumes
// (see src/data/mockData.ts); writes go through the create_post RPC from
// supabase/migrations/20260713001500_posts_persistence.sql, which resolves
// substance slugs and bearing labels server-side.

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Post } from '../../data/mockData';

const POSTS_SELECT =
  'id, kind, title, content, domain, category, subcategory, quality_score, is_gold, ' +
  'structured_content, log_details, dispatch_protocol, created_at, stack_id, ' +
  'substances(slug), brands(slug), ' +
  'profiles(id, username, display_name, is_verified, verification_type), ' +
  'post_bearings(bearings(label)), post_votes(count), post_comments(count)';

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
    dispatchProtocol: row.dispatch_protocol ?? undefined,
    persisted: true,
  };
}

export async function loadSupabasePosts(client: SupabaseClient): Promise<Post[] | null> {
  const { data, error } = await client
    .from('posts')
    .select(POSTS_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
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
  };
  const { data, error } = await client.rpc('create_post', { p_post: payload });
  if (error) throw error;
  return data as string;
}
