import { useState } from 'react';
import { SaveButton } from './SaveButton';
import { useLibrary } from '../hooks/useLibrary';
import { useSaved } from '../hooks/useSaved';
import type { Source } from '../data/mockData';

interface SourceSaveControlsProps {
  source: Source;
  relatedName?: string;
}

export default function SourceSaveControls({ source, relatedName }: SourceSaveControlsProps) {
  const { isSaved } = useSaved();
  const { albums, addToAlbum } = useLibrary();
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const saved = savedOverride ?? isSaved(source.id, 'source');
  const metadata = { title: source.title, url: source.url, siteName: source.publisher, relatedType: source.targetType, relatedId: source.targetId, relatedName };

  return (
    <div className="flex shrink-0 items-center gap-1">
      <SaveButton id={source.id} type="source" className="h-7 w-7 p-1" metadata={metadata} onSaveChange={setSavedOverride} />
      {saved && albums.length > 0 && (
        <select
          defaultValue=""
          onChange={(event) => {
            if (!event.target.value) return;
            addToAlbum(event.target.value, { itemId: source.id, itemType: 'source', ...metadata });
            event.target.value = '';
          }}
          className="max-w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
        >
          <option value="">Album…</option>
          {albums.map((album) => <option key={album.id} value={album.id}>{album.title}</option>)}
        </select>
      )}
    </div>
  );
}
