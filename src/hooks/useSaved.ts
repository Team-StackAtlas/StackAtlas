import { useState, useEffect } from 'react';

export type SavedItemType = 'substance' | 'stack' | 'brand' | 'Dispatch' | 'Signal';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  savedAt: string;
}

export function useSaved() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('stackatlas_saved');
    if (stored) {
      try {
        setSavedItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse saved items', e);
      }
    }
  }, []);

  const saveItem = (id: string, type: SavedItemType) => {
    setSavedItems(prev => {
      if (prev.some(item => item.id === id && item.type === type)) return prev;
      const newItems = [...prev, { id, type, savedAt: new Date().toISOString() }];
      localStorage.setItem('stackatlas_saved', JSON.stringify(newItems));
      return newItems;
    });
  };

  const unsaveItem = (id: string, type: SavedItemType) => {
    setSavedItems(prev => {
      const newItems = prev.filter(item => !(item.id === id && item.type === type));
      localStorage.setItem('stackatlas_saved', JSON.stringify(newItems));
      return newItems;
    });
  };

  const isSaved = (id: string, type: SavedItemType) => {
    return savedItems.some(item => item.id === id && item.type === type);
  };

  return { savedItems, saveItem, unsaveItem, isSaved };
}
