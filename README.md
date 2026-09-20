# LeadFlow Mini CRM

A small but complete lead-management system for a fictional digital agency.

A visitor submits an enquiry on a WordPress site → the plugin stores it locally
and pushes it to a Node/Express API → the API scores the lead and saves it in
MongoDB → the team works it from a React dashboard. A small Angular page reads
the same API for a read-only insights view.

```
wordpress-plugin/   Part A — "LeadFlow Connector" WordPress plugin (PHP)
api/                Part B — Express 5 + MongoDB REST API
react-dashboard/    Part C — React CRM dashboard (Vite + Tailwind v4)
angular-insights/   Part D — Angular "Lead Insights" standalone page
```

---

## Architecture

```
┌────────────────────────┐   POST /api/integrations/wordpress/leads
│  WordPress site        │   header: X-LeadFlow-Token (shared secret)
│  [leadflow_form]       │ ─────────────────────────────────────────┐
│                        │                                          │
│  wp_leadflow_leads     │ ◀── synced | duplicate | failed | pending│
│  (custom table)        │                                          │
│  wp-admin: leads +     │                                          ▼
│  settings + retry      │                            ┌───────────────────────┐
└────────────────────────┘                            │  Node / Express API   │
                                                      │                       │
┌────────────────────────┐  JWT: /api/auth,           │  • lead score         │
│  React dashboard       │       /api/leads,          │  • duplicate rule     │
│  localhost:5173        │ ◀────/api/stats ──────────▶│  • JWT auth           │
└────────────────────────┘                            │  • shared-secret auth │
                                                      └──────────┬────────────┘
┌────────────────────────┐  JWT: /api/stats/summary              │
│  Angular insights      │ ◀─────────────────────────────────────┤
│  localhost:4200        │                                       ▼
└────────────────────────┘                                ┌─────────────┐
                                                          │  MongoDB    │
                                                          │ leads,users │
                                                          └─────────────┘
```

### Two authentication mechanisms, on purpose

| Client | Mechanism | Why |
|---|---|---|
| React / Angular | JWT bearer token | A human session. It expires, and signing in re-issues it. |
| WordPress plugin | `X-LeadFlow-Token` shared secret | An unattended server. It has no way to re-authenticate on its own, so a session token would mean either an immortal JWT or a plugin that breaks silently at 3am. The secret is held in a WordPress option and compared timing-safely. |

---

## Prerequisites

- **Node.js 20+** (developed on v20.20)
- **MongoDB** on `27017` (`sudo systemctl start mongod`)
- **PHP 7.4+ and a WordPress install** for Part A

---

## 1. API (`/api`)

```bash
cd api
cp .env.example .env
```

Generate real secrets — the API refuses to boot on the placeholders:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # WP_SYNC_TOKEN
```

Set `ADMIN_PASSWORD` too, then:

```bash
npm install
npm run seed -- --with-leads   # admin account + 10 demo leads
npm run dev                    # http://localhost:4000
npm test                       # 21 unit tests, no database needed
```

`npm run seed` on its own creates only the admin account.
Add `--reset` to clear existing leads first.

### Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Default `4000`. |
| `MONGODB_URI` | e.g. `mongodb://127.0.0.1:27017/leadflow_crm` |
| `JWT_SECRET` | Signing key for session tokens. Minimum 24 characters. |
| `JWT_EXPIRES_IN` | Token lifetime. Default `12h`. |
| `WP_SYNC_TOKEN` | Shared secret the WordPress plugin sends. Minimum 24 characters. |
| `CORS_ORIGINS` | Comma-separated allow-list of browser origins. |
| `DUPLICATE_WINDOW_DAYS` | Duplicate window. Default `30`. |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The seeded admin account. |

Configuration is validated once at boot, so a missing variable fails the start
rather than the first request that happens to need it.

### Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/api/health` | – | Liveness, including database state. |
| `GET` | `/api/meta` | – | Status/service/budget/band vocabulary, so clients never hard-code it. |
| `POST` | `/api/auth/login` | – | Rate limited to 10 attempts / 10 min. |
| `GET` | `/api/auth/me` | JWT | Restores a session on refresh. |
| `GET` | `/api/leads` | JWT | `search`, `status`, `band`, `source`, `followUp`, `sort`, `page`, `limit`. |
| `POST` | `/api/leads` | JWT | Manual creation; runs the duplicate check. |
| `GET` | `/api/leads/:id` | JWT | Includes the score breakdown and activity timeline. |
| `PATCH` | `/api/leads/:id` | JWT | Partial update; re-scores and logs to the timeline. |
| `DELETE` | `/api/leads/:id` | JWT | |
| `POST` | `/api/leads/:id/notes` | JWT | Adds a note to the timeline. |
| `GET` | `/api/stats/summary` | JWT | One `$facet` aggregation for every dashboard number. |
| `GET` | `/api/integrations/wordpress/ping` | Secret | Powers the plugin's "Test connection". |
| `POST` | `/api/integrations/wordpress/leads` | Secret | Intake. Rate limited to 30/min. |

Every response uses the same envelope:

```jsonc
{ "success": true,  "data": { … } }
{ "success": false, "message": "Please check the highlighted fields",
  "errors": [{ "field": "email", "message": "Please enter a valid email address" }] }
```

Private routes are guarded at the router, not per-route, so a new endpoint
added to `leads.routes.js` is private by default. Forgetting a guard should be
impossible, not merely unlikely.

---

## 2. WordPress plugin (`/wordpress-plugin`)

Copy or symlink `wordpress-plugin/leadflow-connector` into
`wp-content/plugins/`, activate it, then open **LeadFlow → Settings** and set:

- **CRM API URL** — e.g. `http://localhost:4000` (base URL only)
- **API token** — the same value as `WP_SYNC_TOKEN` in the API's `.env`

Press **Test connection** to confirm both before a real lead depends on them.
Then put `[leadflow_form]` on any page.

```
[leadflow_form]
[leadflow_form title="Work with us" button="Request a quote"]
```

**LeadFlow → Leads** lists every submission with its sync status
(`synced` / `duplicate` / `failed` / `pending` / `not sent`), the score the API
returned, and a retry action for anything that did not get through.

### Why a custom table rather than a custom post type

A lead is a record, not content.

- It is never rendered on the front end, never needs revisions, the block
  editor, taxonomies or an author.
- It carries six fields plus sync metadata, which as a CPT becomes ten
  `postmeta` rows per lead.
- The admin screen's two normal questions — "which syncs failed?" and "newest
  first" — are an indexed column scan against a custom table, and a
  join-heavy `meta_query` against `postmeta`.

The trade-off: no free wp-admin list screen, no REST API, no `WP_Query`. The
first is handled by extending `WP_List_Table`, which is a small amount of code,
and the other two are not wanted here — these records are deliberately not
public.

### Security

- Nonces on both submission paths and on every admin action, plus a
  `manage_options` capability check — the capability answers "may they", the
  nonce answers "did they mean to", and they are not interchangeable.
- Input is sanitised first and validated second, so what is checked is exactly
  what would be stored.
- `service` and `budget` are checked against an allow-list, not merely
  sanitised, so a crafted request cannot store a value the CRM will reject.
- Every query goes through `$wpdb->prepare()` or the typed format arrays that
  `insert()`/`update()` take; `LIKE` values also go through `esc_like()`.
- Everything is escaped at the point of output.
- Honeypot field plus a per-IP rate limit (5 submissions / 10 minutes), using
  `REMOTE_ADDR` only — trusting `X-Forwarded-For` would let anyone bypass the
  limit by inventing a header.
- The API token is never rendered back into the settings page; leaving the
  field blank keeps the stored value.

### Works without JavaScript

The form is an ordinary POST to `admin-post.php`, which redirects back with the
result in a short-lived transient. `leadflow-form.js` progressively enhances
that into an AJAX submit. Both endpoints verify the same nonce and run the same
validator — there is no easier path into the database.

---

## 3. React dashboard (`/react-dashboard`)

```bash
cd react-dashboard
cp .env.example .env.local     # VITE_API_URL, defaults to http://localhost:4000
npm install
npm run dev                    # http://localhost:5173
npm run build
```

Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the API's `.env`.

