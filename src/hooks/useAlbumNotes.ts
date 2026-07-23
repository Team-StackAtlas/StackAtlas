import { useCallback, useState } from 'react';

const KEY = 'stackatlas_album_item_notes';

function read(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Per-album-item notes — the owner's short annotation on a saved post/source
 * inside an album ("Good info on dosing on page 2"). Stored client-side keyed
 * by album-item id, so it works in both mock and backed modes without a schema
 * change; syncing notes to the backend for logged-in users is a follow-up.
 */
export function useAlbumNotes() {
  const [notes, setNotes] = useState<Record<string, string>>(read);

  const setNote = useCallback((albumItemId: string, text: string) => {
    setNotes((current) => {
      const next = { ...current };
      const trimmed = text.trim();
      if (trimmed) next[albumItemId] = trimmed;
      else delete next[albumItemId];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { notes, setNote };
}
