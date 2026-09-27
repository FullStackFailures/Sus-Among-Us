import { BugReportForm, ChangeRequestForm } from '../types';

export const BUG_TYPES = ['Glitch', 'Crash', 'Visual distortion', 'Sync issue', 'Data issue', 'Other'] as const;
export const BUG_AREAS = ['Mission UI', 'Crew Access', 'Sighting Flow', 'Crew Chat', 'Install / Launch', 'Other'] as const;
export const BUG_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;

export const SUGGESTION_TYPES = [
  'Feature',
  'Improvement',
  'Workflow',
  'Visual',
  'Performance',
] as const;

export const PRIORITIES = ['Low', 'Medium', 'High'] as const;

export const EMPTY_BUG_FORM: BugReportForm = {
  issueTitle: '',
  issueType: '',
  area: '',
  severity: '',
  problem: '',
  expectedBehavior: '',
  actualBehavior: '',
  deviceDetails: '',
  contactEmail: '',
};

export const EMPTY_REQUEST_FORM: ChangeRequestForm = {
  requestTitle: '',
  suggestionType: '',
  priority: '',
  summary: '',
  description: '',
  contactEmail: '',
};
