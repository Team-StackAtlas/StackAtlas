import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Header title. When provided, a header bar with the title and close button is rendered. */
  title?: ReactNode;
  /** Optional icon shown before the title. */
  icon?: ReactNode;
  children: ReactNode;
  /** Extra classes merged onto the panel (e.g. `max-w-2xl max-h-[90vh] flex flex-col`). */
  panelClassName?: string;
  /** Extra classes merged onto the overlay (e.g. a custom `z-` index). */
  overlayClassName?: string;
  /** Render the close (X) button. Defaults to true. */
  showClose?: boolean;
  /** Close when the overlay backdrop is clicked. Defaults to true. */
  closeOnOverlayClick?: boolean;
  /** Accessible label when no visible `title` is provided. */
  ariaLabel?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog primitive: renders into a portal with `role="dialog"`,
 * `aria-modal`, focus trapping, Escape-to-close, scroll lock, and focus
 * restoration. Shared by all of the app's modals so behavior stays consistent.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  panelClassName,
  overlayClassName,
  showClose = true,
  closeOnOverlayClick = true,
  ariaLabel,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape to close + focus trap.
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
        if (focusable.length === 0) {
          e.preventDefault();
          panel.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    // Move focus into the dialog.
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? panel)?.focus();

    // Lock background scroll.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm',
        overlayClassName,
      )}
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl outline-none dark:border-zinc-800 dark:bg-zinc-900',
          panelClassName,
        )}
      >
        {title ? (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-zinc-800">
            <h2
              id={titleId}
              className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-zinc-50"
            >
              {icon}
              {title}
            </h2>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                <X size={20} />
              </button>
            )}
          </div>
        ) : (
          showClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            >
              <X size={20} />
            </button>
          )
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