The design decisions are documented in the code itself; the short version:

- **A design system first.** Colour, radius, shadow and typography are tokens
  in `src/index.css`; `Button`, `Field`, `Badge`, the table and the overlays
  are built on them. No component hard-codes a hex value.
- **A restrained palette.** Neutral canvas, white surfaces, one brand colour
  for primary actions and active navigation, and semantic tints used only for
  status. Colour has to mean something when it appears, which it cannot do if
  it is everywhere.
- **Status never relies on colour alone** — every badge carries a dot *and*
  the status word.
- **Lead Score is a number first**, with a thin band-tinted bar for scanning a
  column, and the API's breakdown behind a "Why this score?" disclosure. An
  automated number nobody can question is a number nobody trusts.
- **Filters live in the URL**, so dashboard cards can deep-link into a
  filtered view, the back button behaves, and a view can be shared.
- **All four states are designed**: skeletons shaped like the content they
  replace, empty states that say what to do next (and differ between "no leads
  yet" and "none match your filters"), and errors in plain English with a
  retry. No raw API text ever reaches the screen.
- **Responsive rather than shrunk**: a seven-column table on desktop, the same
  leads as cards below `lg`, a slide-over drawer that becomes a sheet, stacked
  filters and a full-width primary action on a phone.
- **Accessibility basics**: semantic HTML, labels tied to inputs with real
  `for`/`aria-describedby`/`aria-invalid`, a visible focus ring that is never
  removed, a skip link, focus trapped in overlays and restored on close, and
  an overlay stack so Escape closes only the topmost dialog.

### The extra feature: follow-up tracking

Chosen over the other candidates because it is the thing a lead list is
actually missing — a score tells you who to call, but not who you *said* you
would call. It runs through the whole stack rather than sitting in one screen:

- a `followUpAt` field on the lead, set from the drawer or at creation
- a `followUp=due` filter, backed by an indexed query
- "Overdue" and "Due today" markers in the table and the cards
- a dashboard tile counting what is owed, linking into that filter
- timeline entries when a follow-up is set, changed or cleared

Closed leads (Won/Lost) are never counted as overdue. A column full of false
alarms is a column people stop reading.

---

## 4. Angular Lead Insights (`/angular-insights`)

```bash
cd angular-insights
npm install
npm start                      # http://localhost:4200
```

One standalone component showing total leads, counts by status, and the top 5
leads by score, read from `GET /api/stats/summary`.

**Authentication is simplified here, as the brief allows.** The page asks for
the same admin credentials, calls `POST /api/auth/login`, and keeps the JWT in
`sessionStorage` for the tab's lifetime. It is not a second session system —
it is the same endpoint with a smaller surface, because this view is read-only
and exists to demonstrate adaptability rather than to be a second CRM.

---

## Lead Score

0–100, calculated by the API in `api/src/domain/leadScore.js` and returned with
every lead. The question it answers is narrow on purpose: *how much attention
does this enquiry deserve first thing tomorrow morning?* It is a triage order,
not a probability of closing.

| Factor | Max | Reasoning |
|---|---|---|
| **Budget** | 35 | The strongest single signal. Someone who states a real number has thought about paying for the work. |
| **Service fit** | 20 | Build and retainer work is worth more to the agency than a one-off small job, so it should surface first. |
| **Enquiry quality** | 20 | Up to 12 for message length, up to 8 for intent phrases (a timeline, a budget or quote, a concrete project, speaking for a business). Effort correlates with intent; a three-word enquiry is usually a tyre-kick. |
| **Reachability** | 15 | A phone number is worth 8 (+1 with a country code); a business email domain 6 against 2 for a free provider. A lead you cannot phone is a lead you chase by email for a week. |
| **Completeness** | 10 | Scaled across the six form fields, plus 3 for a full name. Deliberately the lightest factor, so it cannot carry a weak lead. |

Two deliberate choices worth calling out:

- **"Not sure" about budget scores 9, above "Under $1,000" at 4.** An
  undisclosed budget is often a serious buyer who has not priced the work yet;
  an explicit sub-£1,000 ceiling is a firm answer below most of what the
  agency sells.
- **Nothing is scored on the person's name** beyond a token check for a full
  name, and time of day is ignored — it is noise for an agency with
  international clients.

Bands: **Hot** ≥ 75, **Warm** 55–74, **Cool** 30–54, **Cold** < 30.

The score is recalculated whenever a scoring input changes, in the model's
`pre('validate')` hook — so a budget corrected in the dashboard re-scores the
lead, and no controller can set a score directly. Every factor also returns a
plain-English reason, which is what the dashboard's "Why this score?" shows.

---

## Duplicate prevention

**The rule:** a new lead is a duplicate of an existing one when it has the same
normalised email address **or** the same normalised phone number, and that lead
was created within the last `DUPLICATE_WINDOW_DAYS` (30 by default).

- **Normalised, not raw.** Email is lower-cased and trimmed, and for Gmail the
  dots and any `+tag` are removed, because they all reach one inbox. Phone
  numbers are compared on their last 9 digits, so `+92 300 1234567`,
  `0300-1234567` and `(0300) 123 4567` match.
- **Email *or* phone, not both.** Requiring both would let the same person
  through by typing a different number the second time, which is exactly what
  happens when someone re-submits a form in a hurry.
- **Time-boxed.** A returning client enquiring six months later is new
  business, not a duplicate.
- **Name is ignored.** Two people at one company share a phone number all the
  time but never an email address. Email carries the match; the phone rule is
  there to catch a typo'd address.

**What happens on a match depends on the entry point**, which is the part worth
explaining:

- **WordPress intake** answers `200` with `duplicate: true`. The visitor has
  already submitted the form and is waiting for a thank-you; failing them
  because the office already has their details would be a bug from their point
  of view. The existing lead gets a timeline entry instead, because "they asked
  again" is genuinely useful to whoever picks it up.
- **Manual creation** returns `409` with the existing lead attached, so the
  dashboard can offer to open it. The person is sitting right there and can
  decide.

---

## Testing

```bash
cd api && npm test          # 21 unit tests
```

They cover the scoring rules (ranges, ordering, the declared weights summing to
100, determinism, and not throwing on an empty object) and the normalisation
that duplicate detection depends on — the real-world cases it has to survive,
like the same phone number written four ways. Both modules are pure, so the
tests need no database and run in under a second.

Beyond that, the API was exercised end-to-end against a running server, and the
WordPress plugin was driven against the live API through a throwaway harness
that stubbed the WordPress functions — which is how the ISO-8601 mismatch
described in `AI-USAGE.md` was found.

---

## Known limitations, and what I would do next

**Testing depth.** Unit tests cover the two pure modules. There are no
integration tests over the HTTP layer and no front-end tests. With more time:
Supertest against an in-memory MongoDB for the routes, and React Testing
Library for the drawer's save paths.

**A single admin user.** There is one account and no roles, so "assigned to"
is not a concept. Multi-user is a real feature, not a flag — it needs
ownership on the lead, a team view and an invite flow.

**Sync is synchronous.** The plugin syncs during the request. If the API is
slow, the visitor waits up to 8 seconds; if it is down, the lead is stored
locally and has to be retried by hand. The right fix is `wp_schedule_single_event`
to push the sync into cron, with a retry schedule. I left it synchronous
because a failed sync is visible and recoverable in wp-admin, and an invisible
cron job that silently stops is worse than a visible retry button.

**No pagination in the WordPress retry-all.** It is capped at 25 per click to
avoid timing out the page. A backlog larger than that needs the cron approach.

**Lead scores are not re-run historically.** If the scoring rules change, only
leads touched afterwards pick up the new weights. A `npm run rescore` script
would be a few lines and is the obvious next thing.

**Search is a regex, not a text index.** The text index exists on the model,
but `$text` only matches whole words, so "ali" would not find "Alina" and an
incremental search box would feel broken. The regex is correct for the UX and
will not scale past tens of thousands of leads; at that point it wants
Atlas Search or a prefix index.

**The Angular view is deliberately minimal**, per the brief's 45–60 minute
guidance. It does not share code with the React app, and its simplified auth
is documented above.

**No deployment.** Everything runs locally, as the brief permits.
