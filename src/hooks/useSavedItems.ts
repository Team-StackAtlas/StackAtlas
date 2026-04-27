import { useState, useEffect } from 'react';

export type SavedItemType = 'substance' | 'brand' | 'stack' | 'dispatch';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  name: string; // Title or Name
  savedAt: string;
}

export function useSavedItems() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    const saved = localStorage.getItem('saved_items');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('saved_items', JSON.stringify(savedItems));
  }, [savedItems]);

  const isSaved = (id: string, type: SavedItemType) => {
    return savedItems.some(item => item.id === id && item.type === type);
  };

  const toggleSave = (id: string, type: SavedItemType, name: string) => {
    setSavedItems(prev => {
      const exists = prev.some(item => item.id === id && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.id === id && item.type === type));
      } else {
        return [...prev, { id, type, name, savedAt: new Date().toISOString() }];
      }
    });
  };

  return { savedItems, isSaved, toggleSave };
}
