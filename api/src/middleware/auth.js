import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';

/**
 * Two clients, two mechanisms — on purpose.
 *
 * The dashboards are human sessions: a JWT that expires and is re-issued by
 * signing in. The WordPress plugin is an unattended server that cannot log in
 * again by itself, so it presents a long-lived shared secret instead. Giving
 * the plugin a JWT would mean either an immortal token or a plugin that breaks
 * silently at 3am when the token expires.
 */

export const issueToken = (user) =>
  jwt.sign({ sub: user._id.toString(), email: user.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

const bearerToken = (req) => {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
};

/** Guards every private CRM endpoint. */
export const requireAuth = async (req, _res, next) => {
  const token = bearerToken(req);
  if (!token) return next(ApiError.unauthorized('Sign in to continue'));

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    // Expired and tampered tokens are reported identically: a client's only
    // useful response to either is to send the user back to the login screen.
    return next(ApiError.unauthorized('Your session has expired. Please sign in again.'));
  }

  // The user is loaded rather than trusted from the token alone, so a deleted
  // account stops working immediately instead of at token expiry.
  const user = await User.findById(payload.sub);
  if (!user) return next(ApiError.unauthorized('Your session is no longer valid'));

  req.user = user;
  return next();
};

/**
 * Guards the WordPress intake endpoints.
 *
 * Compared with `timingSafeEqual` so the check leaks nothing about how much of
 * the secret was right. Lengths are hashed to a fixed size first, because
 * `timingSafeEqual` throws on a length mismatch — which would itself be a leak.
 */
export const requireSyncToken = (req, _res, next) => {
  const presented = req.get('x-leadflow-token') || '';
  const digest = (value) => crypto.createHash('sha256').update(value).digest();

  if (!presented || !crypto.timingSafeEqual(digest(presented), digest(env.wpSyncToken))) {
    return next(ApiError.unauthorized('Invalid integration token'));
  }

  return next();
};
