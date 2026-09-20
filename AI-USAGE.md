# AI usage

AI tooling (Claude) was used throughout this build. This file records where,
and — more usefully — what I kept, changed or threw away, since the assessment
expects me to be able to explain every part of the submitted code.

## Where it helped most

**Scaffolding and boilerplate.** Project structure for the four parts, the
Express wiring, the Vite/Tailwind setup, the Angular standalone component
shell. This is the work with a known right answer and no decisions in it.

**Repetitive, mechanical code.** The inline SVG icon set, the Tailwind class
strings for status badges, the `dbDelta` table definition with its formatting
rules, and the demo seed data.

**Regex.** The phone-format pattern in the validators, the intent-signal
patterns in the scoring rules, and the `esc_like` escaping in the WordPress
repository.

**Rubber-ducking.** Talking through the duplicate-detection rule and the
follow-up "overdue" definition before writing either.

**Review.** A pass over the WordPress plugin looking for missing nonce checks,
unescaped output and unprepared queries.

## What I decided myself

These are the parts where there is no right answer to look up, and where the
reasoning is mine:

- **The Lead Score rules** — which five factors, their weights, and why budget
  carries 35 of the 100 points while completeness carries 10. Also the
  decisions *not* to use certain signals. The reasoning is documented at the
  top of `api/src/domain/leadScore.js` and in the README.
- **The duplicate rule** — email *or* phone rather than both, normalised
  rather than raw, and time-boxed to 30 days. Also that the two entry points
  react differently: the WordPress intake absorbs a duplicate with 200 so the
  visitor never sees an error, while manual creation returns 409 so the user
  can open the lead that already exists.
- **Custom table over a custom post type** for WordPress storage, for the
  reasons in the README.
- **Two authentication mechanisms** — JWT for the human dashboards, a shared
  secret for the unattended plugin — and why a session token is the wrong fit
  for a server that cannot re-authenticate itself.
- **Follow-up tracking** as the extra feature, over the other candidates.
- **The design system and the UI decisions** — the restrained palette, badges
  that carry a dot and a word rather than colour alone, filters in the URL,
  and shipping the score breakdown so an automated number can be questioned.

## What I corrected in AI output

- **A real integration bug it introduced.** The generated plugin used PHP's
  `gmdate('c')`, which emits a `+00:00` offset, while the API's ISO-8601
  validator only accepted a `Z`. Nothing caught this until I ran the plugin
  against the live API — neither side is wrong in isolation. Both were fixed:
  the API now accepts any valid offset, and the plugin sends unambiguous UTC.
- **A Mongoose ordering mistake.** The derived-field hook was first written as
  `pre('save')`. Mongoose validates *before* save hooks run, so the required
  `emailKey` did not exist yet and every insert failed. Moved to
  `pre('validate')`.
- **Over-broad CORS.** The first draft reflected any origin. Replaced with an
  explicit allow-list, because these endpoints carry a bearer token.
- **A timing-unsafe token comparison.** The plugin's shared secret was checked
  with `===`. Replaced with a hashed `timingSafeEqual`, since comparing raw
  strings of different lengths both leaks and throws.
- **Tailwind v4 specifics.** The generated CSS used `@apply` on a class
  defined in `@layer components`, which v4 rejects; the shared button base had
  to become an `@utility`.
- **Comment noise.** A lot of generated commentary restated what the code
  already said. I cut it and kept comments for decisions and trade-offs — the
  things the code cannot say for itself.

## What I verified rather than trusted

- 21 unit tests over the scoring rules and the normalisation that duplicate
  detection depends on (`cd api && npm test`).
- Every API endpoint exercised against a running server: auth, the guards on
  private routes, CRUD, filters, the duplicate paths, and the error shapes.
- The WordPress plugin driven end-to-end against the live API through a
  throwaway harness that stubbed the WordPress functions — validation,
  honeypot, rate limit, sync, duplicate handling, a bad token and sync
  switched off.
- The React dashboard opened in a real browser at desktop and phone widths,
  including the loading, empty, error and validation states.
