import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { isProduction } from '../config/env.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};

/**
 * The single place an error becomes a response.
 *
 * Known failures (ApiError, Mongoose validation, a bad ObjectId) map to a
 * status and a sentence a user can act on. Everything else is a bug: it is
 * logged with its stack and reported as a flat 500, because the difference
 * between "duplicate key on index leads.emailKey_1" and "Something went wrong"
 * is the difference between leaking your schema and not.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
export const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.errors.length ? { errors: error.errors } : {}),
      ...(error.data ? { data: error.data } : {}),
    });
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: Object.values(error.errors).map((issue) => ({
        field: issue.path,
        message: issue.message,
      })),
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: 'That identifier is not valid' });
  }

  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: 'That record already exists' });
  }

  console.error('[api] unhandled error', error);

  return res.status(500).json({
    success: false,
    message: 'Something went wrong on our end. Please try again.',
    ...(isProduction ? {} : { debug: error?.message }),
  });
};
