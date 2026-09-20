import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/AppShell.jsx';
import { Button } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState } from '../components/ui/States.jsx';
import { LeadFilters } from '../components/leads/LeadFilters.jsx';
import { LeadsCardList, LeadsTable, Pagination } from '../components/leads/LeadsTable.jsx';
import { LeadDrawer } from '../components/leads/LeadDrawer.jsx';
import { CreateLeadModal } from '../components/leads/CreateLeadModal.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useRequest } from '../hooks/useRequest.js';
import { api } from '../lib/api.js';

const DEFAULTS = { search: '', status: '', band: '', followUp: '', sort: 'newest', page: 1 };

/**
 * The leads workspace.
 *
 * Filters live in the URL rather than in component state, which buys three
 * things for free: the dashboard's cards can link straight to a filtered view,
 * the back button works the way people expect, and a colleague can be sent a
 * link to exactly what you are looking at.
 */
export const LeadsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { statuses, services, scoreBands } = useMeta();

  const filters = useMemo(
    () => ({
      search: searchParams.get('search') ?? DEFAULTS.search,
      status: searchParams.get('status') ?? DEFAULTS.status,
      band: searchParams.get('band') ?? DEFAULTS.band,
      followUp: searchParams.get('followUp') ?? DEFAULTS.followUp,
      sort: searchParams.get('sort') ?? DEFAULTS.sort,
      page: Number(searchParams.get('page') ?? DEFAULTS.page),
    }),
    [searchParams],
  );

  const openLeadId = searchParams.get('lead');
  const creating = searchParams.get('new') === '1';

  const setParams = useCallback(
    (updater) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          Object.entries(updater).forEach(([key, value]) => {
            if (value === null || value === '' || value === undefined) next.delete(key);
            else next.set(key, String(value));
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const applyFilters = (next) =>
    setParams({
      search: next.search,
      status: next.status,
      band: next.band,
      followUp: next.followUp,
      sort: next.sort === 'newest' ? '' : next.sort,
      page: next.page > 1 ? next.page : '',
    });

  const clearFilters = () => applyFilters({ ...DEFAULTS });

  // Only the typed text is debounced. Choosing a value from a dropdown is a
  // deliberate act, and waiting 300ms to honour it just feels broken.
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const { data, error, loading, refreshing, reload } = useRequest(
    (options) =>
      api.listLeads(
        {
          search: debouncedSearch,
          status: filters.status,
          band: filters.band,
          followUp: filters.followUp,
          sort: filters.sort,
          page: filters.page,
        },
        options,
      ),
    [debouncedSearch, filters.status, filters.band, filters.followUp, filters.sort, filters.page],
  );

  const leads = data?.items ?? [];
  const pagination = data?.pagination;
  const hasFilters = Boolean(
    filters.search || filters.status || filters.band || filters.followUp,
  );

  const openLead = (id) => setParams({ lead: id });
  const closeLead = () => setParams({ lead: '' });

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry from your website and everything added by hand, scored and ready to work."
      />

      <div className="mb-4">
        <LeadFilters
          filters={filters}
          onChange={applyFilters}
          onCreate={() => setParams({ new: '1' })}
          statuses={statuses}
          scoreBands={scoreBands}
          resultCount={pagination?.total ?? 0}
          loading={loading}
        />
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <ErrorState error={error} onRetry={reload} title="We couldn't load the leads" />
        ) : !loading && leads.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon="search"
              title="No leads found"
              description="There are no leads matching your current filters. Try widening the search."
              action={
                <Button variant="secondary" icon="refresh" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No leads yet"
              description="Leads will appear here as soon as someone submits the website form. You can also add one by hand."
              action={
                <Button variant="primary" icon="plus" onClick={() => setParams({ new: '1' })}>
                  Create lead
                </Button>
              }
            />
          )
        ) : (
          <>
            {/* Dimmed rather than replaced while refiltering: keeping the rows
                on screen makes it obvious what changed. */}
            <div className={refreshing ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
              <LeadsTable
                leads={leads}
                loading={loading}
                statuses={statuses}
                services={services}
                onOpen={openLead}
              />
              <LeadsCardList
                leads={leads}
                loading={loading}
                statuses={statuses}
                services={services}
                onOpen={openLead}
              />
            </div>

            <Pagination pagination={pagination} onPage={(page) => setParams({ page })} />
          </>
        )}
      </div>

      <LeadDrawer
        leadId={openLeadId}
        open={Boolean(openLeadId)}
        onClose={closeLead}
        onChanged={reload}
        onDeleted={reload}
      />

      <CreateLeadModal
        open={creating}
        onClose={() => setParams({ new: '' })}
        onCreated={reload}
        onOpenExisting={openLead}
      />
    </>
  );
};
