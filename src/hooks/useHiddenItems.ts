import { useCallback, useEffect, useMemo, useState } from 'react';

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

export function useHiddenItems() {
  const [hiddenItems, setHiddenItems] = useState<HiddenItems>(() => readHiddenItems());

  useEffect(() => {
    const syncHiddenItems = () => setHiddenItems(readHiddenItems());
    window.addEventListener('storage', syncHiddenItems);
    window.addEventListener('stackatlas:hiddenItemsChanged', syncHiddenItems);
    return () => {
      window.removeEventListener('storage', syncHiddenItems);
      window.removeEventListener('stackatlas:hiddenItemsChanged', syncHiddenItems);
    };
  }, []);

  const hideItem = useCallback((item: Omit<HiddenItem, 'hiddenAt'>) => {
    setHiddenItems((current) => {
      const group = groupForType(item.type);
      const hiddenItem: HiddenItem = { ...item, hiddenAt: new Date().toISOString() };
      const next = {
        ...current,
        [group]: [hiddenItem, ...current[group].filter((existing) => existing.id !== item.id)],
      };
      writeHiddenItems(next);
      return next;
    });
  }, []);

  const unhideItem = useCallback((type: HideableType, id: string) => {
    setHiddenItems((current) => {
      const group = groupForType(type);
      const next = {
        ...current,
        [group]: current[group].filter((item) => item.id !== id),
      };
      writeHiddenItems(next);
      return next;
    });
  }, []);

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
