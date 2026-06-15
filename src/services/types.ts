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
  | 'comment'
  | 'reply'
  | 'profile'
  | 'album'
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

export type UserRole = 'User' | 'Admin' | 'Developer';
export type SiteRole = 'user' | 'site_admin' | 'site_owner';
export type AccountStatus = 'active' | 'warned' | 'suspended' | 'banned';

export interface ProfileSettings {
  /** Saved items are always private; retained for older rows/UI copy. */
  savedPrivate?: boolean;
  /** When true, public activity feed is shown on the profile. */
  showActivity?: boolean;
  showAvatar?: boolean;
  showAge?: boolean;
  showWeight?: boolean;
  showHeight?: boolean;
  showSex?: boolean;
  showBodyFat?: boolean;
  accountPrivacy?: 'public' | 'private';
  showFollowers?: boolean;
  showFollowing?: boolean;
  showBodyStats?: boolean;
}

export interface SessionUser {
  id: ID;
  email: string | null;
  username: string;
  role: UserRole;
  avatarUrl?: string;
  researchScope: 'Citizen' | 'Explorer';
  isVerified: boolean;
  isProfileComplete: boolean;
  siteRole: SiteRole;
  accountStatus: AccountStatus;
}

export interface ProfileStats {
  followersCount: number;
  followingCount: number;
  dispatchCount: number;
  signalCount: number;
}

export interface ProfileDTO {
  id: ID;
  username: string;
  displayName?: string;
  bio?: string;
  website?: string;
  avatarUrl?: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  sex?: string | null;
  bodyFatPercentage?: number | null;
  usernameLastChangedAt?: ISODate | null;
  role: UserRole;
  researchScope: 'Citizen' | 'Explorer';
  isVerified: boolean;
  joinDate: ISODate;
  settings: ProfileSettings;
  stats?: ProfileStats;
  email?: string | null;
  siteRole: SiteRole;
  accountStatus: AccountStatus;
}
export type ProfileUpdate = Partial<
  Pick<
    ProfileDTO,
    | 'username'
    | 'displayName'
    | 'bio'
    | 'website'
    | 'researchScope'
    | 'avatarUrl'
    | 'age'
    | 'weight'
    | 'height'
    | 'sex'
    | 'bodyFatPercentage'
    | 'settings'
  >
>;

export type SavedItemType = 'dispatch' | 'signal' | 'source' | 'external_link';
export interface SavedItem {
  itemType: SavedItemType;
  itemId: ID;
  savedAt?: ISODate;
  title?: string;
  url?: string;
  description?: string;
  siteName?: string;
  relatedType?: string;
  relatedId?: string;
  relatedName?: string;
}
export interface LibraryAlbum {
  id: ID;
  ownerId: ID;
  title: string;
  description?: string;
  privacy: 'private' | 'public';
  createdAt: ISODate;
  updatedAt: ISODate;
  ownerUsername?: string;
}
export interface AlbumItem {
  id: ID;
  albumId: ID;
  savedItemType: SavedItemType;
  savedItemId: ID;
  addedAt: ISODate;
}

export type HideableType = 'substance' | 'brand' | 'stack' | 'tag';
export interface HiddenItem {
  itemType: HideableType;
  itemId: ID;
  tagType?: string;
}

export type FollowTarget = 'user' | 'substance' | 'brand' | 'stack' | 'album';
export interface Follow {
  targetType: FollowTarget;
  targetId: ID;
}
export interface FollowRequest {
  requesterId: ID;
  targetUserId: ID;
  username?: string;
  avatarUrl?: string;
  createdAt?: ISODate;
}

export type ReportTargetType = 'post' | 'comment' | 'reply' | 'profile' | 'album' | 'quarter_message';
export type ModerationStatus = 'pending' | 'reviewed' | 'action_taken' | 'rejected';
export type SuggestEditStatus = 'pending' | 'reviewed' | 'approved' | 'rejected';
export type SuggestEditTargetType = 'substance' | 'brand' | 'stack';

export interface ReportInput {
  targetType: ReportTargetType;
  targetId: ID;
  targetName?: string;
  reason: string;
  note?: string;
}

export interface SuggestEditInput {
  targetType: SuggestEditTargetType;
  targetId: ID;
  targetField?: string;
  suggestionText: string;
}

export interface ModerationQueueItem {
  id: ID;
  submissionType: 'report' | 'suggest_edit';
  targetType: ReportTargetType | SuggestEditTargetType;
  targetId: ID;
  targetLabel?: string;
  username?: string;
  reason?: string;
  targetField?: string;
  preview?: string;
  status: ModerationStatus | SuggestEditStatus;
  createdAt: ISODate;
  updatedAt?: ISODate;
  reportedUsername?: string;
}

export interface NotificationDTO {
  id: ID;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  actorId?: ID;
  targetType?: string;
  targetId?: ID;
  category?: string;
  metadata?: Record<string, unknown>;
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
