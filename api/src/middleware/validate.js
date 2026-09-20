import { ApiError } from '../utils/ApiError.js';

/**
 * Turns a Zod schema into request-validation middleware.
 *
 * The parsed result replaces the raw input, so controllers only ever see data
 * that has been through the schema — coerced, trimmed, and with unknown keys
 * stripped. A client cannot smuggle `score: 100` into a create request by
 * adding it to the body.
 *
 * @param {import('zod').ZodType} schema
 * @param {'body'|'query'|'params'} source
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    return next(
      ApiError.badRequest(
        'Please check the highlighted fields',
        result.error.issues.map((issue) => ({
          field: issue.path.join('.') || source,
          message: issue.message,
        })),
      ),
    );
  }

  // Express 5 exposes `req.query` through a getter, so it is redefined rather
  // than assigned; body and params remain plain writable properties.
  if (source === 'query') {
    Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
  } else {
    req[source] = result.data;
  }

  return next();
};
