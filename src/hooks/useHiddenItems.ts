import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';

export const HIDDEN_ITEMS_STORAGE_KEY = 'stackatlas.hiddenItems';

export type HideableType = 'substance' | 'stack' | 'brand' | 'tag';
export type HiddenGroup = 'substances' | 'stacks' | 'brands' | 'tags';

export interface HiddenItem {
  id: string;
  name: string;
  type: HideableType;
  tagType?: string;
  hiddenAt: string;
}

export type HiddenItems = Record<HiddenGroup, HiddenItem[]>;

const EMPTY_HIDDEN_ITEMS: HiddenItems = {
  substances: [],
  stacks: [],
  brands: [],
  tags: [],
};

function groupForType(type: HideableType): HiddenGroup {
  if (type === 'substance') return 'substances';
  if (type === 'stack') return 'stacks';
  if (type === 'brand') return 'brands';
  return 'tags';
}

function readHiddenItems(): HiddenItems {
  if (typeof window === 'undefined') return EMPTY_HIDDEN_ITEMS;

  try {
    const stored = window.localStorage.getItem(HIDDEN_ITEMS_STORAGE_KEY);
    if (!stored) return EMPTY_HIDDEN_ITEMS;
    const parsed = JSON.parse(stored);

    return {
      substances: Array.isArray(parsed?.substances) ? parsed.substances : [],
      stacks: Array.isArray(parsed?.stacks) ? parsed.stacks : [],
      brands: Array.isArray(parsed?.brands) ? parsed.brands : [],
      tags: Array.isArray(parsed?.tags) ? parsed.tags : [],
    };
  } catch {
    return EMPTY_HIDDEN_ITEMS;
  }
}

function writeHiddenItems(hiddenItems: HiddenItems) {
  window.localStorage.setItem(HIDDEN_ITEMS_STORAGE_KEY, JSON.stringify(hiddenItems));
  window.dispatchEvent(new Event('stackatlas:hiddenItemsChanged'));
}

// Many components (every HideItemButton, post filters) mount this hook, so
// share one in-flight/recent list request across instances instead of firing
// one identical hidden_items GET per mount. Invalidated on writes.
type HiddenService = NonNullable<ReturnType<typeof useAuth>['services']>['hidden'];
let sharedHidden: { userId: string; promise: Promise<HiddenItems>; at: number } | null = null;
const SHARED_HIDDEN_TTL_MS = 15_000;

function fetchHiddenShared(hidden: HiddenService, userId: string): Promise<HiddenItems> {
  if (sharedHidden && sharedHidden.userId === userId && Date.now() - sharedHidden.at < SHARED_HIDDEN_TTL_MS) {
    return sharedHidden.promise;
  }
  const promise = hidden.list(userId).then((items) => {
    const next: HiddenItems = { substances: [], stacks: [], brands: [], tags: [] };
    items.forEach((item) => {
      const type = item.itemType as HideableType;
      next[groupForType(type)].push({
        id: item.itemId,
        name: item.itemId,
        type,
        tagType: item.tagType,
        hiddenAt: new Date().toISOString(),
      });
    });
    return next;
  });
  sharedHidden = { userId, promise, at: Date.now() };
  promise.catch(() => { if (sharedHidden?.promise === promise) sharedHidden = null; });
  return promise;
}

function invalidateHiddenShared() {
  sharedHidden = null;
}

export function useHiddenItems() {
  const { isBackendConfigured, services, user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const backed = !!(isBackendConfigured && services && user);
  const [hiddenItems, setHiddenItems] = useState<HiddenItems>(() => readHiddenItems());

  useEffect(() => {
    if (backed && services && user) {
      let cancelled = false;
      fetchHiddenShared(services.hidden, user.id)
        .then((next) => {
          if (!cancelled) setHiddenItems(next);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }
    const syncHiddenItems = () => setHiddenItems(readHiddenItems());
    window.addEventListener('storage', syncHiddenItems);
    window.addEventListener('stackatlas:hiddenItemsChanged', syncHiddenItems);
    return () => {
      window.removeEventListener('storage', syncHiddenItems);
      window.removeEventListener('stackatlas:hiddenItemsChanged', syncHiddenItems);
    };
  }, [backed, services, user]);

  const hideItem = useCallback((item: Omit<HiddenItem, 'hiddenAt'>) => {
    if (!requireAccount()) return;
    setHiddenItems((current) => {
      const group = groupForType(item.type);
      const hiddenItem: HiddenItem = { ...item, hiddenAt: new Date().toISOString() };
      const next = {
        ...current,
        [group]: [hiddenItem, ...current[group].filter((existing) => existing.id !== item.id)],
      };
      if (!backed) writeHiddenItems(next);
      return next;
    });
    if (backed && services && user) {
      invalidateHiddenShared();
      services.hidden.add(user.id, { itemId: item.id, itemType: item.type, tagType: item.tagType }).catch(() => {
        setHiddenItems((current) => {
          const group = groupForType(item.type);
          return { ...current, [group]: current[group].filter((existing) => existing.id !== item.id) };
        });
      });
    }
  }, [backed, requireAccount, services, user]);

  const unhideItem = useCallback((type: HideableType, id: string) => {
    if (!requireAccount()) return;
    setHiddenItems((current) => {
      const group = groupForType(type);
      const next = {
        ...current,
        [group]: current[group].filter((item) => item.id !== id),
      };
      if (!backed) writeHiddenItems(next);
      return next;
    });
    if (backed && services && user) {
      invalidateHiddenShared();
      services.hidden.remove(user.id, { itemId: id, itemType: type }).catch(() => {});
    }
  }, [backed, requireAccount, services, user]);

  const isHidden = useCallback((type: HideableType, id?: string) => {
    if (!id) return false;
    return hiddenItems[groupForType(type)].some((item) => item.id === id);
  }, [hiddenItems]);

  const hiddenTagNames = useMemo(() => new Set(hiddenItems.tags.map((item) => item.name.toLowerCase())), [hiddenItems.tags]);

  const hasHiddenTag = useCallback((tags: string[]) => {
    return tags.some((tag) => hiddenTagNames.has(tag.toLowerCase()));
  }, [hiddenTagNames]);

  return { hiddenItems, hideItem, unhideItem, isHidden, hasHiddenTag };
}
