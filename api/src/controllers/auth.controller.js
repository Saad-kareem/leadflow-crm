import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { issueToken } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  // One message and one code for both "no such user" and "wrong password", so
  // the endpoint cannot be used to find out which email addresses exist.
  const invalid = ApiError.unauthorized('Those details do not match an account');
  if (!user) throw invalid;

  const passwordMatches = await user.verifyPassword(password);
  if (!passwordMatches) throw invalid;

  user.lastLoginAt = new Date();
  await user.save();

  res.json({
    success: true,
    data: {
      token: issueToken(user),
      expiresIn: env.jwtExpiresIn,
      user: user.toPublicJSON(),
    },
  });
};

/** Lets a client restore a session on page refresh without re-prompting. */
export const me = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toPublicJSON() } });
};
