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
  start_date: string;
  end_date: string;
  entry_fee: number;
  status: string;
  created_at: string;
}

export interface TeamRow {
  id: string;
  event_id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  members_json: string;
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
