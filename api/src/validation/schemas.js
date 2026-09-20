import { z } from 'zod';
import {
  BUDGET_VALUES,
  LEAD_STATUS_VALUES,
  SCORE_BAND_VALUES,
  SERVICE_VALUES,
} from '../domain/constants.js';

/**
 * Request schemas.
 *
 * Messages are written for the person filling in the form, not for the
 * developer reading the log — they are rendered under the field in the
 * dashboard exactly as written here.
 */

const trimmed = z.string().trim();

const name = trimmed
  .min(2, 'Please enter a name of at least 2 characters')
  .max(120, 'That name is too long');

const email = trimmed
  .min(1, 'An email address is required')
  .max(200, 'That email address is too long')
  .pipe(z.email('Please enter a valid email address'))
  .transform((value) => value.toLowerCase());

const phone = trimmed
  .max(40, 'That phone number is too long')
  .regex(/^[+()\-.\s\d]*$/, 'A phone number can only contain digits and + ( ) - .')
  .optional()
  .default('');

const service = z.enum(SERVICE_VALUES, { message: 'Please choose a service' });
const budget = z.enum(BUDGET_VALUES, { message: 'Please choose a budget range' });
const message = trimmed.max(5000, 'Please keep the message under 5000 characters').optional().default('');

/** Shared by manual creation and the WordPress intake. */
const leadFields = { name, email, phone, service, budget, message };

export const createLeadSchema = z.object({
  ...leadFields,
  status: z.enum(LEAD_STATUS_VALUES).optional(),
  followUpAt: z.iso.datetime({ message: 'Follow-up must be a valid date' }).nullish(),
});

export const wordpressLeadSchema = z.object({
  ...leadFields,
  // Context the plugin adds. Never trusted for anything but display.
  wordpressId: z.coerce.number().int().positive().nullish(),
  siteUrl: trimmed.max(300).optional().default(''),
  pageUrl: trimmed.max(500).optional().default(''),
  submittedAt: z.iso.datetime().nullish(),
});

/**
 * A partial update. Every field is optional and — importantly — none of them
 * carry a default, so omitting `phone` leaves the stored number alone instead
 * of blanking it.
 */
export const updateLeadSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    phone: trimmed
      .max(40, 'That phone number is too long')
      .regex(/^[+()\-.\s\d]*$/, 'A phone number can only contain digits and + ( ) - .')
      .optional(),
    service: service.optional(),
    budget: budget.optional(),
    message: trimmed.max(5000, 'Please keep the message under 5000 characters').optional(),
    status: z.enum(LEAD_STATUS_VALUES, { message: 'That is not a valid status' }).optional(),
    followUpAt: z.iso.datetime({ message: 'Follow-up must be a valid date' }).nullish(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update' });

export const noteSchema = z.object({
  message: trimmed.min(1, 'A note cannot be empty').max(1000, 'Please keep notes under 1000 characters'),
});

export const loginSchema = z.object({
  email: trimmed.min(1, 'Enter your email address').pipe(z.email('Please enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});

export const listLeadsSchema = z.object({
  search: trimmed.max(120).optional().default(''),
  status: z.enum(LEAD_STATUS_VALUES).optional(),
  band: z.enum(SCORE_BAND_VALUES).optional(),
  source: z.enum(['wordpress', 'manual']).optional(),
  // "Needs follow-up": scheduled on or before today and not yet closed.
  followUp: z.enum(['due', 'scheduled', 'none']).optional(),
  sort: z.enum(['newest', 'oldest', 'score', 'name', 'followUp']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const objectIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'That lead identifier is not valid'),
});
