// Service / API contracts for the StackAtlas backend.
//
// These are interfaces only. Implementations (Supabase for production; an
// optional mock adapter over `src/data` for incremental UI migration) live in
// separate files and are swapped behind these boundaries — the UI never talks to
// a database directly.

import type {
  ID,
  Paginated,
  SubstanceDTO,
  BrandDTO,
  StackDTO,
  PostDTO,
  ProfileDTO,
  ProfileUpdate,
  SessionUser,
  SavedItem,
  LibraryAlbum,
  AlbumItem,
  HiddenItem,
  Follow,
  FollowRequest,
  ReportInput,
  ReportTargetType,
  SuggestEditInput,
  ModerationQueueItem,
  ModerationStatus,
  NotificationDTO,
  ModerationRecord,
  ReviewStatus,
  BrandRatingInput,
  SearchHit,
  SourceInput,
  SourceDTO,
  ObjectType,
  OperatorStatus,
} from './types';
import type { ImportDataset, ImportReport } from './seed/import';

export interface AuthService {
  getCurrentUser(): Promise<SessionUser | null>;
  signUpWithEmail(email: string, password: string, username?: string): Promise<SessionUser | null>;
  signInWithEmail(email: string, password: string): Promise<SessionUser>;
  signOut(): Promise<void>;
}

export interface ProfileService {
  get(userId: ID): Promise<ProfileDTO | null>;
  getByUsername(username: string): Promise<ProfileDTO | null>;
  update(userId: ID, patch: ProfileUpdate): Promise<ProfileDTO>;
}

export interface SearchService {
  search(query: string, opts?: { limit?: number }): Promise<SearchHit[]>;
}

export interface CatalogService {
  listSubstances(opts?: { page?: number; pageSize?: number }): Promise<Paginated<SubstanceDTO>>;
  getSubstance(idOrSlug: string): Promise<SubstanceDTO | null>;
  listBrands(opts?: { page?: number; pageSize?: number }): Promise<Paginated<BrandDTO>>;
  getBrand(idOrSlug: string): Promise<BrandDTO | null>;
  listStacks(opts?: { page?: number; pageSize?: number }): Promise<Paginated<StackDTO>>;
  getStack(id: ID): Promise<StackDTO | null>;
}

export interface PostLikeService {
  isLiked(userId: ID, postId: ID): Promise<boolean>;
  count(postId: ID): Promise<number>;
  like(userId: ID, postId: ID, postAuthorId?: ID): Promise<void>;
  unlike(userId: ID, postId: ID): Promise<void>;
}

export interface PostService {
  list(opts?: { kind?: 'dispatch' | 'signal'; substanceId?: ID; page?: number }): Promise<Paginated<PostDTO>>;
  get(id: ID): Promise<PostDTO | null>;
  create(input: Omit<PostDTO, 'id' | 'createdAt'>): Promise<PostDTO>;
  update(id: ID, patch: Partial<PostDTO>): Promise<PostDTO>;
  remove(id: ID): Promise<void>;
}

export interface SavedService {
  list(userId: ID): Promise<SavedItem[]>;
  add(userId: ID, item: SavedItem): Promise<void>;
  remove(userId: ID, item: SavedItem): Promise<void>;
}

export interface LibraryService {
  listAlbums(userId: ID): Promise<LibraryAlbum[]>;
  getAlbum(albumId: ID): Promise<LibraryAlbum | null>;
  createAlbum(userId: ID, input: { title: string; description?: string; privacy: 'private' | 'public' }): Promise<LibraryAlbum>;
  updateAlbum(albumId: ID, input: { title: string; description?: string; privacy: 'private' | 'public' }): Promise<LibraryAlbum>;
  deleteAlbum(albumId: ID): Promise<void>;
  listAlbumItems(albumId: ID): Promise<AlbumItem[]>;
  addAlbumItem(albumId: ID, item: SavedItem): Promise<void>;
  removeAlbumItem(albumItemId: ID): Promise<void>;
}

