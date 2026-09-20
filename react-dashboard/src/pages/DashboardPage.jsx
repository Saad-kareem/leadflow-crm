import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/AppShell.jsx';
import { StatCard, InsightTile } from '../components/dashboard/StatCard.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Icon } from '../components/ui/Icon.jsx';
import { ScoreMeter } from '../components/ui/ScoreMeter.jsx';
import { SourceBadge, StatusBadge } from '../components/ui/StatusBadge.jsx';
import { EmptyState, ErrorState, Skeleton, StatCardSkeleton } from '../components/ui/States.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { api } from '../lib/api.js';
import { formatRelative, initials, labelFor, pluralize } from '../lib/format.js';

const Panel = ({ title, description, action, children }) => (
  <section className="card flex flex-col">
    <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </header>
    <div className="flex-1">{children}</div>
  </section>
);

const LeadRow = ({ lead, statuses, services, trailing }) => (
  <li>
    <Link
      to={`/leads?lead=${lead.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-700">
        {initials(lead.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{lead.name}</span>
        <span className="block truncate text-xs text-ink-muted">
          {labelFor(services, lead.service)}
        </span>
      </span>

      {trailing ?? <StatusBadge status={lead.status} label={labelFor(statuses, lead.status)} />}
    </Link>
  </li>
);

const PanelSkeleton = ({ rows = 5 }) => (
  <ul className="divide-y divide-line">
    {Array.from({ length: rows }).map((_, index) => (
      <li key={index} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-1.5 h-3 w-20" />
        </div>
        <Skeleton className="h-5 w-16 rounded-md" />
      </li>
    ))}
  </ul>
);

/**
 * The dashboard.
 *
 * It answers three questions in order: how much is in the pipeline, what needs
 * doing today, and what is worth doing first. Everything on it links into the
 * leads list with a filter already applied, so it is a way into the work
 * rather than a wall of numbers to admire.
 */
export const DashboardPage = () => {
  const { statuses, services } = useMeta();
  const { data, error, loading, reload } = useRequest((options) => api.summary(options), []);

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" description="An overview of everything in your pipeline." />
        <div className="card">
          <ErrorState
            error={error}
            onRetry={reload}
            title="We couldn't load your dashboard"
          />
        </div>
      </>
    );
  }

  const statusCards = statuses.map((status) => ({
    label: status.label,
    value: data?.byStatus?.[status.value] ?? 0,
    status: status.value,
    to: `/leads?status=${status.value}`,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of everything in your pipeline."
        actions={
          <Button variant="primary" icon="plus" as={Link} to="/leads?new=1">
            Add lead
          </Button>
        }
      />

      <section aria-label="Pipeline summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => <StatCardSkeleton key={index} />)
          ) : (
            <>
              <StatCard label="Total leads" value={data.total} icon="leads" to="/leads" emphasis />
              {statusCards.map((card) => (
                <StatCard key={card.status} {...card} />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="mt-3 grid gap-3 sm:grid-cols-3" aria-label="Key figures">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <StatCardSkeleton key={index} />)
        ) : (
          <>
            <InsightTile
              label="Follow-ups due"
              value={data.followUpsDue}
              tone={data.followUpsDue > 0 ? 'alert' : 'default'}
              caption={
                data.followUpsDue > 0
                  ? `${pluralize(data.followUpsDue, 'open lead')} scheduled for today or earlier.`
                  : 'Nothing is overdue. Everything scheduled is still ahead of you.'
              }
              action={
                data.followUpsDue > 0 ? (
                  <Link
                    to="/leads?followUp=due"
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Work through them
                    <Icon name="chevronRight" className="h-3.5 w-3.5" />
                  </Link>
                ) : null
              }
            />

            <InsightTile
              label="Average lead score"
              value={data.averageScore}
              caption="Across every lead received. A falling average usually means the enquiry form is attracting the wrong traffic."
            />

            <InsightTile
              label="Win rate"
              value={`${data.winRate}%`}
              caption="Of leads that reached Won or Lost. Leads still in play are not counted."
            />
          </>
        )}
      </section>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel
          title="Latest enquiries"
          description="The five most recent, whatever their score."
          action={
            <Link to="/leads" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          }
        >
          {loading ? (
            <PanelSkeleton />
          ) : data.recent.length ? (
            <ul className="divide-y divide-line">
              {data.recent.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  statuses={statuses}
                  services={services}
                  trailing={
                    <span className="flex items-center gap-2">
                      <SourceBadge source={lead.source} />
                      <span className="hidden text-xs text-ink-muted sm:inline">
                        {formatRelative(lead.createdAt)}
                      </span>
                    </span>
                  }
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No leads yet"
              description="Add the [leadflow_form] shortcode to your website, or create the first lead by hand."
              action={
                <Button variant="primary" icon="plus" as={Link} to="/leads?new=1">
                  Create lead
                </Button>
              }
            />
          )}
        </Panel>

        <Panel
          title="Worth calling first"
          description="Highest scoring leads in the pipeline."
          action={
            <Link to="/leads?sort=score" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          }
        >
          {loading ? (
            <PanelSkeleton />
          ) : data.topByScore.length ? (
            <ul className="divide-y divide-line">
              {data.topByScore.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  statuses={statuses}
                  services={services}
                  trailing={<ScoreMeter score={lead.score} band={lead.scoreBand} className="w-24" />}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="spark"
              title="Nothing scored yet"
              description="Scores appear as soon as the first lead arrives."
            />
          )}
        </Panel>
      </div>
    </>
  );
};
