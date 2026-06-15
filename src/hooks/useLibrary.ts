import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRequireAccountAction } from './useRequireAccountAction';
import type { AlbumItem, LibraryAlbum, SavedItem } from '../services/types';

const ALBUMS_KEY = 'stackatlas_albums';
const ITEMS_KEY = 'stackatlas_album_items';

function read<T>(key: string): T[] {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch { return []; }
}
function write<T>(key: string, value: T[]) { localStorage.setItem(key, JSON.stringify(value)); }

export function useLibrary() {
  const { isBackendConfigured, services, user } = useAuth();
  const localUser = useMemo(() => user ?? (!isBackendConfigured ? { id: 'local-library-user', username: 'local' } : null), [isBackendConfigured, user]);
  const requireAccount = useRequireAccountAction();
  const backed = !!(isBackendConfigured && services && user);
  const [albums, setAlbums] = useState<LibraryAlbum[]>([]);
  const [albumItems, setAlbumItems] = useState<AlbumItem[]>([]);

  const refresh = useCallback(async () => {
    if (backed && services && user) {
      const loadedAlbums = await services.library.listAlbums(user.id);
      setAlbums(loadedAlbums);
      setAlbumItems((await Promise.all(loadedAlbums.map((album) => services.library.listAlbumItems(album.id)))).flat());
    } else if (!isBackendConfigured) {
      setAlbums(read<LibraryAlbum>(ALBUMS_KEY));
      setAlbumItems(read<AlbumItem>(ITEMS_KEY));
    }
  }, [backed, isBackendConfigured, services, user]);

  useEffect(() => { refresh().catch(() => {}); }, [refresh]);

  const createAlbum = useCallback(async (input: { title: string; description?: string; privacy: 'private' | 'public' }) => {
    if (!requireAccount() || !localUser) return null;
    if (backed && services) {
      const album = await services.library.createAlbum(user.id, input);
      await refresh();
      return album;
    }
    const album: LibraryAlbum = { id: crypto.randomUUID(), ownerId: localUser.id, ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ownerUsername: localUser.username };
    const next = [album, ...albums];
    setAlbums(next); write(ALBUMS_KEY, next);
    return album;
  }, [albums, backed, localUser, refresh, requireAccount, services, user]);

  const updateAlbum = useCallback(async (albumId: string, input: { title: string; description?: string; privacy: 'private' | 'public' }) => {
    if (!requireAccount()) return;
    if (backed && services) await services.library.updateAlbum(albumId, input);
    else {
      const next = albums.map((album) => album.id === albumId ? { ...album, ...input, updatedAt: new Date().toISOString() } : album);
      setAlbums(next); write(ALBUMS_KEY, next);
    }
    await refresh();
  }, [albums, backed, refresh, requireAccount, services]);

  const deleteAlbum = useCallback(async (albumId: string) => {
    if (!requireAccount()) return;
    if (backed && services) await services.library.deleteAlbum(albumId);
    else {
      const nextAlbums = albums.filter((album) => album.id !== albumId);
      const nextItems = albumItems.filter((item) => item.albumId !== albumId);
      setAlbums(nextAlbums); setAlbumItems(nextItems); write(ALBUMS_KEY, nextAlbums); write(ITEMS_KEY, nextItems);
    }
    await refresh();
  }, [albumItems, albums, backed, refresh, requireAccount, services]);

  const addToAlbum = useCallback(async (albumId: string, item: SavedItem) => {
    if (!requireAccount()) return;
    if (backed && services) await services.library.addAlbumItem(albumId, item);
    else {
      const exists = albumItems.some((albumItem) => albumItem.albumId === albumId && albumItem.savedItemType === item.itemType && albumItem.savedItemId === item.itemId);
      if (!exists) {
        const next = [{ id: crypto.randomUUID(), albumId, savedItemType: item.itemType, savedItemId: item.itemId, addedAt: new Date().toISOString() }, ...albumItems];
        setAlbumItems(next); write(ITEMS_KEY, next);
      }
    }
    await refresh();
  }, [albumItems, backed, refresh, requireAccount, services]);

  const removeFromAlbum = useCallback(async (albumItemId: string) => {
    if (!requireAccount()) return;
    if (backed && services) await services.library.removeAlbumItem(albumItemId);
    else {
      const next = albumItems.filter((item) => item.id !== albumItemId);
      setAlbumItems(next); write(ITEMS_KEY, next);
    }
    await refresh();
  }, [albumItems, backed, refresh, requireAccount, services]);

  return { albums, albumItems, createAlbum, updateAlbum, deleteAlbum, addToAlbum, removeFromAlbum, refresh };
}
