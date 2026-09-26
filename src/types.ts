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
  office_address?: string | null;
  location?: { lat: number; lng: number } | null;
  established_year?: number | null;
  stock_symbol?: string | null;
  market?: InsurerMarket | null;
  official_network_size?: number;
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
  social_links?: Record<string, string>;
  services?: string[];
  items?: ProfileShowcaseItem[];
  reviews?: PublicReview[];
  score?: ProfessionalScore;
  offers?: {
    id: number;
    kind: 'service' | 'festival';
    title: string;
    ends_on: string;
    services: string[];
    discount_text: string | null;
  }[];
}
/** Figures بیمه مرکزی publishes about an insurer; money in rials, shares in percent. */
export interface InsurerMarket {
  year: string;
  premium: number | null;
  claims: number | null;
  loss_ratio: number | null;
  market_share: number | null;
  premium_rank: number | null;
  insurers_ranked: number;
  solvency_ratio: number | null;
  solvency_level: string | null;
  solvency_year: string | null;
  lines: { line: string; premium: number | null; claims: number | null }[];
  sources: { name: string; url: string | null; year: string }[];
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
  insurers: { name: string; slug: string }[];
  complaint_categories: string[];
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
  social_links: Record<string, string> | null;
  services: string[] | null;
}
export interface OwnedProfile {
  name: string;
  slug: string;
  type: ActorType;
  published: boolean;
  views_30d: number;
  channels_30d: Record<string, number>;
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
  visibility?: RequestVisibility;
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
  reviewed: boolean;
  max_providers: number;
  requested_providers: ProfileRef[];
  delivery: ServiceDeliveryState | null;
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
  visibility?: RequestVisibility;
  provider_slugs?: string[];
  promotion_id?: number | null;
  source_channel?: string | null;
  max_providers?: number | null;
}
export type RequestVisibility = 'matched' | 'invited' | 'public';
export interface EligibleProvider {
  name: string;
  slug: string;
  type: ActorType;
  province: string | null;
  identity_verified: boolean;
  reasons: string[];
}
export interface MarketRequest {
  reference: string;
  title: string;
  kind: 'insurance' | 'service';
  type_label: string | null;
  insurance_line: string;
  province: string;
  coverage_amount: number | null;
  proposal_deadline_at: string | null;
  seats_left: number;
  profiles: (ProfileRef & {
    reasons: string[];
    fit: { score: number; reasons: string[] } | null;
  })[];
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
  delivery: ServiceDeliveryState | null;
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
export type LeadSource = 'platform' | 'manual' | 'import' | 'renewal';
export interface Opportunity {
  id: number;
  source: LeadSource;
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
  client?: { id: number; name: string } | null;
  policy_id?: number | null;
  renewal_of?: { id: number; insurance_line: string; ends_on: string; premium: number } | null;
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
  client_id?: number | null;
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

export type ProfileRef = { name: string; slug: string };
export type ImportResult = { created: number; errors: { row: number; message: string }[] };

/** null when the policy is not tied to an insurer on InsureHub. */
export type PolicyConfirmation = 'self_reported' | 'confirmed' | 'rejected' | null;
export type PolicyStatus = 'active' | 'renewed' | 'expired' | 'cancelled';
export interface Policy {
  id: number;
  client: { id: number; name: string; phone: string | null } | null;
  provider: ProfileRef | null;
  insurer: string | null;
  insurer_slug: string | null;
  insurance_line: string;
  policy_number: string | null;
  premium: number;
  starts_on: string;
  ends_on: string;
  days_left: number | null;
  status: PolicyStatus;
  cancel_reason: string | null;
  opportunity_id: number | null;
  renewed_from_id: number | null;
  renewal_opportunity: { id: number; stage: Stage | null } | null;
  confirmation: PolicyConfirmation;
  confirmation_note: string | null;
  commission: number | null;
}
export interface PolicyDraft {
  insurance_line: string;
  insurer_slug: string | null;
  insurer_name: string | null;
  policy_number: string | null;
  premium: number | null;
  starts_on: string | null;
  ends_on: string | null;
}
export interface PolicyMeta {
  statuses: Record<PolicyStatus, string>;
  cancel_reasons: string[];
  renewal_window_days: number;
  due_count: number;
  active_premium: number;
  active_count: number;
}
export interface Client {
  id: number;
  kind: 'person' | 'company';
  name: string;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  province: string | null;
  city: string | null;
  tags: string[];
  notes: string | null;
  provider: ProfileRef;
  active_policies?: number;
  active_premium?: number;
  next_end?: string | null;
  policies?: Policy[];
  opportunities?: {
    id: number;
    title: string;
    stage: Stage;
    source: LeadSource;
    estimated_premium: number | null;
  }[];
}
export type ClientDraft = Pick<
  Client,
  'kind' | 'name' | 'national_id' | 'phone' | 'email' | 'province' | 'city' | 'tags' | 'notes'
>;
export interface ClientMeta {
  total: number;
  tags: string[];
  kinds: Record<string, string>;
  profiles: ProfileRef[];
}
export interface CrmReport {
  months: number;
  from: string;
  totals: {
    clients: number;
    active_policies: number;
    active_premium: number;
    sold_premium: number;
    sold_policies: number;
    conversion_rate: number | null;
    renewal_rate: number | null;
    renewals_due: number;
  };
  by_month: { month: string; policies: number; premium: number }[];
  by_line: { line: string; policies: number; premium: number }[];
  by_source: { source: LeadSource; leads: number; won: number; lost: number }[];
  lost_reasons: { reason: string; count: number }[];
}

export interface CommissionAmount {
  rate: number | null;
  amount: number | null;
  final: boolean;
}
export interface IncentiveTier {
  threshold: number;
  reward: string;
}
export type IncentiveStatus = 'draft' | 'published' | 'closed';
export interface IncentiveProgram {
  id: number;
  insurer: ProfileRef | null;
  title: string;
  description: string | null;
  insurance_lines: string[];
  metric: 'premium' | 'policies';
  starts_on: string;
  ends_on: string;
  tiers: IncentiveTier[];
  status: IncentiveStatus;
  published_at: string | null;
  standings?: {
    actor_id: number;
    name: string;
    slug: string;
    confirmed: number;
    pending: number;
    tier: IncentiveTier | null;
  }[];
  progress?: {
    confirmed: number;
    pending: number;
    tier: IncentiveTier | null;
    next_tier: IncentiveTier | null;
    rank: number | null;
    participants: number;
  };
}
export type IncentiveDraft = Pick<
  IncentiveProgram,
  'title' | 'description' | 'insurance_lines' | 'metric' | 'starts_on' | 'ends_on' | 'tiers'
>;
export interface AgentCommissions {
  totals: { confirmed: number; pending: number; awaiting_confirmation: number; rejected: number };
  by_insurer: {
    insurer: ProfileRef;
    confirmed: number;
    pending: number;
    policies: number;
    without_rule: number;
  }[];
  policies: {
    id: number;
    client: string;
    client_id: number;
    insurer: string;
    insurance_line: string;
    policy_number: string | null;
    premium: number;
    starts_on: string;
    confirmation: PolicyConfirmation;
    confirmation_note: string | null;
    commission: CommissionAmount;
  }[];
  incentives: IncentiveProgram[];
}
export interface CommissionRule {
  id: number;
  insurance_line: string | null;
  rate: number;
  valid_from: string;
  valid_until: string | null;
  note: string | null;
  active: boolean;
}
export interface InsurerPolicy {
  id: number;
  agent: ProfileRef;
  insurance_line: string;
  policy_number: string | null;
  premium: number;
  starts_on: string;
  ends_on: string;
  confirmation: PolicyConfirmation;
  confirmation_note: string | null;
  commission: CommissionAmount;
  reported_at: string;
}

export type ModerationStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'withdrawn';
export interface Offer {
  id: number;
  kind: 'service' | 'festival';
  title: string;
  body: string;
  insurance_lines: string[];
  provinces: string[];
  services: string[];
  discount_text: string | null;
  regulatory_reference: string | null;
  starts_on: string;
  ends_on: string;
  provider: {
    name: string;
    slug: string;
    type: ActorType;
    province: string | null;
    verified: boolean;
  } | null;
  status?: ModerationStatus;
  review_note?: string | null;
  views?: number;
  inquiries?: number;
}
export type OfferDraft = Pick<
  Offer,
  | 'kind'
  | 'title'
  | 'body'
  | 'insurance_lines'
  | 'provinces'
  | 'services'
  | 'discount_text'
  | 'regulatory_reference'
  | 'starts_on'
  | 'ends_on'
>;
export interface OfferMeta {
  profiles: { name: string; slug: string; type: ActorType; can_discount: boolean }[];
  kinds: Record<string, string>;
  services: string[];
  max_days: number;
}

export interface Driver {
  name: string;
  delta: number;
}
export interface InsurerSales {
  insurer: ProfileRef;
  months: number;
  totals: {
    premium: number;
    policies: number;
    commission: number;
    renewal_rate: number | null;
    awaiting_confirmation: number;
    active_agents: number;
    network_size: number;
  };
  by_month: { month: string; premium: number; policies: number }[];
  by_line: { line: string; premium: number; policies: number }[];
  agents: {
    name: string;
    slug: string;
    type: ActorType;
    province: string | null;
    premium: number;
    policies: number;
    commission: number;
    renewal_rate: number | null;
  }[];
  drivers: {
    current_from: string;
    previous_from: string;
    current: number;
    previous: number;
    change_percent: number | null;
    by_line: Driver[];
    by_agent: Driver[];
    by_province: Driver[];
    narrative?: string | null;
  };
  incentives: { id: number; title: string; ends_on: string; reached_tier: number }[];
}

export interface ProfileShowcaseItem {
  id: number;
  kind: 'project' | 'achievement' | 'article';
  title: string;
  body: string | null;
  year: number | null;
  insurance_line: string | null;
  url: string | null;
  status?: ModerationStatus;
  review_note?: string | null;
  profile?: ProfileRef;
}
export interface PublicReview {
  id: number;
  speed: number;
  expertise: number;
  service: number;
  average: number;
  comment: string | null;
  author: string | null;
  line: string | null;
  published_at: string | null;
  reply: string | null;
  replied_at: string | null;
  profile?: ProfileRef;
}
export interface ProfessionalScore {
  score: number | null;
  components: {
    key: string;
    label: string;
    weight: number;
    value: number | null;
    detail: string | null;
  }[];
  reviews: {
    count: number;
    shown: boolean;
    average: number | null;
    axes: Record<'speed' | 'expertise' | 'service', number | null>;
  };
  complaints_upheld: number;
}

export interface ServiceDeliveryState {
  status: 'scheduled' | 'delivered' | 'revision' | 'accepted' | null;
  visit_at: string | null;
  delivered_at: string | null;
  revision_note: string | null;
  deliverables: {
    id: number;
    version: number;
    name: string;
    size: number;
    note: string | null;
    created_at: string;
  }[];
}

export interface BillingPlan {
  key: string;
  label: string;
  audience: 'provider' | 'specialist' | 'insurer' | 'organization';
  price_monthly: number;
  price_yearly: number;
  features: string[];
  summary: string;
}
export interface BillingOverview {
  subjects: { key: string; name: string; kind: string }[];
  subscriptions: {
    id: number;
    plan: string;
    label: string;
    period: 'monthly' | 'yearly';
    status: 'pending_payment' | 'active' | 'expired' | 'cancelled';
    starts_at: string | null;
    ends_at: string | null;
    subject: { key: string; name: string; kind: string };
  }[];
  invoices: {
    id: number;
    number: string;
    kind: string;
    description: string;
    amount: number;
    tax: number;
    total: number;
    status: 'issued' | 'paid' | 'void';
    due_at: string | null;
    paid_at: string | null;
    created_at: string;
  }[];
  payment_instructions: string;
}

export interface AssistantBriefing {
  ai_enabled: boolean;
  renewals: {
    policy_id: number;
    client: { id: number; name: string };
    insurance_line: string;
    premium: number;
    ends_on: string;
    days_left: number;
    opportunity: { id: number; stage: Stage } | null;
  }[];
  cross_sell: { client: { id: number; name: string }; has: string; suggest: string }[];
  priorities: {
    id: number;
    title: string;
    stage: Stage;
    estimated_premium: number | null;
    score: number;
    reasons: string[];
  }[];
}
export interface GeneratedText {
  text: string;
  generated: boolean;
}
export interface MarketInsightsReport {
  insurer: ProfileRef;
  months: number;
  min_group: number;
  total: number | null;
  by_line: {
    line: string;
    requests: number;
    decided_rate: number | null;
    median_proposals: number | null;
  }[];
  by_province: {
    province: string;
    requests: number;
    decided_rate: number | null;
    median_proposals: number | null;
  }[];
  by_month: { month: string; requests: number | null }[];
  suppressed_note: string;
}

export interface SponsoredCard {
  id: number;
  headline: string;
  provider: {
    name: string;
    slug: string;
    type: ActorType;
    province: string | null;
    insurance_lines: string[];
    license_verified: boolean;
    identity_verified: boolean;
  };
}
export interface MyPlacement {
  id: number;
  placement: string;
  headline: string;
  price: number;
  status: ModerationStatus;
  review_note: string | null;
  impressions: number;
  clicks: number;
  insurance_lines: string[];
  provinces: string[];
  starts_on: string;
  ends_on: string;
  paid: boolean;
  profile: ProfileRef;
}

export interface Course {
  id: number;
  title: string;
  summary: string;
  body?: string | null;
  level: 'basic' | 'intermediate' | 'advanced';
  format: 'online' | 'in_person' | 'hybrid';
  city: string | null;
  url: string | null;
  starts_on: string | null;
  duration_hours: number;
  price: number;
  capacity: number | null;
  seats_left: number | null;
  insurance_lines: string[];
  has_exam: boolean;
  provider: { name: string; slug: string; type: ActorType } | null;
  enrollment?: { id: number; status: string; certificate_code: string | null } | null;
  status?: ModerationStatus;
  review_note?: string | null;
  exam?: { pass_mark: number; questions: ExamQuestion[] } | null;
  enrollments?: {
    id: number;
    status: string;
    name: string;
    email: string;
    completed_at: string | null;
  }[];
}
export interface ExamQuestion {
  question: string;
  options: string[];
  answer?: number;
}
export type CourseDraft = Pick<
  Course,
  | 'title'
  | 'summary'
  | 'body'
  | 'level'
  | 'format'
  | 'city'
  | 'url'
  | 'starts_on'
  | 'duration_hours'
  | 'price'
  | 'capacity'
  | 'insurance_lines'
>;
export interface LearningItem {
  id: number;
  status: 'pending_payment' | 'enrolled' | 'completed' | 'cancelled';
  certificate_code: string | null;
  completed_at: string | null;
  attempts_left: number;
  best_score: number | null;
  course: Course;
}
export interface Certificate {
  code: string;
  holder: string;
  course: string;
  duration_hours: number;
  provider: ProfileRef;
  completed_at: string;
}

export interface JobPosting {
  id: number;
  title: string;
  role: string;
  employment_type: string;
  province: string | null;
  city: string | null;
  remote: boolean;
  insurance_lines: string[];
  salary_text: string | null;
  expires_on: string;
  published_at: string | null;
  employer: { name: string; slug: string; type: ActorType } | null;
  description?: string;
  requirements?: string | null;
  applied?: boolean;
  fit?: number;
  status?: ModerationStatus;
  review_note?: string | null;
  applications_count?: number;
}
export type JobDraft = Pick<
  JobPosting,
  | 'title'
  | 'role'
  | 'employment_type'
  | 'province'
  | 'city'
  | 'remote'
  | 'insurance_lines'
  | 'salary_text'
  | 'expires_on'
> & { description: string; requirements: string | null };
export interface ResumeExperience {
  title: string;
  organization: string;
  from_year: number | null;
  to_year: number | null;
  description: string | null;
}
export interface ResumeData {
  headline: string;
  summary: string | null;
  province: string | null;
  city: string | null;
  years_experience: number;
  insurance_lines: string[];
  roles: string[];
  experience: ResumeExperience[];
  visibility: 'public' | 'private';
}
export interface CertificateRef {
  code: string;
  course: string;
  completed_at: string;
}
export interface TalentResume extends Omit<ResumeData, 'visibility'> {
  id: number;
  name: string;
  certificates: CertificateRef[];
}
export interface Applicant {
  id: number;
  status: string;
  cover_letter: string | null;
  created_at: string;
  name: string;
  email: string;
  resume: TalentResume | null;
  certificates: CertificateRef[];
}
export interface JobMeta {
  profiles: ProfileRef[];
  roles: Record<string, string>;
  employment_types: Record<string, string>;
  application_statuses: Record<string, string>;
  max_days: number;
}
