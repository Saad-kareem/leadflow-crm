import { Button } from './Button.jsx';
import { Icon } from './Icon.jsx';

/**
 * Loading, empty and error — the three states a screen spends most of its life
 * in, and the three that usually get least attention.
 */

/** A grey block standing in for content that is on its way. */
export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-line ${className}`} />
);

/**
 * Skeletons match the shape of what is coming, so the layout does not jump
 * when the data lands. This is the whole reason to prefer them over a spinner.
 */
export const StatCardSkeleton = () => (
  <div className="card p-4">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="mt-3 h-7 w-12" />
  </div>
);

export const TableRowsSkeleton = ({ rows = 6, columns = 7 }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={columnIndex} className="border-b border-line px-4 py-3.5">
            <Skeleton className={`h-3.5 ${columnIndex === 0 ? 'w-40' : 'w-16'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const CardListSkeleton = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="card p-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2 h-3 w-48" />
        <Skeleton className="mt-4 h-1.5 w-full" />
      </div>
    ))}
  </div>
);

/**
 * Empty state.
 *
 * An empty screen has to answer two questions: why is there nothing here, and
 * what do I do about it. "No results" answers neither, so every empty state
 * takes a reason and an action.
 */
export const EmptyState = ({ icon = 'inbox', title, description, action }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-muted ring-1 ring-line">
      <Icon name={icon} className="h-5 w-5" />
    </div>
    <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
    {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

/**
 * Error state.
 *
 * `error.message` is always a sentence the API layer wrote for a person — a
 * status code or a stack trace never reaches this component. The retry button
 * matters as much as the wording: most of these are transient.
 */
export const ErrorState = ({ error, onRetry, title = 'Something went wrong' }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-bg text-danger-fg ring-1 ring-danger-500/20">
      <Icon name="alert" className="h-5 w-5" />
    </div>
    <h3 className="mt-4 text-sm font-semibold text-ink">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
      {error?.message || 'Please try again in a moment.'}
    </p>
    {onRetry ? (
      <div className="mt-5">
        <Button variant="secondary" icon="refresh" onClick={onRetry}>
          Try again
        </Button>
      </div>
    ) : null}
  </div>
);
