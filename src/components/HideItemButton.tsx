import { useState } from 'react';
import { EyeOff } from 'lucide-react';
import { HideableType, useHiddenItems } from '../hooks/useHiddenItems';
import { Modal } from './ui/Modal';
import { useToast } from './ui/ToastProvider';

interface HideItemButtonProps {
  id: string;
  name: string;
  type: HideableType;
  tagType?: string;
  className?: string;
  onHidden?: () => void;
}

export function HideItemButton({
  id,
  name,
  type,
  tagType,
  className,
  onHidden,
}: HideItemButtonProps) {
  const { hideItem, isHidden } = useHiddenItems();
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();

  const hidden = isHidden(type, id);

  const handleHide = () => {
    hideItem({ id, name, type, tagType });
    setIsConfirming(false);
    onHidden?.();
    toast('Hidden. You can manage Hidden Items from Profile.');
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
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
        }
      >
        <EyeOff size={13} />
        {hidden ? 'Hidden' : 'Hide'}
      </button>

      <Modal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        title={`Hide ${name}?`}
        panelClassName="max-w-sm"
        overlayClassName="z-[70]"
      >
        <div className="p-5 pt-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-zinc-400">
            You will stop seeing this in normal StackAtlas results and feeds. You can
            manage hidden items from Profile.
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
      </Modal>
    </>
  );
}
