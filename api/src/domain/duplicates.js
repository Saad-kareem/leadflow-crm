import { Lead } from '../models/Lead.js';
import { env } from '../config/env.js';
import { normalizeEmail, normalizePhone } from './normalize.js';

/**
 * Duplicate prevention.
 *
 * The rule: a new lead is a duplicate of an existing one when it has the same
 * normalised email address **or** the same normalised phone number, and the
 * existing lead was created within the last `DUPLICATE_WINDOW_DAYS` (30 by
 * default).
 *
 * Why this rule:
 *
 *  - *Email or phone, not both.* Requiring both to match would let the same
 *    person slip through by typing a different phone number the second time,
 *    which is exactly what happens when someone re-submits a form in a hurry.
 *  - *Normalised, not raw.* Matching on the raw strings misses the common
 *    cases — see `normalize.js` for what that means for Gmail and for phone
 *    number formatting.
 *  - *Time-boxed.* A returning client enquiring again six months later is a new
 *    piece of business, not a duplicate. Thirty days is roughly how long an
 *    agency's sales conversation stays open, and it is configurable.
 *  - *Name is ignored.* Two people at the same company share a phone number all
 *    the time, but they do not share an email address; email carries the match,
 *    and the phone rule is there to catch typo'd email addresses.
 *
 * What happens on a match is the caller's decision, which differs by entry
 * point: the WordPress intake records the duplicate and returns 200 so the
 * visitor never sees an error, while manual creation in the dashboard returns
 * 409 so the user can open the lead that already exists.
 */

export const findDuplicate = async (candidate) => {
  const emailKey = normalizeEmail(candidate.email);
  const phoneKey = normalizePhone(candidate.phone);

  const matchers = [];
  if (emailKey) matchers.push({ emailKey });
  if (phoneKey) matchers.push({ phoneKey });
  if (!matchers.length) return null;

  const since = new Date(Date.now() - env.duplicateWindowDays * 24 * 60 * 60 * 1000);

  return Lead.findOne({ $or: matchers, createdAt: { $gte: since } }).sort({ createdAt: -1 });
};

export const describeDuplicateRule = () =>
  `Same email address or phone number (normalised) within ${env.duplicateWindowDays} days.`;
