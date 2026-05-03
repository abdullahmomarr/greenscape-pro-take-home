export type LeadStatus = 'unprocessed' | 'draft_ready' | 'needs_manual' | 'sent' | 'rejected' | 'replied';
export type MessageStatus = 'pending_review' | 'flagged_for_manual' | 'approved' | 'rejected' | 'sent';
export type Channel = 'email' | 'sms';

export interface ClosedLostLead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  project_type: string | null;
  estimated_value: number | null;
  last_touch_date: string | null;
  notes: string | null;
  source: string | null;
  status: LeadStatus;
  created_at: string;
}

export interface GeneratedMessageDraft {
  subject: string | null;
  body: string;
  channel: Channel;
  confidence: number;
  reasoning: string;
  specific_details_referenced: string[];
}

export interface LLMResult extends GeneratedMessageDraft {
  model: string;
  cost_usd: number;
}
