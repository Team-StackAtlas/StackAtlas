import { Bookmark } from 'lucide-react';
import { useSaved, SavedItemType, type SavedItem } from '../hooks/useSaved';
import { cn } from '../lib/utils';

interface SaveButtonProps {
  id: string;
  type: SavedItemType;
  className?: string;
  metadata?: Omit<SavedItem, 'id' | 'type' | 'savedAt'>;
}

export function SaveButton({ id, type, className, metadata }: SaveButtonProps) {
  const { isSaved, saveItem, unsaveItem } = useSaved();
  const saved = isSaved(id, type);

  const toggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      unsaveItem(id, type);
    } else {
      saveItem(id, type, metadata);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleSave}
      className={cn(
        "p-2 rounded-full transition-colors flex items-center justify-center",
        saved 
          ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" 
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
        className
      )}
      title={saved ? "Unsave" : "Save"}
      aria-label={saved ? "Unsave" : "Save"}
      aria-pressed={saved}
    >
      <Bookmark size={18} className={saved ? "fill-current" : ""} />
    </button>
  );
}
