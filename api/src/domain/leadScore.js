import { collapseWhitespace, hasCountryCode, isBusinessEmail, normalizePhone } from './normalize.js';
import { scoreBandFor } from './constants.js';

/**
 * Lead Score — 0 to 100.
 *
 * The question this score answers is narrow on purpose: *how much attention
 * does this enquiry deserve first thing tomorrow morning?* It is a triage
 * order, not a probability of closing. Everything it uses is already on the
 * form, so a score exists the moment a lead lands — no enrichment, no waiting.
 *
 * Five factors, weighted by how much each one actually predicts a real project
 * for a small agency:
 *
 *   Budget            35   The single strongest signal. Someone who states a
 *                          real number has thought about paying for the work.
 *   Service fit       20   Retainer and build work is worth more to the agency
 *                          than a one-off small job, so it should surface first.
 *   Enquiry quality   20   Effort in the message correlates with intent. A
 *                          three-word enquiry is usually a tyre-kick.
 *   Reachability      15   A lead you cannot phone is a lead you chase by email
 *                          for a week. A work address beats a free inbox.
 *   Completeness      10   A small nudge for a fully filled form; deliberately
 *                          the lightest factor so it cannot carry a weak lead.
 *
 * Deliberately *not* used: the time of day (noise for an agency with
 * international clients), and the visitor's name beyond a token check, because
 * scoring a person by their name is both unfair and useless.
 *
 * Every factor returns its own reason string. The API ships the breakdown with
 * the lead so the dashboard can explain a score instead of asserting it — a
 * number nobody can question is a number nobody trusts.
 */

const MAX_SCORE = 100;

/** 35 pts. */
const BUDGET_POINTS = {
  '50k-plus': 35,
  '15k-50k': 30,
  '5k-15k': 23,
  '1k-5k': 14,
  // An undisclosed budget outscores an explicitly tiny one: "not sure" is often
  // a serious buyer who has not priced the work yet, whereas "under $1,000" is
  // a firm ceiling below most of what the agency sells.
  'not-sure': 9,
  'under-1k': 4,
};

/** 20 pts. */
const SERVICE_POINTS = {
  'web-development': 20,
  ecommerce: 20,
  seo: 18,
  'paid-ads': 16,
  branding: 13,
  'web-design': 13,
  maintenance: 8,
  other: 6,
};

/**
 * Phrases that suggest a real project rather than a browse. Grouped so that
 * four ways of saying "I have a deadline" score once, not four times.
 */
const INTENT_SIGNALS = [
  { label: 'mentions a timeline', pattern: /\b(asap|urgent|deadline|timeline|this (month|quarter|week)|by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i },
  { label: 'mentions budget or a quote', pattern: /\b(budget|quote|quotation|proposal|pricing|estimate|cost)\b/i },
  { label: 'describes a concrete project', pattern: /\b(redesign|rebuild|migrate|migration|launch|relaunch|integrate|rewrite|revamp)\b/i },
  { label: 'speaks for a business', pattern: /\b(our (company|team|business|agency|store|clinic|brand)|we are|we're|my company|my business)\b/i },
];

const INTENT_POINTS_EACH = 2;
const MAX_INTENT_POINTS = 8;

/** 20 pts total: up to 12 for length, up to 8 for intent signals. */
const messageLengthPoints = (length) => {
  if (length >= 400) return 12;
  if (length >= 200) return 9;
  if (length >= 80) return 6;
  if (length >= 25) return 3;
  return 0;
};

/**
 * @typedef {object} ScoreFactor
 * @property {string} key
 * @property {string} label
 * @property {number} points   points awarded
 * @property {number} max      points available
 * @property {string} reason   plain-English explanation for the UI
 */

const budgetFactor = (lead) => {
  const points = BUDGET_POINTS[lead.budget] ?? 0;
  const reason = lead.budget
    ? lead.budget === 'not-sure'
      ? 'Budget not stated yet'
      : `Budget range ${lead.budget}`
    : 'No budget selected';
  return { key: 'budget', label: 'Budget', points, max: 35, reason };
};

const serviceFactor = (lead) => {
  const points = SERVICE_POINTS[lead.service] ?? 0;
  const reason = lead.service ? `Enquiring about ${lead.service}` : 'No service selected';
  return { key: 'service', label: 'Service fit', points, max: 20, reason };
};

const enquiryFactor = (lead) => {
  const message = collapseWhitespace(lead.message);
  const lengthPoints = messageLengthPoints(message.length);

  const matched = INTENT_SIGNALS.filter((signal) => signal.pattern.test(message));
  const intentPoints = Math.min(matched.length * INTENT_POINTS_EACH, MAX_INTENT_POINTS);

  const reasons = [];
  if (message.length === 0) reasons.push('No message provided');
  else reasons.push(`${message.length}-character message`);
  if (matched.length) reasons.push(...matched.map((signal) => signal.label));

  return {
    key: 'enquiry',
    label: 'Enquiry quality',
    points: lengthPoints + intentPoints,
    max: 20,
    reason: reasons.join(' · '),
  };
};

const reachabilityFactor = (lead) => {
  let points = 0;
  const reasons = [];

  if (normalizePhone(lead.phone)) {
    points += 8;
    reasons.push('Phone number provided');
    if (hasCountryCode(lead.phone)) {
      points += 1;
      reasons.push('includes country code');
    }
  } else {
    reasons.push('No usable phone number');
  }

  if (isBusinessEmail(lead.email)) {
    points += 6;
    reasons.push('Business email domain');
  } else {
    points += 2;
    reasons.push('Free email provider');
  }

  return { key: 'reachability', label: 'Reachability', points, max: 15, reason: reasons.join(' · ') };
};

const completenessFactor = (lead) => {
  const filled = ['name', 'email', 'phone', 'service', 'budget', 'message'].filter((field) =>
    collapseWhitespace(lead[field]),
  );
  // 6 fields on the form; name and email are mandatory so the floor is 2/6.
  const ratio = filled.length / 6;
  let points = Math.round(ratio * 7);

  const fullName = collapseWhitespace(lead.name).split(' ').filter(Boolean).length >= 2;
  if (fullName) points += 3;

  const reason = `${filled.length} of 6 fields completed${fullName ? ' · full name given' : ''}`;
  return { key: 'completeness', label: 'Completeness', points, max: 10, reason };
};

/**
 * Scores a lead and explains the result.
 *
 * @param {object} lead  a lead-shaped object; missing fields simply score zero
 * @returns {{ score: number, band: string, factors: ScoreFactor[], scoredAt: Date }}
 */
export const calculateLeadScore = (lead = {}) => {
  const factors = [
    budgetFactor(lead),
    serviceFactor(lead),
    enquiryFactor(lead),
    reachabilityFactor(lead),
    completenessFactor(lead),
  ];

  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = Math.max(0, Math.min(MAX_SCORE, Math.round(total)));

  return { score, band: scoreBandFor(score), factors, scoredAt: new Date() };
};
