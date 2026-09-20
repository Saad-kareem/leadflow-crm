import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon.jsx';

const DOTS = {
  new: 'bg-new-dot',
  contacted: 'bg-contacted-dot',
  qualified: 'bg-qualified-dot',
  won: 'bg-won-dot',
  lost: 'bg-lost-dot',
};

/**
 * A summary card.
 *
 * Number first and large, label underneath and small — the count is what
 * someone is scanning for, so it gets the visual weight. Everything else on
 * the card is deliberately quiet: six cards competing for attention is the
 * same as none of them having any.
 *
 * Each card links into the leads list with the matching filter applied, which
 * is what people try to do with a number on a dashboard anyway.
 */
export const StatCard = ({ label, value, to, status, icon, emphasis = false }) => {
  const content = (
    <>
      <div className="flex items-center gap-2">
        {status ? <span className={`h-2 w-2 shrink-0 rounded-full ${DOTS[status]}`} /> : null}
        {icon ? <Icon name={icon} className="h-4 w-4 text-ink-muted" /> : null}
        <span className="text-sm font-medium text-ink-soft">{label}</span>
      </div>

      <p className={`mt-2 font-semibold tabular-nums tracking-tight ${emphasis ? 'text-3xl' : 'text-2xl'}`}>
        {value}
      </p>
    </>
  );

  const className = `card p-4 transition-shadow ${
    to ? 'hover:border-line-strong hover:shadow-raised' : ''
  } ${emphasis ? 'ring-1 ring-brand-500/15' : ''}`;

  return to ? (
    <Link to={to} className={`block ${className}`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

/**
 * A single figure with a sentence explaining it — used for the numbers that
 * need context to mean anything, like a win rate.
 */
export const InsightTile = ({ label, value, caption, action, tone = 'default' }) => (
  <div className="card flex flex-col p-4">
    <p className="text-sm font-medium text-ink-soft">{label}</p>
    <p
      className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight ${
        tone === 'alert' ? 'text-band-hot' : 'text-ink'
      }`}
    >
      {value}
    </p>
    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{caption}</p>
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);
