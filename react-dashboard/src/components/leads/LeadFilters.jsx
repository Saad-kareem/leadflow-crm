import { Button } from '../ui/Button.jsx';
import { Icon } from '../ui/Icon.jsx';

const Select = ({ label, value, onChange, options, placeholder }) => (
  <label className="relative">
    <span className="sr-only">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field-control h-9 appearance-none py-0 pr-8 text-sm"
      aria-label={label}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <Icon
      name="chevronRight"
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-ink-muted"
    />
  </label>
);

const FOLLOW_UP_OPTIONS = [
  { value: 'due', label: 'Needs follow-up' },
  { value: 'scheduled', label: 'Follow-up scheduled' },
  { value: 'none', label: 'No follow-up set' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'score', label: 'Highest score' },
  { value: 'followUp', label: 'Follow-up date' },
  { value: 'name', label: 'Name A–Z' },
];

/**
 * Search and filters.
 *
 * One row on desktop — search, the filters, then the primary action on the
 * right — and a stack on a phone, with the search box full width because it is
 * the control people reach for most. Nothing is hidden behind a "Filters"
 * button: there are four of them, and a filter you cannot see is a filter you
 * forget is applied.
 */
export const LeadFilters = ({ filters, onChange, onCreate, statuses, scoreBands, resultCount, loading }) => {
  const set = (key) => (value) => onChange({ ...filters, [key]: value, page: 1 });

  const activeCount = ['status', 'band', 'followUp'].filter((key) => filters[key]).length +
    (filters.search ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative lg:max-w-xs lg:flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(event) => set('search')(event.target.value)}
            placeholder="Search by name, email or phone"
            aria-label="Search leads"
            className="field-control h-9 py-0 pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            label="Filter by status"
            value={filters.status}
            onChange={set('status')}
            options={statuses}
            placeholder="All statuses"
          />
          <Select
            label="Filter by score band"
            value={filters.band}
            onChange={set('band')}
            options={scoreBands}
            placeholder="All scores"
          />
          <Select
            label="Filter by follow-up"
            value={filters.followUp}
            onChange={set('followUp')}
            options={FOLLOW_UP_OPTIONS}
            placeholder="All follow-ups"
          />
          <Select
            label="Sort leads"
            value={filters.sort === 'newest' ? '' : filters.sort}
            onChange={(value) => set('sort')(value || 'newest')}
            options={SORT_OPTIONS.filter((option) => option.value !== 'newest')}
            placeholder="Newest first"
          />
        </div>

        <div className="lg:ml-auto">
          <Button variant="primary" icon="plus" onClick={onCreate} className="w-full lg:w-auto">
            Add lead
          </Button>
        </div>
      </div>

      {/* A live count, so a filter that removes everything is obviously the
          filter's doing rather than the data's. */}
      <p className="text-xs text-ink-muted" aria-live="polite">
        {loading
          ? 'Loading leads…'
          : `${resultCount} ${resultCount === 1 ? 'lead' : 'leads'}${activeCount ? ' matching your filters' : ''}`}
      </p>
    </div>
  );
};
