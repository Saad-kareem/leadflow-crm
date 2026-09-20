const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
const TOKEN_KEY = 'leadflow.token';

/**
 * An API failure, already translated into something a person can read.
 *
 * The rule the whole dashboard follows: no raw error text reaches the screen.
 * `message` is always a sentence written for a user, `errors` carries
 * field-level detail for forms, and `status` is for code to branch on.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, errors = [], data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }

  /** Field errors as `{ fieldName: message }`, ready to merge into form state. */
  get fieldErrors() {
    return this.errors.reduce((map, issue) => ({ ...map, [issue.field]: issue.message }), {});
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/**
 * Called when the API reports an expired or invalid session, so the app can
 * return to the login screen from anywhere — including a background refresh
 * that nobody is watching.
 */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const asQueryString = (params) => {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, value);
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

/**
 * One request function for the whole app.
 *
 * Everything that could surprise a user — an expired token, a server that is
 * not running, a response that is not JSON — is turned into an ApiError with a
 * plain-English message here, once, instead of in every component.
 */
const request = async (path, { method = 'GET', body, params, signal } = {}) => {
  const token = tokenStore.get();

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}${asQueryString(params)}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    // An aborted request is the app tidying up after itself, not a failure the
    // user should ever hear about. It is re-thrown for the caller to ignore.
    if (error.name === 'AbortError') throw error;

    throw new ApiError("We couldn't reach the server. Check that the API is running and try again.", {
      status: 0,
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (response.ok) return payload?.data ?? payload;

  if (response.status === 401) {
    tokenStore.clear();
    onUnauthorized();
  }

  throw new ApiError(
    payload?.message || 'Something went wrong. Please try again.',
    {
      status: response.status,
      errors: Array.isArray(payload?.errors) ? payload.errors : [],
      data: payload?.data ?? null,
    },
  );
};

export const api = {
  login: (credentials) => request('/api/auth/login', { method: 'POST', body: credentials }),
  me: () => request('/api/auth/me'),

  meta: () => request('/api/meta'),
  summary: (options) => request('/api/stats/summary', options),

  listLeads: (params, options) => request('/api/leads', { params, ...options }),
  getLead: (id, options) => request(`/api/leads/${id}`, options),
  createLead: (lead) => request('/api/leads', { method: 'POST', body: lead }),
  updateLead: (id, changes) => request(`/api/leads/${id}`, { method: 'PATCH', body: changes }),
  deleteLead: (id) => request(`/api/leads/${id}`, { method: 'DELETE' }),
  addNote: (id, message) => request(`/api/leads/${id}/notes`, { method: 'POST', body: { message } }),
};
