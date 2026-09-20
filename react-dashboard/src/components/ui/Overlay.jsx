import { useEffect, useRef } from 'react';
import { Icon } from './Icon.jsx';

/**
 * Shared behaviour for the drawer and the modal.
 *
 * An overlay that traps the mouse but not the keyboard is worse than no
 * overlay at all, so this handles the things that are easy to skip: Escape
 * closes it, the page behind stops scrolling, focus moves in when it opens and
 * returns to where it came from when it closes, and Tab cycles inside it.
 */
/**
 * Which overlays are currently open, innermost last.
 *
 * The confirm dialog opens on top of the lead drawer, and without this both
 * would answer the same Escape keypress — closing the confirmation and the
 * drawer behind it in one keystroke.
 */
const overlayStack = [];

const useOverlayBehaviour = (open, onClose, panelRef) => {
  const previouslyFocused = useRef(null);
  const overlayId = useRef({});

  useEffect(() => {
    if (!open) return undefined;

    const id = overlayId.current;
    overlayStack.push(id);

    previouslyFocused.current = document.activeElement;

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusable = () =>
      Array.from(
        panelRef.current?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    // Focus the first control rather than the panel itself, so a keyboard user
    // lands somewhere useful instead of having to tab through the heading.
    focusable()[0]?.focus();

    const onKeyDown = (event) => {
      // Only the topmost overlay reacts to the keyboard.
      if (overlayStack[overlayStack.length - 1] !== id) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusable();
      if (!elements.length) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      overlayStack.splice(overlayStack.indexOf(id), 1);

      // Only the last overlay to close gives the page its scrollbar back.
      if (!overlayStack.length) document.body.style.overflow = overflow;

      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose, panelRef]);
};

const Backdrop = ({ onClose }) => (
  <div
    className="absolute inset-0 bg-ink/25 backdrop-blur-[1px]"
    onClick={onClose}
    aria-hidden="true"
  />
);

const CloseButton = ({ onClose }) => (
  <button
    type="button"
    onClick={onClose}
    className="-m-1.5 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-black/5 hover:text-ink"
    aria-label="Close"
  >
    <Icon name="close" className="h-4.5 w-4.5" />
  </button>
);

/**
 * Side panel for viewing and editing one record.
 *
 * A drawer rather than a full page for lead details: it keeps the list
 * underneath, so working through twelve new leads is twelve clicks instead of
 * twelve round trips through a back button.
 *
 * On a phone it becomes a near-full-height sheet, because a 480px panel on a
 * 390px screen is just a page with the content cut off.
 */
export const Drawer = ({ open, onClose, title, subtitle, footer, children }) => {
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={title}>
      <Backdrop onClose={onClose} />

      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 top-10 flex flex-col rounded-t-xl bg-surface shadow-overlay
                   sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:w-[min(520px,100vw)] sm:rounded-none sm:border-l sm:border-line"
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 truncate text-sm text-ink-soft">{subtitle}</p> : null}
          </div>
          <CloseButton onClose={onClose} />
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-line bg-surface-sunken px-5 py-3.5">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
};

/** Centred dialog, used for creating a lead and for confirmations. */
export const Modal = ({ open, onClose, title, description, footer, size = 'md', children }) => {
  const panelRef = useRef(null);
  useOverlayBehaviour(open, onClose, panelRef);

  if (!open) return null;

  const width = size === 'sm' ? 'sm:max-w-md' : 'sm:max-w-2xl';

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <Backdrop onClose={onClose} />

      <div
        ref={panelRef}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-xl bg-surface shadow-overlay sm:rounded-xl ${width}`}
      >
        <header className="flex items-start gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-ink-soft">{description}</p> : null}
          </div>
          <CloseButton onClose={onClose} />
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

        {footer ? (
          <footer className="border-t border-line bg-surface-sunken px-5 py-3.5">{footer}</footer>
        ) : null}
      </div>
    </div>
  );
};
