/**
 * Normalisation helpers shared by duplicate detection and storage.
 *
 * Every lead keeps both the value the visitor typed (shown in the UI, used to
 * contact them) and a normalised form (used only for matching). Comparing the
 * raw strings would miss the most common real-world duplicates: the same person
 * filling the form twice with "Ali@Example.com " and "ali@example.com".
 */

const FREE_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'mail.com',
  'yandex.com',
  'gmx.com',
  'zoho.com',
]);

/** The local part of a Gmail address ignores dots and anything after a `+`. */
const normalizeGmailLocalPart = (localPart) => localPart.split('+')[0].replace(/\./g, '');

/**
 * Lower-cased, trimmed, and — for providers whose addressing rules we know —
 * reduced to the form that actually reaches the same inbox.
 *
 * @returns {string} normalised address, or '' when the input is not usable
 */
export const normalizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex < 1 || atIndex === trimmed.length - 1) return '';

  const localPart = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const local = normalizeGmailLocalPart(localPart);
    return local ? `${local}@gmail.com` : '';
  }

  return `${localPart}@${domain}`;
};

export const emailDomain = (email) => {
  const normalized = normalizeEmail(email);
  return normalized ? normalized.slice(normalized.lastIndexOf('@') + 1) : '';
};

export const isBusinessEmail = (email) => {
  const domain = emailDomain(email);
  return Boolean(domain) && !FREE_EMAIL_PROVIDERS.has(domain);
};

/**
 * Phone numbers are compared on their last 9 digits.
 *
 * People write the same number as "0300 1234567", "+92 300 1234567" and
 * "(0300) 123-4567". Stripping punctuation and dropping the country/trunk
 * prefix catches those without needing a full libphonenumber dependency. Nine
 * digits is long enough that a collision between two genuinely different people
 * is very unlikely, and short enough to survive a missing leading zero.
 *
 * @returns {string} comparable digits, or '' when the input is too short
 */
export const normalizePhone = (phone) => {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '';
  return digits.slice(-9);
};

export const hasCountryCode = (phone) => typeof phone === 'string' && phone.trim().startsWith('+');

/** Collapses runs of whitespace so "Ali   Khan\n" and "Ali Khan" compare equal. */
export const collapseWhitespace = (value) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
