import mongoose from 'mongoose';
import {
  BUDGET_VALUES,
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
  SCORE_BAND_VALUES,
  SERVICE_VALUES,
} from '../domain/constants.js';
import { calculateLeadScore } from '../domain/leadScore.js';
import { collapseWhitespace, normalizeEmail, normalizePhone } from '../domain/normalize.js';

/**
 * One entry in a lead's history. Kept as a subdocument rather than its own
 * collection: a timeline is only ever read with its lead, never across leads,
 * and it stays small (tens of entries at most over a lead's life).
 */
const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['created', 'status_changed', 'updated', 'note', 'follow_up'],
    },
    message: { type: String, required: true, trim: true },
    actor: { type: String, default: 'system', trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true },
);

const scoreFactorSchema = new mongoose.Schema(
  {
    key: String,
    label: String,
    points: Number,
    max: Number,
    reason: String,
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    // ---- What the visitor submitted -------------------------------------
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    service: { type: String, enum: SERVICE_VALUES, required: true },
    budget: { type: String, enum: BUDGET_VALUES, required: true },
    message: { type: String, trim: true, default: '', maxlength: 5000 },

    // ---- Matching keys ---------------------------------------------------
    // Derived from the fields above and never shown to a user. They exist so
    // duplicate detection is an indexed equality lookup instead of a regex scan.
    emailKey: { type: String, required: true, index: true },
    phoneKey: { type: String, default: '', index: true },

    // ---- CRM state -------------------------------------------------------
    status: { type: String, enum: LEAD_STATUS_VALUES, default: 'new', index: true },
    source: { type: String, enum: LEAD_SOURCE_VALUES, default: 'manual', index: true },

    // Follow-up date: the extra feature. Null means "nothing scheduled".
    followUpAt: { type: Date, default: null, index: true },

    // ---- Scoring ---------------------------------------------------------
    score: { type: Number, default: 0, min: 0, max: 100, index: true },
    scoreBand: { type: String, enum: SCORE_BAND_VALUES, default: 'cold', index: true },
    scoreFactors: { type: [scoreFactorSchema], default: [] },
    scoredAt: { type: Date, default: null },

    activity: { type: [activitySchema], default: [] },

    // Context the WordPress plugin sends along. Useful for support questions
    // ("which page did this come from?") and kept out of the main field list.
    origin: {
      wordpressId: { type: Number, default: null },
      siteUrl: { type: String, default: '' },
      pageUrl: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

/**
 * Text index backing `?search=`. Weighted so a match on a person's name ranks
 * above an incidental mention of the same word inside a long message.
 */
leadSchema.index(
  { name: 'text', email: 'text', message: 'text' },
  { weights: { name: 10, email: 6, message: 1 }, name: 'lead_search_idx' },
);

/** The dashboard's default view: newest first. */
leadSchema.index({ createdAt: -1 });

/**
 * Keeps the derived fields honest.
 *
 * Score and matching keys are recomputed from the submitted fields on every
 * save, so a lead edited in the dashboard cannot end up with a score that no
 * longer reflects its data. This is the only place scoring is triggered —
 * controllers never set `score` themselves.
 *
 * It hooks `validate` rather than `save` because Mongoose validates first:
 * `emailKey` is a required field, so it has to exist by the time validation
 * runs.
 */
leadSchema.pre('validate', function syncDerivedFields(next) {
  const scoringInputsChanged = ['name', 'email', 'phone', 'service', 'budget', 'message'].some(
    (field) => this.isModified(field),
  );

  if (this.isNew || scoringInputsChanged) {
    this.emailKey = normalizeEmail(this.email);
    this.phoneKey = normalizePhone(this.phone);
    this.name = collapseWhitespace(this.name);

    const { score, band, factors, scoredAt } = calculateLeadScore(this.toObject());
    this.score = score;
    this.scoreBand = band;
    this.scoreFactors = factors;
    this.scoredAt = scoredAt;
  }

  next();
});

leadSchema.methods.logActivity = function logActivity(type, message, actor = 'system') {
  this.activity.push({ type, message, actor, at: new Date() });
  return this;
};

/** The shape every client receives. Matching keys stay server-side. */
leadSchema.methods.toPublicJSON = function toPublicJSON({ includeDetail = false } = {}) {
  const base = {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    service: this.service,
    budget: this.budget,
    status: this.status,
    source: this.source,
    score: this.score,
    scoreBand: this.scoreBand,
    followUpAt: this.followUpAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };

  if (!includeDetail) return base;

  return {
    ...base,
    message: this.message,
    scoreFactors: this.scoreFactors,
    scoredAt: this.scoredAt,
    origin: this.origin,
    activity: [...this.activity]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .map((entry) => ({
        id: entry._id.toString(),
        type: entry.type,
        message: entry.message,
        actor: entry.actor,
        at: entry.at,
      })),
  };
};

export const Lead = mongoose.model('Lead', leadSchema);
