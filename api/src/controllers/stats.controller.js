import { Lead } from '../models/Lead.js';
import {
  LEAD_SOURCE_VALUES,
  LEAD_STATUS_VALUES,
  SCORE_BAND_VALUES,
} from '../domain/constants.js';

/**
 * Turns `[{ _id: 'new', count: 3 }]` into `{ new: 3, contacted: 0, … }`.
 *
 * Zero-filling matters: the dashboard renders one card per status, and a
 * missing key would render an empty card rather than a card showing 0.
 */
const countsByKey = (rows, keys) => {
  const base = Object.fromEntries(keys.map((key) => [key, 0]));
  rows.forEach((row) => {
    if (row._id in base) base[row._id] = row.count;
  });
  return base;
};

const OPEN_STATUSES = ['new', 'contacted', 'qualified'];

/**
 * Every dashboard number in one round trip.
 *
 * `$facet` runs each sub-pipeline over the same scanned set, so the summary
 * costs one pass over the collection instead of the six separate queries the
 * cards would otherwise need. At agency scale this is not about raw speed — it
 * is about the cards never disagreeing with each other because they were read
 * at slightly different moments.
 */
export const getSummary = async (_req, res) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [facets] = await Lead.aggregate([
    {
      $facet: {
        total: [{ $count: 'value' }],
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        byBand: [{ $group: { _id: '$scoreBand', count: { $sum: 1 } } }],
        bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
        averageScore: [{ $group: { _id: null, value: { $avg: '$score' } } }],
        followUpsDue: [
          {
            $match: {
              followUpAt: { $ne: null, $lte: endOfToday },
              status: { $in: OPEN_STATUSES },
            },
          },
          { $count: 'value' },
        ],
        topByScore: [
          { $sort: { score: -1, createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              name: 1,
              email: 1,
              service: 1,
              status: 1,
              score: 1,
              scoreBand: 1,
              createdAt: 1,
            },
          },
        ],
        recent: [
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              id: { $toString: '$_id' },
              name: 1,
              email: 1,
              service: 1,
              status: 1,
              score: 1,
              scoreBand: 1,
              source: 1,
              createdAt: 1,
            },
          },
        ],
      },
    },
  ]);

  const total = facets.total[0]?.value ?? 0;
  const byStatus = countsByKey(facets.byStatus, LEAD_STATUS_VALUES);
  const closed = byStatus.won + byStatus.lost;

  res.json({
    success: true,
    data: {
      total,
      byStatus,
      byBand: countsByKey(facets.byBand, SCORE_BAND_VALUES),
      bySource: countsByKey(facets.bySource, LEAD_SOURCE_VALUES),
      averageScore: Math.round(facets.averageScore[0]?.value ?? 0),
      followUpsDue: facets.followUpsDue[0]?.value ?? 0,
      // Win rate over *decided* leads only. Dividing by every lead ever
      // received would drag the number down every time a new enquiry arrives,
      // which tells you nothing about how well the team is selling.
      winRate: closed ? Math.round((byStatus.won / closed) * 100) : 0,
      topByScore: facets.topByScore,
      recent: facets.recent,
    },
  });
};
