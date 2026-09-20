/**
 * An error with an HTTP status attached.
 *
 * Anything thrown that is *not* an ApiError is treated as a bug by the error
 * handler: logged in full, reported to the client as a generic 500. That split
 * is what stops a stack trace or a Mongo error string reaching a browser.
 */
export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {string} message  safe to show a user
   * @param {object} [options]
   * @param {Array<{field: string, message: string}>} [options.errors]  field-level detail
   * @param {object} [options.data]  extra payload, e.g. the conflicting lead
   */
  constructor(status, message, { errors = [], data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, { errors });
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message, data = null) {
    return new ApiError(409, message, { data });
  }
}
