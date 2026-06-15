import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';
import type { SavedItemType as BackendSavedItemType } from '../services/types';

export type SavedItemType = 'Dispatch' | 'Signal' | 'dispatch' | 'signal' | 'source' | 'external_link' | 'post';

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
  originalCreatedAt?: string;
  bearings?: string[];
}

const CHANGE_EVENT = 'stackatlas:savedChanged';

const STORAGE_KEY = 'stackatlas_saved';

function toBackendType(type: SavedItemType): BackendSavedItemType {
  return type === 'Dispatch' ? 'dispatch' : type === 'Signal' ? 'signal' : type === 'post' ? 'dispatch' : type;
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
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function mergeSaved(primary: SavedItem[], secondary: SavedItem[]) {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((item) => {
    const key = `${toBackendType(item.type)}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
            mergeSaved(items.map((item) => ({
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
            })), readLocal()),
          ),
        )
        .catch((error) => { console.error('Failed to load saved items', error); setSavedItems(readLocal()); });
      return;
    }
    if (!isBackendConfigured) setSavedItems(readLocal());
  }, [backed, isBackendConfigured, services, user]);

  useEffect(() => {
    const sync = () => setSavedItems((prev) => mergeSaved(readLocal(), prev));
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const saveItem = useCallback(
    (id: string, type: SavedItemType, metadata: Omit<SavedItem, 'id' | 'type' | 'savedAt'> = {}) => {
      if (!requireAccount()) return false;
      const savedAt = new Date().toISOString();
      const nextItem = { id, type, savedAt, ...metadata };
      setSavedItems((prev) => {
        if (prev.some((item) => item.id === id && sameType(item.type, type))) return prev;
        const next = [nextItem, ...prev];
        writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.add(user.id, { itemId: id, itemType: toBackendType(type), ...metadata }).catch((error) => {
          console.error('Failed to save item; keeping the local saved copy.', error);
          setSavedItems((prev) => {
            const next = prev.some((item) => item.id === id && sameType(item.type, type)) ? prev : [nextItem, ...prev];
            writeLocal(next);
            return next;
          });
        });
      }
      return true;
    },
    [backed, requireAccount, services, user],
  );

  const unsaveItem = useCallback(
    (id: string, type: SavedItemType) => {
      if (!requireAccount()) return false;
      setSavedItems((prev) => {
        const next = prev.filter((item) => !(item.id === id && sameType(item.type, type)));
        writeLocal(next);
        return next;
      });
      if (backed && services && user) {
        services.saved.remove(user.id, { itemId: id, itemType: toBackendType(type) }).catch((error) => {
          console.error('Failed to remove saved item from the backend; it was removed locally.', error);
        });
      }
      return true;
    },
    [backed, requireAccount, services, user],
  );

  const isSaved = useCallback(
    (id: string, type: SavedItemType) => savedItems.some((item) => item.id === id && sameType(item.type, type)),
    [savedItems],
  );

  return { savedItems, saveItem, unsaveItem, isSaved };
}
