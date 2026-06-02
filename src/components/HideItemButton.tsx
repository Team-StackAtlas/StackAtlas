import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { HideableType, useHiddenItems } from '../hooks/useHiddenItems';

interface HideItemButtonProps {
  id: string;
  name: string;
  type: HideableType;
  tagType?: string;
  className?: string;
  onHidden?: () => void;
}

export function HideItemButton({ id, name, type, tagType, className, onHidden }: HideItemButtonProps) {
  const { hideItem, isHidden } = useHiddenItems();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const hidden = isHidden(type, id);

  const handleHide = () => {
    hideItem({ id, name, type, tagType });
    setIsConfirming(false);
    setShowConfirmation(true);
    onHidden?.();
    window.setTimeout(() => setShowConfirmation(false), 2600);
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsConfirming(true);
        }}
        className={className || 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'}
      >
        <EyeOff size={13} />
        {hidden ? 'Hidden' : 'Hide'}
      </button>

      {isConfirming && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-100">Hide {name}?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
              You will stop seeing this in normal StackAtlas results and recommendations. You can manage hidden items from Profile.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHide}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="fixed bottom-20 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-lg dark:border-emerald-500/20 dark:bg-zinc-900 dark:text-emerald-300">
          Hidden. You can manage Hidden Items from Profile.
        </div>
      )}
    </>
  );
}