export interface HiddenService {
  list(userId: ID): Promise<HiddenItem[]>;
  add(userId: ID, item: HiddenItem): Promise<void>;
  remove(userId: ID, item: HiddenItem): Promise<void>;
}

export interface FollowService {
  list(userId: ID): Promise<Follow[]>;
  follow(userId: ID, target: Follow): Promise<'following' | 'requested'>;
  count(target: Follow): Promise<number>;
  unfollow(userId: ID, target: Follow): Promise<void>;
  listRequests(userId: ID): Promise<FollowRequest[]>;
  listOutgoingRequests(userId: ID): Promise<FollowRequest[]>;
  approveRequest(userId: ID, requesterId: ID): Promise<void>;
  rejectRequest(userId: ID, requesterId: ID): Promise<void>;
}

export interface ReportService {
  create(userId: ID | null, input: ReportInput): Promise<void>;
  getOwn(userId: ID, targetType: ReportTargetType, targetId: ID): Promise<ReportInput | null>;
  listOwn(userId: ID): Promise<ModerationQueueItem[]>;
}

export interface SuggestEditService {
  create(userId: ID | null, input: SuggestEditInput): Promise<void>;
}

export interface NotificationService {
  list(userId: ID): Promise<NotificationDTO[]>;
  markRead(userId: ID, notificationId: ID): Promise<void>;
  markAllRead(userId: ID): Promise<void>;
  create?(userId: ID, input: Omit<NotificationDTO, 'id' | 'createdAt' | 'readAt'> & { recipientId: ID; actorId?: ID; category?: string; metadata?: Record<string, unknown> }): Promise<void>;
  getSettings?(userId: ID): Promise<Record<string, boolean>>;
  updateSettings?(userId: ID, settings: Record<string, boolean>): Promise<void>;
}

export interface BrandRatingService {
  rate(userId: ID, input: BrandRatingInput): Promise<void>;
  averageFor(brandId: ID): Promise<number | null>;
}

export interface SourceService {
  listFor(targetType: ObjectType, targetId: ID): Promise<SourceDTO[]>;
  add(input: SourceInput): Promise<SourceDTO>;
}

export interface ModerationService {
  queue(opts?: { status?: ReviewStatus }): Promise<ModerationRecord[]>;
  resolve(recordId: ID, status: ReviewStatus): Promise<void>;
  listQueue(): Promise<ModerationQueueItem[]>;
  updateStatus(submissionType: ModerationQueueItem['submissionType'], id: ID, status: ModerationStatus): Promise<void>;
  addAdminNote(targetType: string, targetId: ID, note: string): Promise<void>;
  setUserStatus(userId: ID, status: string, note?: string): Promise<void>;
  setSiteRole(userId: ID, role: string): Promise<void>;
  listUsers(query?: string): Promise<ProfileDTO[]>;
  listLog(): Promise<{ id: ID; actionType: string; targetType: string; targetId: ID; note?: string; createdAt: string; adminUsername?: string }[]>;
  listDeletedPosts(): Promise<{ id: ID; kind: string; title: string; authorUsername?: string; deletedAt: string }[]>;
  moderatePost(postId: ID, action: 'soft_delete' | 'restore'): Promise<void>;
}

export interface ImportService {
  /** Validate a dataset without writing (dry run). */
  validate(dataset: ImportDataset): Promise<ImportReport>;
  /** Validate then persist. Rejects if validation fails. */
  apply(dataset: ImportDataset): Promise<ImportReport>;
}

export interface OperatorService {
  status(): Promise<OperatorStatus>;
}

export interface Services {
  auth: AuthService;
  profiles: ProfileService;
  search: SearchService;
  catalog: CatalogService;
  posts: PostService;
  postLikes?: PostLikeService;
  saved: SavedService;
  hidden: HiddenService;
  follows: FollowService;
  reports: ReportService;
  suggestEdits: SuggestEditService;
  notifications: NotificationService;
  brandRatings: BrandRatingService;
  sources: SourceService;
  moderation: ModerationService;
  imports: ImportService;
  operator: OperatorService;
}
