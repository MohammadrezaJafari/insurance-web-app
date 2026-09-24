export type ActorType = 'insurer' | 'broker' | 'agency' | 'expert' | 'adjuster';

export interface License {
  type: string;
  number: string;
  authority: string | null;
  valid_until: string | null;
  verified_at: string;
}
export interface Source {
  name: string;
  url: string | null;
  observed_at: string;
}
export interface Affiliation {
  insurer_name: string;
  insurer_slug: string | null;
  role: string;
  started_at: string | null;
  verified_at: string;
}
export interface NetworkMember {
  name: string;
  slug: string;
  type: ActorType;
  province: string | null;
  role: string;
}
export interface Actor {
  type: ActorType;
  name: string;
  slug: string;
  description: string | null;
  province: string | null;
  city: string | null;
  insurance_lines: string[];
  specialties: string[];
  website: string | null;
  public_phone: string | null;
  owner_supplied_fields: string[];
  claimed: boolean;
  identity_verified: boolean;
  identity_verified_at: string | null;
  license_verified: boolean;
  indexable: boolean;
  licenses: License[];
  affiliations?: Affiliation[];
  network?: NetworkMember[];
  sources?: Source[];
  last_reviewed_at?: string | null;
}
export interface PaginatedActors {
  data: Actor[];
  meta: { current_page: number; last_page: number; total: number };
}
export interface Option {
  value: string;
  label: string;
}
export interface Taxonomy {
  actor_types: Option[];
  insurance_lines: string[];
  specialties: string[];
  provinces: string[];
  error_report_fields: Option[];
  removal_relations: Option[];
  owner_editable_fields: string[];
}
export interface DirectoryStats {
  total: number;
  verified: number;
  by_type: Partial<Record<ActorType, number>>;
}
export interface EditableFields {
  description: string | null;
  city: string | null;
  website: string | null;
  public_phone: string | null;
  specialties: string[] | null;
}
export interface OwnedProfile {
  name: string;
  slug: string;
  type: ActorType;
  published: boolean;
  views_30d: number;
  pending_changes: number;
  editable: EditableFields;
}
export interface ReviewItem {
  id: number;
  actor: string | null;
  slug: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'reverted';
  decision_note: string | null;
  created_at: string;
  fields?: string[];
}
export interface User {
  name: string;
  email: string;
}

export type RequestStatus =
  'draft' | 'submitted' | 'rejected' | 'open' | 'selected' | 'cancelled' | 'closed';
export type InvitationStatus =
  'invited' | 'accepted' | 'declined' | 'expired' | 'proposed' | 'closed';

export interface RequestField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'line' | 'date';
  required: boolean;
  options?: string[];
}
export interface RequestType {
  key: string;
  kind: 'insurance' | 'service';
  label: string;
  line: string | null;
  description: string;
  fields: RequestField[];
}
export interface RequestMeta {
  types: RequestType[];
  provinces: string[];
  insurance_lines: string[];
  decline_reasons: string[];
  outcome_reasons: string[];
  max_providers: number;
  attachment: { max_kb: number; mimes: string[] };
}
export type RequestDetails = Record<string, string | number | null>;

