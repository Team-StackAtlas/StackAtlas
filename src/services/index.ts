// Service layer entry point.
//
// `createStubServices()` returns a `Services` object that satisfies every
// contract. Read/write methods throw `NotImplementedError` (no fake
// persistence), except the import validator and operator status, which work
// today so the seed pipeline and operator dry-run are usable now. A
// `SupabaseServices` implementation will replace the stubs behind this same
// interface.

import type { Services } from './contracts';
import type { OperatorStatus } from './types';
import { validateDataset, type ImportDataset, type ImportReport } from './seed/import';

export * from './types';
export * from './contracts';
export { validateDataset } from './seed/import';
export type { ImportDataset, ImportReport } from './seed/import';

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`${method} is not implemented yet (backend foundation only).`);
    this.name = 'NotImplementedError';
  }
}

function ni(method: string): never {
  throw new NotImplementedError(method);
}

export function createStubServices(): Services {
  return {
    auth: {
      async getCurrentUser() {
        return null;
      },
      async signUpWithEmail() {
        return ni('auth.signUpWithEmail');
      },
      async signInWithEmail() {
        return ni('auth.signInWithEmail');
      },
      async signOut() {
        return ni('auth.signOut');
      },
    },
    profiles: {
      async get() {
        return ni('profiles.get');
      },
      async getByUsername() {
        return ni('profiles.getByUsername');
      },
      async update() {
        return ni('profiles.update');
      },
    },
    search: {
      async search() {
        return ni('search.search');
      },
    },
    catalog: {
      async listSubstances() {
        return ni('catalog.listSubstances');
      },
      async getSubstance() {
        return ni('catalog.getSubstance');
      },
      async listBrands() {
        return ni('catalog.listBrands');
      },
      async getBrand() {
        return ni('catalog.getBrand');
      },
      async listStacks() {
        return ni('catalog.listStacks');
      },
      async getStack() {
        return ni('catalog.getStack');
      },
    },
    posts: {
      async list() {
        return ni('posts.list');
      },
      async get() {
        return ni('posts.get');
      },
      async create() {
        return ni('posts.create');
      },
      async update() {
        return ni('posts.update');
      },
      async remove() {
        return ni('posts.remove');
      },
    },
    saved: {
      async list() {
        return ni('saved.list');
      },
      async add() {
        return ni('saved.add');
      },
      async remove() {
        return ni('saved.remove');
      },
    },
    hidden: {
      async list() {
        return ni('hidden.list');
      },
      async add() {
        return ni('hidden.add');
      },
      async remove() {
        return ni('hidden.remove');
      },
    },
    follows: {
      async list() {
        return ni('follows.list');
      },
      async follow() {
        return ni('follows.follow');
      },
      async count() {
        return ni('follows.count');
      },
      async unfollow() {
        return ni('follows.unfollow');
      },
      async listRequests() {
        return ni('follows.listRequests');
      },
      async listOutgoingRequests() {
        return ni('follows.listOutgoingRequests');
      },
      async approveRequest() {
        return ni('follows.approveRequest');
      },
      async rejectRequest() {
        return ni('follows.rejectRequest');
      },
    },
    reports: {
      async create() {
        return ni('reports.create');
      },
    },
    suggestEdits: {
      async create() {
        return ni('suggestEdits.create');
      },
    },
    notifications: {
      async list() {
        return ni('notifications.list');
      },
      async markRead() {
        return ni('notifications.markRead');
      },
      async markAllRead() {
        return ni('notifications.markAllRead');
      },
    },
    brandRatings: {
      async rate() {
        return ni('brandRatings.rate');
      },
      async averageFor() {
        return ni('brandRatings.averageFor');
      },
    },
    sources: {
      async listFor() {
        return ni('sources.listFor');
      },
      async add() {
        return ni('sources.add');
      },
    },
    moderation: {
      async queue() {
        return ni('moderation.queue');
      },
      async resolve() {
        return ni('moderation.resolve');
      },
    },
    imports: {
      // Real: dry-run validation works today.
      async validate(dataset: ImportDataset): Promise<ImportReport> {
        return validateDataset(dataset);
      },
      // No persistence yet.
      async apply() {
        return ni('imports.apply');
      },
    },
    operator: {
      async status(): Promise<OperatorStatus> {
        return {
          counts: {},
          lastImportAt: null,
          lastImportStatus: 'never',
          validationErrorCount: 0,
          moderationQueueCount: 0,
        };
      },
    },
  };
}
