import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AppShell.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { ErrorState, Skeleton } from '../components/ui/States.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { api } from '../lib/api.js';

const BAR_COLOURS = {
  new: 'bg-new-dot',
  contacted: 'bg-contacted-dot',
  qualified: 'bg-qualified-dot',
  won: 'bg-won-dot',
  lost: 'bg-lost-dot',
  hot: 'bg-band-hot',
  warm: 'bg-band-warm',
  cool: 'bg-band-cool',
  cold: 'bg-band-cold',
  wordpress: 'bg-brand-500',
  manual: 'bg-band-cold',
};

/**
 * A proportional bar chart, drawn with divs.
 *
 * Six rows of a single dimension does not need a charting library — it needs a
 * width, a label and a number. Pulling in a chart package for this would cost
 * more than the whole page weighs.
 */
const Breakdown = ({ title, description, rows, total, linkPrefix }) => (
  <section className="card p-5">
    <h2 className="text-sm font-semibold text-ink">{title}</h2>
    <p className="mt-0.5 text-xs text-ink-muted">{description}</p>

    <ul className="mt-4 space-y-3.5">
      {rows.map((row) => {
        const share = total ? Math.round((row.value / total) * 100) : 0;

        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink">{row.label}</span>
              <span className="text-xs tabular-nums text-ink-muted">
                <span className="font-medium text-ink-soft">{row.value}</span> · {share}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${BAR_COLOURS[row.key] ?? 'bg-brand-500'}`}
                style={{ width: `${share}%` }}
              />
            </div>
          </>
        );

        return (
          <li key={row.key}>
            {linkPrefix && row.value > 0 ? (
              <Link to={`${linkPrefix}${row.key}`} className="block rounded-md hover:opacity-80">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

const BreakdownSkeleton = () => (
  <div className="card space-y-4 p-5">
    <Skeleton className="h-4 w-32" />
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index}>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-2 h-1.5 w-full" />
      </div>
    ))}
  </div>
);

/**
 * Insights.
 *
 * The dashboard answers "what should I do now". This page answers the slower
 * question — where the pipeline actually comes from and what it is worth —
 * which is the one that changes where the agency spends its marketing budget.
 */
export const InsightsPage = () => {
  const { statuses, sources, scoreBands } = useMeta();
  const { data, error, loading, reload } = useRequest((options) => api.summary(options), []);

  if (error) {
    return (
      <>
        <PageHeader title="Insights" description="Where your pipeline comes from, and what it is worth." />
        <div className="card">
          <ErrorState error={error} onRetry={reload} title="We couldn't load your insights" />
        </div>
      </>
    );
  }

  const rowsFrom = (options, counts) =>
    options.map((option) => ({
      key: option.value,
      label: option.label,
      value: counts?.[option.value] ?? 0,
    }));

  return (
    <>
      <PageHeader
        title="Insights"
        description="Where your pipeline comes from, and what it is worth."
      />

      {loading ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <BreakdownSkeleton />
          <BreakdownSkeleton />
          <BreakdownSkeleton />
        </div>
      ) : data.total === 0 ? (
        <div className="card px-6 py-14 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-ink-muted ring-1 ring-line">
            <Icon name="insights" className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">Nothing to analyse yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
            Once leads start arriving, this page shows how they break down by stage, quality and
            source.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            <Breakdown
              title="By stage"
              description="Where everything sits in the pipeline."
              rows={rowsFrom(statuses, data.byStatus)}
              total={data.total}
              linkPrefix="/leads?status="
            />

            <Breakdown
              title="By quality"
              description="How the scoring rules rate what is coming in."
              rows={rowsFrom(scoreBands, data.byBand)}
              total={data.total}
              linkPrefix="/leads?band="
            />

            <Breakdown
              title="By source"
              description="Website enquiries against leads added by the team."
              rows={rowsFrom(sources, data.bySource)}
              total={data.total}
            />
          </div>

          <section className="card mt-3 p-5">
            <h2 className="text-sm font-semibold text-ink">Reading these numbers</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-ink-muted">Average score</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{data.averageScore}</dd>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  A drop here usually means the form is attracting the wrong traffic rather than
                  that the team is doing anything differently.
                </p>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Win rate</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{data.winRate}%</dd>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Counted over leads that reached Won or Lost. Leads still in play are excluded, so
                  the number does not sink every time a new enquiry arrives.
                </p>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Hot leads</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">{data.byBand.hot}</dd>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  Scoring 75 or above. These are the ones worth a phone call rather than an email.
                </p>
              </div>
            </dl>
          </section>
        </>
      )}
    </>
  );
};
