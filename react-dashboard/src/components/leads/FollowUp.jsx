import { daysFromToday, formatDate, formatRelative } from '../../lib/format.js';
import { Icon } from '../ui/Icon.jsx';

/**
 * Follow-up date.
 *
 * The date itself is rarely the useful part — "overdue" is. So an overdue or
 * due-today follow-up is called out, anything further ahead is shown as a
 * quiet relative date, and a lead with nothing scheduled says so plainly
 * rather than leaving an empty cell that could mean anything.
 *
 * Closed leads never show as overdue: chasing something already marked Won is
 * noise, and a column full of false alarms is a column people stop reading.
 */
export const FollowUp = ({ date, status }) => {
  if (!date) {
    return <span className="text-sm text-ink-muted">Not scheduled</span>;
  }

  const closed = status === 'won' || status === 'lost';
  const days = daysFromToday(date);
  const overdue = !closed && days < 0;
  const dueToday = !closed && days === 0;

  return (
    <span className="inline-flex flex-col gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 text-sm ${
          overdue ? 'font-medium text-band-hot' : dueToday ? 'font-medium text-contacted-fg' : 'text-ink'
        }`}
      >
        {overdue || dueToday ? <Icon name="clock" className="h-3.5 w-3.5" /> : null}
        {overdue ? 'Overdue' : dueToday ? 'Due today' : formatRelative(date)}
      </span>
      <span className="text-xs text-ink-muted">{formatDate(date)}</span>
    </span>
  );
};
