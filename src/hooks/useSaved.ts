import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';
import type { SavedItemType as BackendSavedItemType } from '../services/types';

export type SavedItemType = 'substance' | 'stack' | 'brand' | 'Dispatch' | 'Signal' | 'dispatch' | 'signal';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  savedAt: string;
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
            items.map((item) => ({ id: item.itemId, type: item.itemType, savedAt: new Date().toISOString() })),
          ),
        )
        .catch(() => {});
      return;
    }
    if (!isBackendConfigured) setSavedItems(readLocal());
  }, [backed, isBackendConfigured, services, user]);

  const saveItem = useCallback(
    (id: string, type: SavedItemType) => {
      if (!requireAccount()) return;
      setSavedItems((prev) => {
        if (prev.some((item) => item.id === id && sameType(item.type, type))) return prev;
        const next = [...prev, { id, type, savedAt: new Date().toISOString() }];
        if (!backed) writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.add(user.id, { itemId: id, itemType: toBackendType(type) }).catch(() => {
          setSavedItems((prev) => prev.filter((item) => !(item.id === id && sameType(item.type, type))));
        });
      }
    },
    [backed, requireAccount, services, user],
  );

  const unsaveItem = useCallback(
    (id: string, type: SavedItemType) => {
      if (!requireAccount()) return;
      setSavedItems((prev) => {
        const next = prev.filter((item) => !(item.id === id && sameType(item.type, type)));
        if (!backed) writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.remove(user.id, { itemId: id, itemType: toBackendType(type) }).catch(() => {
          setSavedItems((prev) => [...prev, { id, type, savedAt: new Date().toISOString() }]);
        });
      }
    },
    [backed, requireAccount, services, user],
  );

  const isSaved = useCallback(
    (id: string, type: SavedItemType) => savedItems.some((item) => item.id === id && sameType(item.type, type)),
    [savedItems],
  );

  return { savedItems, saveItem, unsaveItem, isSaved };
}
