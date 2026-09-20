/**
 * Lead status.
 *
 * Every badge carries a coloured dot *and* the status word. Colour alone
 * cannot be the signal — roughly one man in twelve cannot separate the green
 * "Won" from the amber "Contacted", and nobody can in a printed report.
 *
 * The class strings are written out in full rather than built by
 * interpolation, because Tailwind scans source text and would not generate a
 * class it never sees spelled out.
 */
const TONES = {
  new: 'bg-new-bg text-new-fg',
  contacted: 'bg-contacted-bg text-contacted-fg',
  qualified: 'bg-qualified-bg text-qualified-fg',
  won: 'bg-won-bg text-won-fg',
  lost: 'bg-lost-bg text-lost-fg',
};

const DOTS = {
  new: 'bg-new-dot',
  contacted: 'bg-contacted-dot',
  qualified: 'bg-qualified-dot',
  won: 'bg-won-dot',
  lost: 'bg-lost-dot',
};

export const StatusBadge = ({ status, label }) => (
  <span className={`badge ${TONES[status] ?? TONES.lost}`}>
    <span className={`badge-dot ${DOTS[status] ?? DOTS.lost}`} />
    {label ?? status}
  </span>
);

const SOURCE_LABELS = {
  wordpress: 'Website',
  manual: 'Manual',
};

/** A quieter badge — source is context, not something to act on. */
export const SourceBadge = ({ source }) => (
  <span className="badge border border-line bg-surface-sunken text-ink-muted">
    {SOURCE_LABELS[source] ?? source}
  </span>
);
