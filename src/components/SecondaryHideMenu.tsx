import { useEffect, useRef, useState } from 'react';
import { EyeOff, MoreHorizontal } from 'lucide-react';
import { HideableType, useHiddenItems } from '../hooks/useHiddenItems';
import { HideItemButton } from './HideItemButton';
import { cn } from '../lib/utils';

interface SecondaryHideMenuProps {
  id: string;
  name: string;
  type: HideableType;
  tagType?: string;
  align?: 'left' | 'right';
  buttonClassName?: string;
}

export function SecondaryHideMenu({ id, name, type, tagType, align = 'right', buttonClassName }: SecondaryHideMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isHidden } = useHiddenItems();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={`Open actions for ${name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className={buttonClassName || 'rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-8 z-30 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900',
            align === 'right' ? 'right-0' : 'left-0'
          )}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <HideItemButton
            id={id}
            name={name}
            type={type}
            tagType={tagType}
            onHidden={() => setIsOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
          />
          {isHidden(type, id) && (
            <div className="border-t border-slate-100 px-4 py-2 text-xs text-amber-700 dark:border-zinc-800 dark:text-amber-300">
              Hidden by current user
            </div>
          )}
        </div>
      )}
    </div>
  );
}
