/**
 * The vocabulary the whole system shares.
 *
 * These values are exposed over `GET /api/meta` so the React dashboard, the
 * Angular view and the WordPress plugin can render selects and badges without
 * any of them keeping a private copy that can drift out of date.
 *
 * Stored values are machine-readable slugs; `label` is what a human sees.
 */

export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export const LEAD_SOURCES = [
  { value: 'wordpress', label: 'WordPress form' },
  { value: 'manual', label: 'Added manually' },
];

export const SERVICES = [
  { value: 'web-development', label: 'Web Development' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'seo', label: 'SEO' },
  { value: 'paid-ads', label: 'Paid Advertising' },
  { value: 'branding', label: 'Branding & Identity' },
  { value: 'web-design', label: 'Web Design' },
  { value: 'maintenance', label: 'Support & Maintenance' },
  { value: 'other', label: 'Something else' },
];

export const BUDGET_RANGES = [
  { value: 'under-1k', label: 'Under $1,000' },
  { value: '1k-5k', label: '$1,000 – $5,000' },
  { value: '5k-15k', label: '$5,000 – $15,000' },
  { value: '15k-50k', label: '$15,000 – $50,000' },
  { value: '50k-plus', label: '$50,000+' },
  { value: 'not-sure', label: 'Not sure yet' },
];

/**
 * Score bands. A number on its own ("64") means little to someone triaging a
 * list, so every score is also bucketed into a band the UI can colour.
 */
export const SCORE_BANDS = [
  { value: 'hot', label: 'Hot', min: 75 },
  { value: 'warm', label: 'Warm', min: 55 },
  { value: 'cool', label: 'Cool', min: 30 },
  { value: 'cold', label: 'Cold', min: 0 },
];

const values = (list) => list.map((item) => item.value);

export const LEAD_STATUS_VALUES = values(LEAD_STATUSES);
export const LEAD_SOURCE_VALUES = values(LEAD_SOURCES);
export const SERVICE_VALUES = values(SERVICES);
export const BUDGET_VALUES = values(BUDGET_RANGES);
export const SCORE_BAND_VALUES = values(SCORE_BANDS);

export const scoreBandFor = (score) =>
  SCORE_BANDS.find((band) => score >= band.min)?.value ?? 'cold';