export interface RequestSummary {
  reference: string;
  request_type: string;
  kind?: 'insurance' | 'service';
  insurance_line: string;
  title: string;
  province: string;
  city: string | null;
  coverage_amount: number | null;
  status: RequestStatus;
  proposal_deadline_at: string | null;
  created_at: string;
  submitted_at: string | null;
  invitations_count?: number;
  proposals_count?: number;
}
export interface Attachment {
  id: number;
  name: string;
  size: number;
}
export interface Proposal {
  id: number;
  insurer_name: string | null;
  premium: number;
  coverage_amount: number | null;
  delivery_days: number | null;
  deductible: string | null;
  coverages: string;
  exclusions: string | null;
  services: string | null;
  valid_until: string;
  notes: string | null;
  status: 'submitted' | 'selected' | 'not_selected';
  revision: number;
  submitted_at: string;
  updated_at: string;
}
export interface Message {
  id: number;
  author_role: 'buyer' | 'provider';
  mine: boolean;
  body: string;
  created_at: string;
}
export interface BuyerInvitation {
  id: number;
  status: InvitationStatus;
  match_reasons: string[];
  decline_reason: string | null;
  conflict_declared: boolean | null;
  conflict_note: string | null;
  responded_at: string | null;
  provider: {
    name: string;
    slug: string;
    type: ActorType;
    province: string | null;
    identity_verified: boolean;
  };
  proposal: Proposal | null;
  messages: Message[];
}
export interface RequestDetail extends RequestSummary {
  description: string | null;
  details: RequestDetails;
  desired_start_date: string | null;
  operator_note: string | null;
  outcome_reason: string | null;
  policy_issued: boolean | null;
  selected_proposal_id: number | null;
  accepts_proposals: boolean;
  attachments: Attachment[];
  invitations: BuyerInvitation[];
  timeline: { status: RequestStatus; at: string }[];
}
export interface RequestDraft {
  request_type: string;
  title: string;
  province: string;
  city: string | null;
  coverage_amount: number | null;
  desired_start_date: string | null;
  description: string | null;
  details: RequestDetails;
}
export interface ProviderInvitation {
  id: number;
  status: InvitationStatus;
  match_reasons: string[];
  decline_reason: string | null;
  conflict_declared: boolean | null;
  conflict_note: string | null;
  invited_at: string;
  provider: { name: string; slug: string };
  request: {
    reference: string;
    request_type: string;
    kind: 'insurance' | 'service';
    insurance_line: string;
    title: string;
    province: string;
    city: string | null;
    coverage_amount: number | null;
    status: RequestStatus;
    proposal_deadline_at: string | null;
    accepts_proposals: boolean;
    desired_start_date: string | null;
    description: string | null;
    details: RequestDetails | null;
    attachments: Attachment[];
  };
  buyer: { name: string; email: string } | null;
  proposal: Proposal | null;
  messages: Message[];
}
export interface ProposalDraft {
  insurer_name: string | null;
  premium: number | null;
  coverage_amount: number | null;
  delivery_days: number | null;
  deductible: string | null;
  coverages: string;
  exclusions: string | null;
  services: string | null;
  valid_until: string | null;
  notes: string | null;
}

export type Stage = 'new' | 'contacted' | 'quoting' | 'negotiation' | 'won' | 'lost';
export interface OpportunityActivity {
  id: number;
  type: 'note' | 'call' | 'meeting' | 'email' | 'stage' | 'system';
  body: string;
  occurred_at: string;
  author: string | null;
}
export interface OpportunityReminder {
  id: number;
  body: string;
  due_at: string;
  completed_at: string | null;
}
export interface Opportunity {
  id: number;
  source: 'platform' | 'manual' | 'import';
  title: string;
  insurance_line: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  estimated_premium: number | null;
  stage: Stage;
  lost_reason: string | null;
  expected_close_date: string | null;
  last_activity_at: string | null;
  created_at: string;
  invitation_id: number | null;
  provider: { name: string; slug: string };
  next_reminder_at?: string | null;
  activities?: OpportunityActivity[];
  reminders?: OpportunityReminder[];
}
export interface OpportunityDraft {
  title: string;
  insurance_line: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  estimated_premium: number | null;
  expected_close_date: string | null;
}
export interface PipelineMeta {
  stage_counts: Partial<Record<Stage, number>>;
  open_value: number;
  due_reminders: number;
  lost_reasons: string[];
  profiles: { name: string; slug: string }[];
}
export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  path: string;
  read: boolean;
  created_at: string;
}
export interface NetworkMetrics {
  invitations: number;
  responded: number;
  response_rate: number | null;
  median_response_hours: number | null;
  proposals: number;
  selected: number;
}
export interface InsurerDashboard {
  insurer: { name: string; slug: string };
  insurers: { name: string; slug: string }[];
  period_days: number;
  totals: NetworkMetrics;
  agents: (NetworkMetrics & {
    name: string;
    slug: string;
    type: ActorType;
    province: string | null;
  })[];
  by_line: { line: string; invitations: number; proposals: number }[];
  recent: {
    agent: string | null;
    insurance_line: string;
    province: string;
    status: InvitationStatus;
    proposal_status: string | null;
    invited_at: string;
    response_hours: number | null;
  }[];
}

