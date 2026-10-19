export interface Organizer {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  organizer_id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  cover_url: string;
  start_date: string;
  end_date: string;
  entry_fee: number;
  status: string;
  prizes: string;
  schedule: string;
  faq: string;
  highlight_video_url: string;
  // Phase-C monetization columns (added via ensureSettingsColumns(); may be
  // absent on very old rows — always read defensively).
  payment_instructions?: string | null;
  white_label?: number | null;
  custom_footer_text?: string | null;
  // Team-approval gating (added via migrate(); defaults to 0 on old rows).
  require_team_approval?: number | null;
  // Event branding/theming (added via ensureBrandingColumns(); may be
  // absent on very old rows — always read defensively).
  brand_color?: string | null;
  brand_logo_url?: string | null;
  brand_name?: string | null;
  // Event types (added via EVENT_COLUMN_ADDITIONS; may be absent on very
  // old DBs — always read defensively). 'hackathon' = team-based;
  // 'webinar' | 'seminar' | 'workshop' = individual registration.
  event_type?: string | null;
  meeting_link?: string | null;
  whatsapp_group_link?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRow {
  id: string;
  event_id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  members_json: string;
  approval_status?: string;
  checkin_code?: string;
  looking_for?: string | null;
  is_open?: number | null;
  invite_code?: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  team_id: string;
  title: string;
  description: string;
  demo_url: string;
  repo_url: string;
  pitch_text: string;
  created_at: string;
}

export interface SponsorRow {
  id: string;
  event_id: string;
  name: string;
  logo_url: string;
  tier: string;
  website: string;
}

export interface IndividualRegistrationRow {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  attended: number;
  reminder_sent: number;
  created_at: string;
}

/** Event types. 'hackathon' = team-based registration; the rest = individual. */
export const EVENT_TYPES = ['hackathon', 'webinar', 'seminar', 'workshop'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export function isIndividualEventType(eventType: string | null | undefined): boolean {
  return eventType === 'webinar' || eventType === 'seminar' || eventType === 'workshop';
}

export function eventTypeLabel(eventType: string | null | undefined): string {
  switch ((eventType ?? 'hackathon').toLowerCase()) {
    case 'webinar':
      return 'Webinar';
    case 'seminar':
      return 'Seminar';
    case 'workshop':
      return 'Workshop';
    default:
      return 'Hackathon';
  }
}
