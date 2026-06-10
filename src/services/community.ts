import type { SupabaseClient } from '@supabase/supabase-js';
import { BRANDS, STACKS, SUPPLEMENTS, type MockComment, type Post } from '../data/mockData';
import { getEntityCategories } from '../data/communityTaxonomy';
import type { ProfileDTO } from './types';

export type PostKind = 'Dispatch' | 'Signal';
export type EntityType = 'substance' | 'stack' | 'brand';
export type ContentTargetType = 'dispatch' | 'signal' | 'comment' | 'reply';
export type ReportReason =
  | 'Spam'
  | 'Abuse / Harassment'
  | 'Dangerous Advice'
  | 'False or Misleading Information'
  | 'Off-topic'
  | 'Duplicate'
  | 'Other';

export interface CommunityPostInput {
  id?: string;
  type: PostKind;
  status: 'draft' | 'published';
  title: string;
  content: string;
  entityType?: EntityType | null;
  entityId?: string | null;
  bearings: string[];
  dose?: string;
  frequency?: string;
  duration?: string;
  startDate?: string;
  sideEffects?: string[];
  doseHistory?: { label: string; dose: string; frequency: string }[];
  stackDosing?: { substanceId: string; substanceName: string; dose: string; frequency: string }[];
  brandDetails?: Post['brandDetails'];
  sharedAge?: number | null;
  sharedWeight?: string | null;
  imageUrls?: string[];
}

function entityName(type?: string | null, id?: string | null) {
  if (!type || !id) return undefined;
  if (type === 'substance') return SUPPLEMENTS.find((item) => item.id === id)?.name;
  if (type === 'brand') return BRANDS.find((item) => item.id === id)?.name;
  return STACKS.find((item) => item.id === id)?.name;
}

function profileFromRow(row: any): Post['author'] {
  const profile = row.profiles;
  return {
    id: row.author_id,
    username: profile?.username ?? 'unknown_user',
    displayName: profile?.display_name ?? undefined,
    isVerified: !!profile?.is_verified,
    age: row.shared_age ?? undefined,
    weight: row.shared_weight ?? undefined,
  };
}

export function mapPostRow(row: any): Post {
  const metadata = row.metadata ?? {};
  const entityType = row.entity_type as EntityType | null;
  const entityId = row.entity_id as string | null;
  const dose = metadata.dose ?? '';
  const frequency = metadata.frequency ?? '';
  const duration = metadata.duration ?? metadata.startDate ?? '';
  const brandDetails = metadata.brandDetails ?? undefined;
  const stackDosing = metadata.stackDosing ?? undefined;
  return {
    id: row.id,
    type: row.kind === 'dispatch' ? 'Dispatch' : 'Signal',
    status: row.status,
    title: row.title,
    content: row.body,
    author: profileFromRow(row),
    entityType,
    entityId,
    supplementId: entityType === 'substance' ? entityId ?? undefined : undefined,
    brandId: entityType === 'brand' ? entityId ?? undefined : undefined,
    stackId: entityType === 'stack' ? entityId ?? undefined : undefined,
    domain: 'All',
    category: getEntityCategories(entityType, entityId)[0] ?? 'General',
    helpfulCount: row.like_count ?? 0,
    likeCount: row.like_count ?? 0,
    likedByMe: !!row.liked_by_me,
    comments: row.comment_count ?? 0,
    createdAt: row.published_at ?? row.created_at,
    bearings: row.bearings ?? [],
    images: row.image_urls ?? [],
    sideEffects: metadata.sideEffects ?? [],
    doseHistory: metadata.doseHistory ?? [],
    stackDosing,
    brandDetails,
    sharedAge: row.shared_age ?? null,
    sharedWeight: row.shared_weight ?? null,
    structuredContent: row.kind === 'dispatch'
      ? {
          dosages: stackDosing?.length
            ? stackDosing.map((item: any) => `${item.substanceName}: ${item.dose} ${item.frequency}`.trim()).join('\n')
            : [dose, frequency].filter(Boolean).join(' '),
          frequency,
          effects: metadata.effects ?? '',
          sideEffects: (metadata.sideEffects ?? []).join(', '),
          personalExperience: row.body,
          startDate: metadata.startDate,
        }
      : undefined,
    logDetails: row.kind === 'dispatch'
      ? {
          dosage: stackDosing?.length
            ? stackDosing.slice(0, 2).map((item: any) => `${item.substanceName}: ${item.dose} ${item.frequency}`.trim()).join(' • ')
            : brandDetails?.productsUsed || dose,
          duration,
          brandMentioned: entityType === 'brand' ? entityName(entityType, entityId) : undefined,
          stackIncluded: entityType === 'stack',
        }
      : undefined,
    qualityScore: row.kind === 'dispatch' ? 90 : 50,
    isGold: row.kind === 'dispatch',
  };
}

