export type ThemeName = 'light' | 'dark';
export type AuthMode = 'login' | 'signup' | 'recovery';
export type StatusFilter = 'all' | 'available' | 'not_seen' | 'mine';
export type SortMode = 'latest' | 'top';

export type Station = {
  id: number;
  name: string;
  lat: number;
  lon: number;
};

export type ReportPhotoAttachment = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

export type UpdateItem = {
  id: string;
  user_id?: string | null;
  created_at: string;
  tc_status: boolean;
  platform_note?: string | null;
  upvotes?: number | null;
  downvotes?: number | null;
  photo_url?: string | null;
  photo_path?: string | null;
  stations?: { name?: string | null } | null;
};

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  success: string;
  danger: string;
  chip: string;
  chipActive: string;
  shadow: string;
};

export type BugReportForm = {
  issueTitle: string;
  issueType: string;
  area: string;
  severity: string;
  problem: string;
  expectedBehavior: string;
  actualBehavior: string;
  deviceDetails: string;
  contactEmail: string;
};

export type ChangeRequestForm = {
  requestTitle: string;
  suggestionType: string;
  priority: string;
  summary: string;
  description: string;
  contactEmail: string;
};

export type BugReportRow = {
  id: string;
  created_at: string;
  user_id?: string | null;
  issue_title: string;
  issue_type?: string | null;
  area?: string | null;
  severity?: string | null;
  problem: string;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  device_details?: string | null;
  contact_email?: string | null;
  status?: string | null;
};

export type ChangeRequestRow = {
  id: string;
  created_at: string;
  user_id?: string | null;
  request_title: string;
  suggestion_type?: string | null;
  priority?: string | null;
  summary?: string | null;
  description?: string | null;
  contact_email?: string | null;
  status?: string | null;
};

export type TrackTalkMessageRow = {
  id: string;
  created_at: string;
  user_id?: string | null;
  display_name?: string | null;
  message: string;
};

export type TrackTalkForm = {
  message: string;
};
