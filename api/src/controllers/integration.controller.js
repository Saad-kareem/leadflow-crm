import { Lead } from '../models/Lead.js';
import { findDuplicate } from '../domain/duplicates.js';

/** Powers the plugin's "Test connection" button in wp-admin. */
export const ping = (_req, res) => {
  res.json({ success: true, data: { service: 'leadflow-api', authenticated: true } });
};

/**
 * Intake for leads submitted through the WordPress form.
 *
 * A duplicate is *not* an error here. The visitor has already submitted the
 * form and is watching for a thank-you message; failing their submission
 * because the office already has their details would be a bug from their point
 * of view. So the API answers 200 with `duplicate: true`, and the plugin
 * records that outcome against its local row. The existing lead still gets a
 * timeline entry, because "they asked again" is genuinely useful to whoever
 * picks the conversation up.
 */
export const receiveWordPressLead = async (req, res) => {
  const { wordpressId, siteUrl, pageUrl, submittedAt, ...fields } = req.body;

  const existing = await findDuplicate(fields);

  if (existing) {
    existing.logActivity(
      'note',
      `Submitted the website form again${pageUrl ? ` from ${pageUrl}` : ''}`,
      'WordPress',
    );
    await existing.save();

    return res.status(200).json({
      success: true,
      data: {
        duplicate: true,
        leadId: existing._id.toString(),
        score: existing.score,
        message: 'Matched an existing lead',
      },
    });
  }

  const lead = new Lead({
    ...fields,
    source: 'wordpress',
    status: 'new',
    origin: { wordpressId: wordpressId ?? null, siteUrl, pageUrl },
  });

  lead.logActivity(
    'created',
    `Received from the website form${pageUrl ? ` (${pageUrl})` : ''}`,
    'WordPress',
  );

  // `submittedAt` is the time WordPress recorded. It is honoured so a lead that
  // syncs late — after a retry, say — still sorts by when the visitor actually
  // submitted it, not when the sync happened to succeed.
  if (submittedAt) lead.createdAt = new Date(submittedAt);

  await lead.save();

  return res.status(201).json({
    success: true,
    data: {
      duplicate: false,
      leadId: lead._id.toString(),
      score: lead.score,
      message: 'Lead created',
    },
  });
};