function payloadFromInput(input: CommunityPostInput, user: ProfileDTO) {
  return {
    kind: input.type.toLowerCase(),
    status: input.status,
    author_id: user.id,
    title: input.title.trim(),
    body: input.content.trim(),
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    bearings: input.bearings,
    image_urls: input.imageUrls ?? [],
    shared_age: input.sharedAge ?? null,
    shared_weight: input.sharedWeight ?? null,
    metadata: {
      dose: input.dose ?? '',
      frequency: input.frequency ?? '',
      duration: input.duration ?? '',
      startDate: input.startDate ?? '',
      sideEffects: input.sideEffects ?? [],
      doseHistory: input.doseHistory ?? [],
      stackDosing: input.stackDosing ?? [],
      brandDetails: input.brandDetails ?? {},
    },
    published_at: input.status === 'published' ? new Date().toISOString() : null,
  };
}

export async function listCommunityPosts(client: SupabaseClient, userId?: string | null) {
  const { data, error } = await client.rpc('community_posts_with_counts', { viewer_id: userId ?? null });
  if (error) throw error;
  return (data ?? []).map(mapPostRow) as Post[];
}

export async function getCommunityPost(client: SupabaseClient, id: string, userId?: string | null) {
  const { data, error } = await client.rpc('community_post_with_counts', { post_id: id, viewer_id: userId ?? null });
  if (error) throw error;
  return data?.[0] ? mapPostRow(data[0]) : null;
}

export async function listDraftPosts(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('community_posts')
    .select('*, profiles:profiles(username, display_name, is_verified)')
    .eq('author_id', userId)
    .eq('status', 'draft')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPostRow) as Post[];
}

export async function saveCommunityPost(client: SupabaseClient, input: CommunityPostInput, user: ProfileDTO) {
  const payload = payloadFromInput(input, user);
  if (input.id) {
    const { data, error } = await client.from('community_posts').update(payload).eq('id', input.id).select('*').single();
    if (error) throw error;
    return data.id as string;
  }
  const { data, error } = await client.from('community_posts').insert(payload).select('*').single();
  if (error) throw error;
  return data.id as string;
}

export async function softDeletePost(client: SupabaseClient, postId: string) {
  const { error } = await client.from('community_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId);
  if (error) throw error;
}

export async function toggleLike(client: SupabaseClient, targetType: ContentTargetType, targetId: string, liked: boolean) {
  if (liked) {
    const { error } = await client.from('community_likes').delete().match({ target_type: targetType, target_id: targetId });
    if (error) throw error;
  } else {
    const { error } = await client.from('community_likes').insert({ target_type: targetType, target_id: targetId });
    if (error) throw error;
  }
}

export async function createReport(client: SupabaseClient, targetType: ContentTargetType, targetId: string, reason: ReportReason, note?: string) {
  const { error } = await client.from('community_reports').insert({ target_type: targetType, target_id: targetId, reason, note: note ?? null });
  if (error) throw error;
}

export async function uploadPostImage(client: SupabaseClient, userId: string, file: File) {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from('post-images').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = client.storage.from('post-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function listComments(client: SupabaseClient, postId: string, userId?: string | null): Promise<MockComment[]> {
  const { data, error } = await client.rpc('community_comments_with_counts', { post_id_arg: postId, viewer_id: userId ?? null });
  if (error) throw error;
  const rows: any[] = data ?? [];
  const comments: MockComment[] = rows.filter((row: any) => !row.parent_id).map((row: any) => ({
    id: row.id,
    author: profileFromRow({ ...row, author_id: row.author_id }),
    content: row.deleted_at ? '[deleted]' : row.body,
    createdAt: row.created_at,
    likeCount: row.like_count ?? 0,
    likedByMe: !!row.liked_by_me,
    deletedAt: row.deleted_at,
    replies: [],
  }));
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  rows.filter((row: any) => row.parent_id).forEach((row: any) => {
    const parent = byId.get(row.parent_id);
    if (!parent) return;
    parent.replies.push({
      id: row.id,
      author: profileFromRow({ ...row, author_id: row.author_id }),
      content: row.deleted_at ? '[deleted]' : row.body,
      createdAt: row.created_at,
      likeCount: row.like_count ?? 0,
      likedByMe: !!row.liked_by_me,
      deletedAt: row.deleted_at,
    });
  });
  return comments.filter((comment) => !comment.deletedAt || comment.replies.length > 0);
}

export async function createComment(client: SupabaseClient, postId: string, body: string, parentId?: string) {
  const { error } = await client.from('community_comments').insert({ post_id: postId, body, parent_id: parentId ?? null });
  if (error) throw error;
}

export async function softDeleteComment(client: SupabaseClient, commentId: string) {
  const { error } = await client.from('community_comments').update({ deleted_at: new Date().toISOString() }).eq('id', commentId);
  if (error) throw error;
}
