/**
 * Display helpers.
 *
 * Dates in a CRM are read as "how long ago" far more often than as calendar
 * dates, so most of this file is about saying that clearly and briefly.
 */

const dayMs = 24 * 60 * 60 * 1000;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/** Whole days from today: negative in the past, 0 today, positive ahead. */
export const daysFromToday = (value) =>
  Math.round((startOfDay(value) - startOfDay(new Date())) / dayMs);

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

/** "Today", "3 days ago", "in 2 weeks" — with an exact date always nearby. */
export const formatRelative = (value) => {
  if (!value) return '';

  const days = daysFromToday(value);

  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';

  const magnitude = Math.abs(days);
  const [count, unit] =
    magnitude < 7
      ? [magnitude, 'day']
      : magnitude < 31
        ? [Math.round(magnitude / 7), 'week']
        : [Math.round(magnitude / 30), 'month'];

  const label = `${count} ${unit}${count === 1 ? '' : 's'}`;
  return days < 0 ? `${label} ago` : `in ${label}`;
};

/** Initials for the avatar in the lead list and the topbar. */
export const initials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** Turns a slug into a label using the vocabulary served by `/api/meta`. */
export const labelFor = (options, value) =>
  options?.find((option) => option.value === value)?.label ?? value ?? '';

export const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * `<input type="date">` works in whole local days; the API works in instants.
 *
 * These two convert between them via local midday rather than midnight, so a
 * date chosen in a timezone behind UTC does not come back as the day before.
 */
export const toDateInputValue = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const fromDateInputValue = (value) =>
  value ? new Date(`${value}T12:00:00`).toISOString() : null;

/** Today, for a date input's `min` — you cannot schedule a call for last week. */
export const todayInputValue = () => toDateInputValue(new Date().toISOString());
