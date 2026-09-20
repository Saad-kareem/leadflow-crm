/**
 * Lead Score.
 *
 * The score is the number someone sorts by, so it is presented as a number
 * first — "82" large, "/100" small beside it — with a thin bar underneath for
 * the at-a-glance comparison down a column. A chart would be a much larger way
 * of saying one number less precisely.
 *
 * The bar is tinted by band, cold through hot, and the band name is written
 * next to it, so the meaning survives greyscale and colour blindness.
 */
const BAND_BAR = {
  cold: 'bg-band-cold',
  cool: 'bg-band-cool',
  warm: 'bg-band-warm',
  hot: 'bg-band-hot',
};

const BAND_TEXT = {
  cold: 'text-band-cold',
  cool: 'text-band-cool',
  warm: 'text-band-warm',
  hot: 'text-band-hot',
};

export const ScoreMeter = ({ score, band, label, size = 'sm', className = '' }) => {
  const large = size === 'lg';

  return (
    <div className={`min-w-[84px] ${className}`}>
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold tabular-nums ${large ? 'text-3xl' : 'text-sm'}`}>{score}</span>
        <span className={`text-ink-muted ${large ? 'text-sm' : 'text-xs'}`}>/ 100</span>
        {label ? (
          <span className={`ml-auto text-xs font-medium ${BAND_TEXT[band] ?? BAND_TEXT.cold}`}>{label}</span>
        ) : null}
      </div>

      <div
        className={`mt-1.5 w-full overflow-hidden rounded-full bg-line ${large ? 'h-2' : 'h-1.5'}`}
        role="img"
        aria-label={`Lead score ${score} out of 100${label ? `, ${label}` : ''}`}
      >
        <div
          className={`h-full rounded-full ${BAND_BAR[band] ?? BAND_BAR.cold}`}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
};

/**
 * The breakdown behind the score, shown in the lead detail view.
 *
 * A score nobody can question is a score nobody trusts — and the first thing
 * anyone asks about an automated number is "why is it that?". The API ships
 * the reasoning with the lead, so the answer is right there.
 */
export const ScoreBreakdown = ({ factors = [] }) => (
  // Generous space *between* factors and tight spacing *within* one, so each
  // bar reads as belonging to the label above it rather than the row below.
  <ul className="space-y-4">
    {factors.map((factor) => (
      <li key={factor.key}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-ink">{factor.label}</span>
          <span className="text-xs tabular-nums text-ink-soft">
            {factor.points} <span className="text-ink-muted">/ {factor.max}</span>
          </span>
        </div>

        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-brand-500"
            style={{ width: `${Math.round((factor.points / factor.max) * 100)}%` }}
          />
        </div>

        <p className="mt-1 text-xs leading-snug text-ink-muted">{factor.reason}</p>
      </li>
    ))}
  </ul>
);