export type TenderStatus = 'draft' | 'open' | 'evaluation' | 'awarded' | 'cancelled';
export type OrgRole = 'owner' | 'manager' | 'evaluator' | 'viewer';
export interface Criterion {
  label: string;
  weight: number;
}
export interface TenderMeta {
  enabled: boolean;
  roles: Record<OrgRole, string>;
  criteria: Record<string, Criterion>;
  insurance_lines: string[];
  decline_reasons: string[];
  max_invitations: number;
  document: { max_kb: number; mimes: string[] };
}
export interface OrganizationSummary {
  id: number;
  name: string;
  role: OrgRole;
  tenders_count: number;
  members_count: number;
}
export interface OrganizationDetail {
  id: number;
  name: string;
  national_id: string | null;
  role: OrgRole;
  members: { id: number; name: string; email: string; role: OrgRole }[];
}
export interface TenderSummary {
  reference: string;
  title: string;
  insurance_line: string;
  status: TenderStatus;
  organization: { id: number; name: string };
  questions_deadline_at: string | null;
  submission_deadline_at: string | null;
  published_at: string | null;
  created_at: string;
  invitations_count?: number;
}
export interface TenderDocumentItem {
  id: number;
  title: string;
  versions: {
    id: number;
    version: number;
    name: string;
    size: number;
    change_note: string | null;
    uploaded_at: string;
  }[];
}
export interface TenderBid {
  id: number;
  insurer_name: string | null;
  premium: number;
  coverage_amount: number;
  deductible: string | null;
  coverages: string;
  exclusions: string | null;
  services: string | null;
  experience: string | null;
  valid_until: string;
  notes: string | null;
  status: 'submitted' | 'withdrawn' | 'awarded' | 'not_awarded';
  revision: number;
  submitted_at: string;
  updated_at: string;
}
export interface TenderDetail extends TenderSummary {
  description: string;
  coverage_amount: number | null;
  criteria: Record<string, Criterion>;
  role: OrgRole | null;
  can: { manage: boolean; evaluate: boolean };
  cancel_reason: string | null;
  decision_minutes: string | null;
  decided_at: string | null;
  awarded_bid_id: number | null;
  bids_unsealed: boolean;
  invitations: {
    id: number;
    status: 'invited' | 'accepted' | 'declined' | 'expired';
    conflict_declared: boolean | null;
    conflict_note: string | null;
    decline_reason: string | null;
    responded_at: string | null;
    provider: { name: string; slug: string; type: ActorType; province: string | null };
    has_bid: boolean | null;
  }[];
  documents: TenderDocumentItem[];
  questions: {
    id: number;
    question: string;
    answer: string | null;
    asked_by: string | null;
    asked_at: string;
    answered_at: string | null;
  }[];
  bids:
    | (TenderBid & {
        provider: { name: string; slug: string };
        evaluation: {
          averages: Record<string, number | null>;
          total: number | null;
          evaluators: number;
        } | null;
        my_scores: Record<string, { score: number; comment: string | null }>;
      })[]
    | null;
}
export interface TenderDraft {
  organization_id?: number | undefined;
  title: string;
  insurance_line: string;
  description: string;
  coverage_amount: number | null;
  questions_deadline_at: string | null;
  submission_deadline_at: string | null;
  weights: Record<string, number>;
}
export interface ProviderTender {
  id: number;
  status: 'invited' | 'accepted' | 'declined' | 'expired';
  conflict_declared: boolean | null;
  conflict_note: string | null;
  decline_reason: string | null;
  provider: { name: string; slug: string };
  tender: TenderSummary & {
    criteria: Record<string, Criterion>;
    coverage_amount: number | null;
    accepts_questions: boolean;
    accepts_bids: boolean;
    description: string | null;
    documents: TenderDocumentItem[];
  };
  questions: {
    id: number;
    question: string;
    answer: string | null;
    mine: boolean;
    asked_at: string;
    answered_at: string | null;
  }[];
  bid: TenderBid | null;
  result: 'won' | 'lost' | null;
  buyer_contact: { name: string; email: string }[] | null;
}
export interface ProviderTenderSummary {
  id: number;
  status: string;
  provider: string;
  bid_status: string | null;
  tender: TenderSummary;
}
export interface BidDraft {
  insurer_name: string | null;
  premium: number | null;
  coverage_amount: number | null;
  deductible: string | null;
  coverages: string;
  exclusions: string | null;
  services: string | null;
  experience: string | null;
  valid_until: string | null;
  notes: string | null;
}
