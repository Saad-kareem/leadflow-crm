/**
 * Types and configuration for the LeadFlow API.
 *
 * Only the slice of the API this page reads is typed — the summary endpoint
 * and the login response. Mirroring the whole Lead model here would be a
 * second copy of something this view never touches.
 */

export const API_URL = 'http://localhost:4000';

export interface StatusCounts {
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
}

export interface TopLead {
  id: string;
  name: string;
  email: string;
  service: string;
  status: keyof StatusCounts;
  score: number;
  scoreBand: 'hot' | 'warm' | 'cool' | 'cold';
}

export interface Summary {
  total: number;
  byStatus: StatusCounts;
  averageScore: number;
  winRate: number;
  topByScore: TopLead[];
}

export interface MetaOption {
  value: string;
  label: string;
}

export interface Meta {
  statuses: MetaOption[];
  services: MetaOption[];
}

/** The API's envelope: `{ success, data }` or `{ success, message }`. */
export interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}
