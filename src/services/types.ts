// Shared types for the backend service layer.
//
// Reads reuse the existing catalog shapes from `src/data/mockData` for now so the
// UI can migrate behind the service interfaces without changing shape. Backend-only
// entities (sources, reports, notifications, …) are defined here.

import type {
  Supplement,
  Brand,
  Stack,
  Post,
  Classification,
} from '../data/mockData';

export type ID = string;
export type ISODate = string;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Catalog read DTOs (current shapes).
export type SubstanceDTO = Supplement;
export type BrandDTO = Brand;
export type StackDTO = Stack;
export type PostDTO = Post;

export type ObjectType =
  | 'substance'
  | 'brand'
  | 'stack'
  | 'post'
  | 'ingredient'
  | 'brand_product';

export type SourceType = 'study' | 'article' | 'official' | 'label' | 'database' | 'other';
export type SourceSection =
  | 'summary'
  | 'dosage'
  | 'side_effects'
  | 'brand_claim'
  | 'ingredient'
  | 'testing'
  | 'stack_description';

export interface SourceInput {
  targetType: ObjectType;
  targetId: ID;
  section?: SourceSection;
  claim?: string;
  title: string;
  url: string;
  sourceType: SourceType;
  publisher?: string;
  accessedAt?: ISODate;
}
export interface SourceDTO extends SourceInput {
  id: ID;
  createdAt: ISODate;
}

export interface SessionUser {
  id: ID;
  email: string | null;
  username: string;
  researchScope: 'Citizen' | 'Explorer';
  isVerified: boolean;
}

export interface ProfileDTO {
  id: ID;
  username: string;
  displayName?: string;
  bio?: string;
  website?: string;
  researchScope: 'Citizen' | 'Explorer';
  isVerified: boolean;
}
export type ProfileUpdate = Partial<Pick<ProfileDTO, 'displayName' | 'bio' | 'website' | 'researchScope'>>;

export type SavedItemType = 'substance' | 'brand' | 'stack' | 'dispatch' | 'signal';
export interface SavedItem {
  itemType: SavedItemType;
  itemId: ID;
}

export type HideableType = 'substance' | 'brand' | 'stack' | 'tag';
export interface HiddenItem {
  itemType: HideableType;
  itemId: ID;
  tagType?: string;
}

export type FollowTarget = 'user' | 'substance' | 'brand' | 'stack';
export interface Follow {
  targetType: FollowTarget;
  targetId: ID;
}

export interface ReportInput {
  targetType: ObjectType;
  targetId: ID;
  targetName?: string;
  category: string;
  details?: string;
}

export interface SuggestEditInput {
  targetType: ObjectType;
  targetId: ID;
  sources?: string;
  details: string;
}

export interface NotificationDTO {
  id: ID;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: ISODate | null;
  createdAt: ISODate;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export interface ModerationRecord {
  id: ID;
  targetType: ObjectType;
  targetId: ID;
  reason: string;
  status: ReviewStatus;
  createdAt: ISODate;
  resolvedAt?: ISODate | null;
}

export interface BrandRatingInput {
  brandId: ID;
  stars: 1 | 2 | 3 | 4 | 5;
}

export interface SearchHit {
  id: ID;
  type: 'substance' | 'brand' | 'stack';
  name: string;
  description: string;
  classification?: Classification;
}

// Operator/status snapshot.
export interface OperatorStatus {
  counts: Record<string, number>;
  lastImportAt: ISODate | null;
  lastImportStatus: 'ok' | 'failed' | 'never';
  validationErrorCount: number;
  moderationQueueCount: number;
}
