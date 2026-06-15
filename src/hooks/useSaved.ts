import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';
import type { SavedItemType as BackendSavedItemType } from '../services/types';

export type SavedItemType = 'Dispatch' | 'Signal' | 'dispatch' | 'signal' | 'source' | 'external_link';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  savedAt: string;
  title?: string;
  url?: string;
  description?: string;
  siteName?: string;
  relatedType?: string;
  relatedId?: string;
  relatedName?: string;
}

const STORAGE_KEY = 'stackatlas_saved';

function toBackendType(type: SavedItemType): BackendSavedItemType {
  return type === 'Dispatch' ? 'dispatch' : type === 'Signal' ? 'signal' : type;
}

function sameType(a: SavedItemType, b: SavedItemType) {
  return toBackendType(a) === toBackendType(b);
}

function readLocal(): SavedItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SavedItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSaved() {
  const { isBackendConfigured, services, user } = useAuth();
  const requireAccount = useRequireAccountAction();
  const backed = !!(isBackendConfigured && services && user);
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => readLocal());

  useEffect(() => {
    if (backed && services && user) {
      services.saved
        .list(user.id)
        .then((items) =>
          setSavedItems(
            items.map((item) => ({
              id: item.itemId,
              type: item.itemType,
              savedAt: item.savedAt ?? new Date().toISOString(),
              title: item.title,
              url: item.url,
              description: item.description,
              siteName: item.siteName,
              relatedType: item.relatedType,
              relatedId: item.relatedId,
              relatedName: item.relatedName,
            })),
          ),
        )
        .catch(() => {});
      return;
    }
    if (!isBackendConfigured) setSavedItems(readLocal());
  }, [backed, isBackendConfigured, services, user]);

  const saveItem = useCallback(
    (id: string, type: SavedItemType, metadata: Omit<SavedItem, 'id' | 'type' | 'savedAt'> = {}) => {
      if (!requireAccount()) return false;
      const savedAt = new Date().toISOString();
      const nextItem = { id, type, savedAt, ...metadata };
      setSavedItems((prev) => {
        if (prev.some((item) => item.id === id && sameType(item.type, type))) return prev;
        const next = [nextItem, ...prev];
        if (!backed) writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.add(user.id, { itemId: id, itemType: toBackendType(type), ...metadata }).catch(() => {
          setSavedItems((prev) => prev.filter((item) => !(item.id === id && sameType(item.type, type))));
        });
      }
      return true;
    },
    [backed, requireAccount, services, user],
  );

  const unsaveItem = useCallback(
    (id: string, type: SavedItemType) => {
      if (!requireAccount()) return false;
      const previous = savedItems.find((item) => item.id === id && sameType(item.type, type));
      setSavedItems((prev) => {
        const next = prev.filter((item) => !(item.id === id && sameType(item.type, type)));
        if (!backed) writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.remove(user.id, { itemId: id, itemType: toBackendType(type) }).catch(() => {
          if (previous) setSavedItems((prev) => [previous, ...prev]);
        });
      }
      return true;
    },
    [backed, requireAccount, savedItems, services, user],
  );

  const isSaved = useCallback(
    (id: string, type: SavedItemType) => savedItems.some((item) => item.id === id && sameType(item.type, type)),
    [savedItems],
  );

  return { savedItems, saveItem, unsaveItem, isSaved };
}
