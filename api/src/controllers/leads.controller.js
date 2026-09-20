import { Lead } from '../models/Lead.js';
import { ApiError } from '../utils/ApiError.js';
import { findDuplicate } from '../domain/duplicates.js';

const SORT_ORDERS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  score: { score: -1, createdAt: -1 },
  name: { name: 1 },
  followUp: { followUpAt: 1 },
};

/** Statuses that are still being worked; the rest are closed. */
const OPEN_STATUSES = ['new', 'contacted', 'qualified'];

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const buildFilter = ({ search, status, band, source, followUp }) => {
  const filter = {};

  if (status) filter.status = status;
  if (band) filter.scoreBand = band;
  if (source) filter.source = source;

  if (followUp === 'due') {
    // Overdue or due today, and only for leads still in play — chasing a lead
    // that was already marked Won is noise.
    filter.followUpAt = { $ne: null, $lte: endOfToday() };
    filter.status = status ? status : { $in: OPEN_STATUSES };
  } else if (followUp === 'scheduled') {
    filter.followUpAt = { $ne: null };
  } else if (followUp === 'none') {
    filter.followUpAt = null;
  }

  if (search) {
    // A prefix-anchored regex rather than `$text`, because the dashboard search
    // is used as an incremental type-ahead: `$text` only matches whole words,
    // so "ali" would not find "Alina" and the box would feel broken.
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  return filter;
};

export const listLeads = async (req, res) => {
  const { page, limit, sort } = req.query;
  const filter = buildFilter(req.query);

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort(SORT_ORDERS[sort] ?? SORT_ORDERS.newest)
      .skip((page - 1) * limit)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((lead) => lead.toPublicJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  });
};

export const getLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('That lead no longer exists');

  res.json({ success: true, data: { lead: lead.toPublicJSON({ includeDetail: true }) } });
};

export const createLead = async (req, res) => {
  const { followUpAt, status, ...fields } = req.body;

  const existing = await findDuplicate(fields);
  if (existing) {
    // 409 rather than a silent merge: the person adding the lead is sitting in
    // front of the dashboard and can decide what to do, and the response
    // carries enough of the existing lead for the UI to link straight to it.
    throw ApiError.conflict('A lead with this email or phone number already exists', {
      existingLead: existing.toPublicJSON(),
    });
  }

  const lead = new Lead({
    ...fields,
    source: 'manual',
    status: status ?? 'new',
    followUpAt: followUpAt ? new Date(followUpAt) : null,
  });

  lead.logActivity('created', `Lead added manually by ${req.user.name}`, req.user.name);
  if (followUpAt) {
    lead.logActivity('follow_up', `Follow-up set for ${new Date(followUpAt).toDateString()}`, req.user.name);
  }

  await lead.save();

  res.status(201).json({ success: true, data: { lead: lead.toPublicJSON({ includeDetail: true }) } });
};

export const updateLead = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('That lead no longer exists');

  const { status, followUpAt, ...fields } = req.body;
  const actor = req.user.name;

  if (status && status !== lead.status) {
    lead.logActivity('status_changed', `Status changed from ${lead.status} to ${status}`, actor);
    lead.status = status;
  }

  if (followUpAt !== undefined) {
    const nextDate = followUpAt ? new Date(followUpAt) : null;
    const changed = String(lead.followUpAt ?? '') !== String(nextDate ?? '');
    if (changed) {
      lead.followUpAt = nextDate;
      lead.logActivity(
        'follow_up',
        nextDate ? `Follow-up set for ${nextDate.toDateString()}` : 'Follow-up cleared',
        actor,
      );
    }
  }

  const changedFields = Object.entries(fields).filter(([field, value]) => lead[field] !== value);
  if (changedFields.length) {
    changedFields.forEach(([field, value]) => {
      lead[field] = value;
    });
    // The score is recalculated by the model itself on save, so editing a
    // budget in the dashboard re-scores the lead without the controller
    // knowing anything about the scoring rules.
    lead.logActivity('updated', `Updated ${changedFields.map(([field]) => field).join(', ')}`, actor);
  }

  await lead.save();

  res.json({ success: true, data: { lead: lead.toPublicJSON({ includeDetail: true }) } });
};

export const addNote = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) throw ApiError.notFound('That lead no longer exists');

  lead.logActivity('note', req.body.message, req.user.name);
  await lead.save();

  res.status(201).json({ success: true, data: { lead: lead.toPublicJSON({ includeDetail: true }) } });
};

export const deleteLead = async (req, res) => {
  const lead = await Lead.findByIdAndDelete(req.params.id);
  if (!lead) throw ApiError.notFound('That lead no longer exists');

  res.json({ success: true, data: { id: req.params.id } });
};
