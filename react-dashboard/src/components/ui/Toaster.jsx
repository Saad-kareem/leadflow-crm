import { Icon } from './Icon.jsx';

const TONES = {
  success: {
    wrapper: 'border-won-dot/30 bg-surface',
    icon: 'bg-won-bg text-won-fg',
    name: 'check',
  },
  error: {
    wrapper: 'border-danger-500/30 bg-surface',
    icon: 'bg-danger-bg text-danger-fg',
    name: 'alert',
  },
};

/**
 * Toasts.
 *
 * Bottom-right on desktop, full width at the bottom on a phone — away from
 * the content, never over the primary action. The region is `aria-live`
 * polite, so the confirmation is announced without interrupting whatever the
 * person is typing.
 */
export const Toaster = ({ toasts, onDismiss }) => (
  <div
    className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
    role="region"
    aria-live="polite"
    aria-label="Notifications"
  >
    {toasts.map((toast) => {
      const tone = TONES[toast.tone] ?? TONES.success;

      return (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-3 shadow-raised sm:w-80 ${tone.wrapper}`}
        >
          <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${tone.icon}`}>
            <Icon name={tone.name} className="h-3 w-3" strokeWidth={2.5} />
          </span>

          <p className="flex-1 text-sm text-ink">{toast.message}</p>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="-m-1 rounded p-1 text-ink-muted transition-colors hover:text-ink"
            aria-label="Dismiss notification"
          >
            <Icon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    })}
  </div>
);
