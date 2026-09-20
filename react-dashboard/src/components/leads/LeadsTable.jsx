import { FollowUp } from './FollowUp.jsx';
import { Icon } from '../ui/Icon.jsx';
import { ScoreMeter } from '../ui/ScoreMeter.jsx';
import { SourceBadge, StatusBadge } from '../ui/StatusBadge.jsx';
import { TableRowsSkeleton } from '../ui/States.jsx';
import { formatDate, formatRelative, initials, labelFor } from '../../lib/format.js';

const Identity = ({ lead }) => (
  <div className="flex items-center gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
      {initials(lead.name)}
    </span>
    <span className="min-w-0">
      {/* Name and email only. A CRM table that shows every field is a table
          nobody can scan — the rest is one click away in the drawer. */}
      <span className="block truncate text-sm font-medium text-ink">{lead.name}</span>
      <span className="block truncate text-xs text-ink-muted">{lead.email}</span>
    </span>
  </div>
);

/**
 * The leads table.
 *
 * Desktop only — below `lg` the same data renders as cards, because a
 * seven-column table squeezed onto a phone is a table nobody reads. Horizontal
 * scrolling is kept for the in-between sizes where the columns nearly fit.
 */
export const LeadsTable = ({ leads, loading, statuses, services, onOpen }) => (
  <div className="hidden overflow-x-auto lg:block">
    <table className="data-table">
      <thead>
        <tr>
          <th scope="col">Lead</th>
          <th scope="col">Service</th>
          <th scope="col">Status</th>
          <th scope="col">Lead Score</th>
          <th scope="col">Follow-up</th>
          <th scope="col">Created</th>
          <th scope="col">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {loading ? (
          <TableRowsSkeleton rows={6} columns={7} />
        ) : (
          leads.map((lead) => (
            <tr key={lead.id} className="transition-colors hover:bg-surface-sunken">
              <td className="max-w-[260px]">
                <Identity lead={lead} />
              </td>

              <td>
                <span className="text-sm text-ink">{labelFor(services, lead.service)}</span>
                <span className="mt-1 block">
                  <SourceBadge source={lead.source} />
                </span>
              </td>

              <td>
                <StatusBadge status={lead.status} label={labelFor(statuses, lead.status)} />
              </td>

              <td>
                <ScoreMeter score={lead.score} band={lead.scoreBand} className="w-28" />
              </td>

              <td>
                <FollowUp date={lead.followUpAt} status={lead.status} />
              </td>

              <td>
                <span className="text-sm text-ink">{formatRelative(lead.createdAt)}</span>
                <span className="mt-0.5 block text-xs text-ink-muted">{formatDate(lead.createdAt)}</span>
              </td>

              <td className="text-right">
                <button
                  type="button"
                  onClick={() => onOpen(lead.id)}
                  className="btn-secondary h-8 px-2.5 py-0 text-xs"
                >
                  View
                  <Icon name="chevronRight" className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

/**
 * The same leads as cards, for tablet and phone.
 *
 * The whole card is the tap target, and it keeps the fields that drive a
 * decision — who, what, status, score and whether they are owed a call.
 */
export const LeadsCardList = ({ leads, loading, statuses, services, onOpen }) => (
  <div className="divide-y divide-line lg:hidden">
    {loading
      ? Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="space-y-3 p-4">
            <div className="h-4 w-36 animate-pulse rounded bg-line" />
            <div className="h-3 w-48 animate-pulse rounded bg-line" />
            <div className="h-1.5 w-full animate-pulse rounded bg-line" />
          </div>
        ))
      : leads.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => onOpen(lead.id)}
            className="block w-full px-4 py-4 text-left transition-colors hover:bg-surface-sunken"
          >
            <div className="flex items-start justify-between gap-3">
              <Identity lead={lead} />
              <StatusBadge status={lead.status} label={labelFor(statuses, lead.status)} />
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs text-ink-soft">{labelFor(services, lead.service)}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Added {formatRelative(lead.createdAt)}
                </p>
              </div>
              <ScoreMeter score={lead.score} band={lead.scoreBand} className="w-24 shrink-0" />
            </div>

            {lead.followUpAt ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <FollowUp date={lead.followUpAt} status={lead.status} />
              </div>
            ) : null}
          </button>
        ))}
  </div>
);

export const Pagination = ({ pagination, onPage }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const first = (page - 1) * limit + 1;
  const last = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="text-xs text-ink-muted">
        Showing <span className="font-medium text-ink-soft">{first}–{last}</span> of{' '}
        <span className="font-medium text-ink-soft">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="btn-secondary h-8 px-2.5 py-0 text-xs"
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          Previous
        </button>
        <span className="text-xs tabular-nums text-ink-muted">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="btn-secondary h-8 px-2.5 py-0 text-xs"
        >
          Next
          <Icon name="chevronRight" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
