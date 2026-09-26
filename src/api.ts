import type {
  Actor,
  BidDraft,
  OrganizationDetail,
  OrganizationSummary,
  OrgRole,
  ProviderTender,
  ProviderTenderSummary,
  TenderDetail,
  TenderDraft,
  TenderMeta,
  TenderSummary,
  InsurerDashboard,
  NotificationItem,
  Opportunity,
  OpportunityDraft,
  PipelineMeta,
  Stage,
  Message,
  ProposalDraft,
  ProviderInvitation,
  RequestDetail,
  RequestDraft,
  RequestMeta,
  RequestSummary,
  DirectoryStats,
  EditableFields,
  OwnedProfile,
  PaginatedActors,
  ReviewItem,
  Taxonomy,
  User,
  Client,
  ClientDraft,
  ClientMeta,
  CrmReport,
  ImportResult,
  ProfileRef,
  Policy,
  PolicyDraft,
  PolicyMeta,
  AgentCommissions,
  CommissionAmount,
  CommissionRule,
  IncentiveDraft,
  IncentiveProgram,
  InsurerPolicy,
  PolicyConfirmation,
  Offer,
  OfferDraft,
  OfferMeta,
  InsurerSales,
  ProfileShowcaseItem,
  PublicReview,
  EligibleProvider,
  MarketRequest,
  ServiceDeliveryState,
  BillingOverview,
  BillingPlan,
  AssistantBriefing,
  GeneratedText,
  MarketInsightsReport,
  SponsoredCard,
  MyPlacement,
  Course,
  CourseDraft,
  ExamQuestion,
  LearningItem,
  Certificate,
  JobPosting,
  JobDraft,
  JobMeta,
  ResumeData,
  CertificateRef,
  TalentResume,
  Applicant,
} from './types';

export const TOKEN_KEY = 'insurehub_token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

function storedToken(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

function apiBase(): string {
  return import.meta.env.SSR ? process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000' : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  const token = storedToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${apiBase()}/api/v1${path}`, { ...options, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(response.status, body.message || 'درخواست انجام نشد.', body.errors || {});
  }
  return body as T;
}

const post = <T>(path: string, payload: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: JSON.stringify(payload) });
const patch = <T>(path: string, payload: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(payload) });

/** Private files need the bearer token, so they are fetched and saved as a blob. */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = storedToken();
  const response = await fetch(`/api/v1${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'دریافت فایل ممکن نشد.');
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
function uploadCsv(path: string, actorSlug: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('actor_slug', actorSlug);
  form.append('file', file);
  return request<ImportResult>(path, { method: 'POST', body: form });
}
const today = () => new Date().toISOString().slice(0, 10);

export const listActors = (params: URLSearchParams) =>
  request<PaginatedActors>(`/actors?${params.toString()}`);
export const getActor = async (slug: string, ref?: string): Promise<Actor> =>
  (
    await request<{ data: Actor }>(
      `/actors/${encodeURIComponent(slug)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`,
    )
  ).data;
export const getTaxonomy = () => request<Taxonomy>('/taxonomy');
export const getStats = () => request<DirectoryStats>('/stats');
export const getSitemap = () => request<{ slug: string; updated_at: string }[]>('/sitemap');

export const reportError = (
  slug: string,
  payload: {
    kind: 'correction' | 'removal';
    field?: string | undefined;
    relation?: string | undefined;
    message: string;
    contact?: string | undefined;
  },
) => post<{ message: string }>(`/actors/${encodeURIComponent(slug)}/reports`, payload);

export const register = (name: string, email: string, password: string) =>
  post<{ token: string; user: User }>('/register', {
    name,
    email,
    password,
    password_confirmation: password,
  });
export const login = (email: string, password: string) =>
  post<{ token: string; user: User }>('/login', { email, password });
export const logout = () => post<{ message: string }>('/logout', {});
export const me = () => request<User>('/me');

export const claimProfile = (slug: string, reason: string) =>
  post<{ status: string }>(`/actors/${encodeURIComponent(slug)}/claims`, { reason });
export const myClaims = () => request<ReviewItem[]>('/my-claims');
export const myProfiles = () => request<OwnedProfile[]>('/my/profiles');
export const myChangeRequests = () => request<ReviewItem[]>('/my/change-requests');
export const requestChange = (slug: string, changes: Partial<EditableFields>) =>
  post<{ status: string }>(`/my/profiles/${encodeURIComponent(slug)}/changes`, changes);

export const getRequestMeta = () => request<RequestMeta>('/request-types');
export const myRequests = () => request<RequestSummary[]>('/requests');
export const getRequest = async (reference: string): Promise<RequestDetail> =>
  (await request<{ data: RequestDetail }>(`/requests/${reference}`)).data;
export const createRequest = async (draft: RequestDraft): Promise<RequestDetail> =>
  (await post<{ data: RequestDetail }>('/requests', draft)).data;
export const updateRequest = async (
  reference: string,
  draft: RequestDraft,
): Promise<RequestDetail> =>
  (
    await request<{ data: RequestDetail }>(`/requests/${reference}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
  ).data;
const requestAction = async (
  reference: string,
  action: string,
  payload: unknown = {},
): Promise<RequestDetail> =>
  (await post<{ data: RequestDetail }>(`/requests/${reference}/${action}`, payload)).data;
export const submitRequest = (reference: string) => requestAction(reference, 'submit');
export const cancelRequest = (reference: string, reason: string) =>
  requestAction(reference, 'cancel', { reason });
export const selectProposal = (reference: string, proposalId: number) =>
  requestAction(reference, `proposals/${proposalId}/select`);
export const closeRequest = (reference: string, policyIssued: boolean) =>
  requestAction(reference, 'close', { policy_issued: policyIssued });
export const buyerMessage = (reference: string, invitationId: number, body: string) =>
  post<{ data: Message }>(`/requests/${reference}/invitations/${invitationId}/messages`, { body });

export function uploadAttachment(reference: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return request<{ id: number; name: string; size: number }>(`/requests/${reference}/attachments`, {
    method: 'POST',
    body: form,
  });
}
export const deleteAttachment = (reference: string, id: number) =>
  request<void>(`/requests/${reference}/attachments/${id}`, { method: 'DELETE' });

/** Private documents need the bearer token, so they are fetched as a blob and opened locally. */
export async function openAttachment(reference: string, id: number): Promise<void> {
  const token = storedToken();
  const response = await fetch(`/api/v1/requests/${reference}/attachments/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'دسترسی به این مدرک ممکن نیست.');
  const url = URL.createObjectURL(await response.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const providerInvitations = async (): Promise<ProviderInvitation[]> =>
  (await request<{ data: ProviderInvitation[] }>('/provider/invitations')).data;
export const getInvitation = async (id: number): Promise<ProviderInvitation> =>
  (await request<{ data: ProviderInvitation }>(`/provider/invitations/${id}`)).data;
const invitationAction = async (id: number, action: string, payload: unknown = {}) =>
  (await post<{ data: ProviderInvitation }>(`/provider/invitations/${id}/${action}`, payload)).data;
export const acceptInvitation = (
  id: number,
  conflictDeclared: boolean,
  conflictNote: string | null,
) =>
  invitationAction(id, 'accept', {
    conflict_declared: conflictDeclared,
    conflict_note: conflictNote,
  });
export const declineInvitation = (id: number, reason: string) =>
  invitationAction(id, 'decline', { reason });
export const submitProposal = (id: number, proposal: ProposalDraft) =>
  invitationAction(id, 'proposal', proposal);
export const providerMessage = (id: number, body: string) =>
  post<{ data: Message }>(`/provider/invitations/${id}/messages`, { body });

export const notifications = () =>
  request<{ unread: number; data: NotificationItem[] }>('/notifications');
export const markNotificationsRead = (ids?: string[]) =>
  post<{ unread: number }>('/notifications/read', ids ? { ids } : {});

export const listOpportunities = (params: URLSearchParams) =>
  request<{ data: Opportunity[]; meta: PipelineMeta }>(`/crm/opportunities?${params.toString()}`);
export const getOpportunity = (id: number) =>
  request<{ data: Opportunity; meta: { lost_reasons: string[] } }>(`/crm/opportunities/${id}`);
export const createOpportunity = async (actorSlug: string, draft: OpportunityDraft) =>
  (await post<{ data: Opportunity }>('/crm/opportunities', { actor_slug: actorSlug, ...draft }))
    .data;
export const updateOpportunity = async (id: number, draft: Partial<OpportunityDraft>) =>
  (
    await request<{ data: Opportunity }>(`/crm/opportunities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
  ).data;
export const changeStage = async (id: number, stage: Stage, lostReason: string | null) =>
  (
    await post<{ data: Opportunity }>(`/crm/opportunities/${id}/stage`, {
      stage,
      lost_reason: lostReason,
    })
  ).data;
export const logActivity = async (id: number, type: string, body: string) =>
  (await post<{ data: Opportunity }>(`/crm/opportunities/${id}/activities`, { type, body })).data;
export const addReminder = async (id: number, dueAt: string, body: string) =>
  (await post<{ data: Opportunity }>(`/crm/opportunities/${id}/reminders`, { due_at: dueAt, body }))
    .data;
export const completeReminder = async (id: number) =>
  (await post<{ data: Opportunity }>(`/crm/reminders/${id}/complete`, {})).data;
export function importOpportunities(actorSlug: string, file: File) {
  const form = new FormData();
  form.append('actor_slug', actorSlug);
  form.append('file', file);
  return request<{ created: number; errors: { row: number; message: string }[] }>('/crm/import', {
    method: 'POST',
    body: form,
  });
}
/** CSV export needs the bearer token, so it is fetched and saved as a blob. */
export async function exportOpportunities(): Promise<void> {
  const token = storedToken();
  const response = await fetch('/api/v1/crm/export', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'دریافت خروجی ممکن نشد.');
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `insurehub-opportunities-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const insurerDashboard = (slug?: string) =>
  request<InsurerDashboard>(`/insurer/dashboard${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`);

/** Resolves to null when organizational tenders are switched off on the server. */
export const tenderMeta = () => request<TenderMeta>('/tender-meta').catch(() => null);
export const myOrganizations = () => request<OrganizationSummary[]>('/organizations');
export const createOrganization = (name: string, nationalId: string | null) =>
  post<{ id: number; name: string }>('/organizations', { name, national_id: nationalId });
export const getOrganization = (id: number) => request<OrganizationDetail>(`/organizations/${id}`);
export const setMember = (id: number, email: string, role: OrgRole) =>
  post<OrganizationDetail>(`/organizations/${id}/members`, { email, role });
export const removeMember = (id: number, memberId: number) =>
  request<OrganizationDetail>(`/organizations/${id}/members/${memberId}`, { method: 'DELETE' });

export const myTenders = () => request<TenderSummary[]>('/tenders');
export const getTender = async (reference: string): Promise<TenderDetail> =>
  (await request<{ data: TenderDetail }>(`/tenders/${reference}`)).data;
export const createTender = async (draft: TenderDraft) =>
  (await post<{ data: TenderDetail }>('/tenders', draft)).data;
export const updateTender = async (reference: string, draft: TenderDraft) =>
  (
    await request<{ data: TenderDetail }>(`/tenders/${reference}`, {
      method: 'PATCH',
      body: JSON.stringify(draft),
    })
  ).data;
const tenderAction = async (reference: string, action: string, payload: unknown = {}) =>
  (await post<{ data: TenderDetail }>(`/tenders/${reference}/${action}`, payload)).data;
export const tenderCandidates = (reference: string, q: string) =>
  request<
    {
      name: string;
      slug: string;
      type: string;
      province: string | null;
      insurance_lines: string[];
    }[]
  >(`/tenders/${reference}/candidates?q=${encodeURIComponent(q)}`);
export const inviteToTender = (reference: string, slugs: string[]) =>
  tenderAction(reference, 'invitations', { slugs });
export const uninvite = async (reference: string, invitationId: number) =>
  (
    await request<{ data: TenderDetail }>(`/tenders/${reference}/invitations/${invitationId}`, {
      method: 'DELETE',
    })
  ).data;
export const publishTender = (reference: string) => tenderAction(reference, 'publish');
export const cancelTender = (reference: string, reason: string) =>
  tenderAction(reference, 'cancel', { reason });
export const answerQuestion = (reference: string, id: number, answer: string) =>
  tenderAction(reference, `questions/${id}/answer`, { answer });
export const scoreBid = (
  reference: string,
  bidId: number,
  scores: Record<string, { score: number; comment: string | null }>,
) => tenderAction(reference, `bids/${bidId}/scores`, { scores });
export const awardBid = (reference: string, bidId: number, minutes: string) =>
  tenderAction(reference, `bids/${bidId}/award`, { minutes });
export async function uploadTenderDocument(
  reference: string,
  file: File,
  options: { documentId?: number; title?: string; changeNote?: string },
): Promise<TenderDetail> {
  const form = new FormData();
  form.append('file', file);
  if (options.documentId) form.append('document_id', String(options.documentId));
  if (options.title) form.append('title', options.title);
  if (options.changeNote) form.append('change_note', options.changeNote);
  return (
    await request<{ data: TenderDetail }>(`/tenders/${reference}/documents`, {
      method: 'POST',
      body: form,
    })
  ).data;
}
/** Tender documents need the bearer token, so they are fetched as a blob and opened locally. */
export async function openTenderDocument(versionId: number): Promise<void> {
  const token = storedToken();
  const response = await fetch(`/api/v1/tender-documents/${versionId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'دسترسی به این سند ممکن نیست.');
  const url = URL.createObjectURL(await response.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const providerTenders = () => request<ProviderTenderSummary[]>('/provider/tenders');
export const getProviderTender = (id: number) => request<ProviderTender>(`/provider/tenders/${id}`);
export const respondTender = (
  id: number,
  payload: {
    accept: boolean;
    conflict_declared?: boolean;
    conflict_note?: string | null;
    decline_reason?: string | null;
  },
) => post<ProviderTender>(`/provider/tenders/${id}/respond`, payload);
export const askTender = (id: number, question: string) =>
  post<ProviderTender>(`/provider/tenders/${id}/questions`, { question });
export const submitTenderBid = (id: number, bid: BidDraft) =>
  post<ProviderTender>(`/provider/tenders/${id}/bid`, bid);
export const withdrawTenderBid = (id: number) =>
  post<ProviderTender>(`/provider/tenders/${id}/withdraw`, {});

export const listClients = (params: URLSearchParams) =>
  request<{ data: Client[]; meta: ClientMeta }>(`/crm/clients?${params.toString()}`);
export const getClient = async (id: number) =>
  (await request<{ data: Client }>(`/crm/clients/${id}`)).data;
export const createClient = async (actorSlug: string, draft: Partial<ClientDraft>) =>
  (await post<{ data: Client }>('/crm/clients', { actor_slug: actorSlug, ...draft })).data;
export const updateClient = async (id: number, draft: Partial<ClientDraft>) =>
  (await patch<{ data: Client }>(`/crm/clients/${id}`, draft)).data;
export const deleteClient = (id: number) =>
  request<{ message: string }>(`/crm/clients/${id}`, { method: 'DELETE' });
export const importClients = (actorSlug: string, file: File) =>
  uploadCsv('/crm/clients/import', actorSlug, file);
export const exportClients = () =>
  downloadFile('/crm/clients/export', `insurehub-clients-${today()}.csv`);

export const listPolicies = (params: URLSearchParams) =>
  request<{ data: Policy[]; meta: PolicyMeta }>(`/crm/policies?${params.toString()}`);
export const createPolicy = async (
  clientId: number,
  draft: PolicyDraft,
  opportunityId: number | null = null,
) =>
  (
    await post<{ data: Policy }>('/crm/policies', {
      client_id: clientId,
      opportunity_id: opportunityId,
      ...draft,
    })
  ).data;
export const updatePolicy = async (id: number, draft: Partial<PolicyDraft>) =>
  (await patch<{ data: Policy }>(`/crm/policies/${id}`, draft)).data;
export const cancelPolicy = async (id: number, reason: string) =>
  (await post<{ data: Policy }>(`/crm/policies/${id}/cancel`, { reason })).data;
export const importPolicies = (actorSlug: string, file: File) =>
  uploadCsv('/crm/policies/import', actorSlug, file);
export const exportPolicies = () =>
  downloadFile('/crm/policies/export', `insurehub-policies-${today()}.csv`);
export const crmReport = (months: number) => request<CrmReport>(`/crm/report?months=${months}`);

export const agentCommissions = () => request<AgentCommissions>('/crm/commissions');

const withInsurer = (path: string, insurer?: string) =>
  insurer ? `${path}${path.includes('?') ? '&' : '?'}insurer=${encodeURIComponent(insurer)}` : path;
export const insurerPolicies = (insurer: string | undefined, status: string) =>
  request<{
    insurer: ProfileRef;
    counts: Partial<Record<Exclude<PolicyConfirmation, null>, number>>;
    data: InsurerPolicy[];
  }>(withInsurer(`/insurer/policies?status=${status}`, insurer));
export const confirmPolicy = (id: number, note: string | null = null) =>
  post<{ confirmation: PolicyConfirmation; commission: CommissionAmount }>(
    `/insurer/policies/${id}/confirm`,
    { note },
  );
export const rejectPolicy = (id: number, note: string) =>
  post<{ confirmation: PolicyConfirmation }>(`/insurer/policies/${id}/reject`, { note });
export const commissionRules = (insurer?: string) =>
  request<{ insurer: ProfileRef; insurers: ProfileRef[]; data: CommissionRule[] }>(
    withInsurer('/insurer/commission-rules', insurer),
  );
export const createCommissionRule = (
  insurer: string,
  rule: Pick<CommissionRule, 'insurance_line' | 'rate' | 'valid_from' | 'valid_until' | 'note'>,
) => post<{ data: CommissionRule }>(withInsurer('/insurer/commission-rules', insurer), rule);
export const deleteCommissionRule = (id: number) =>
  request<{ message: string }>(`/insurer/commission-rules/${id}`, { method: 'DELETE' });
export const incentivePrograms = (insurer?: string) =>
  request<{ insurer: ProfileRef; data: IncentiveProgram[] }>(
    withInsurer('/insurer/incentives', insurer),
  );
export const getIncentive = async (id: number) =>
  (await request<{ data: IncentiveProgram }>(`/insurer/incentives/${id}`)).data;
export const createIncentive = async (insurer: string, draft: IncentiveDraft) =>
  (await post<{ data: IncentiveProgram }>(withInsurer('/insurer/incentives', insurer), draft)).data;
export const updateIncentive = async (id: number, draft: IncentiveDraft) =>
  (await patch<{ data: IncentiveProgram }>(`/insurer/incentives/${id}`, draft)).data;
export const deleteIncentive = (id: number) =>
  request<{ message: string }>(`/insurer/incentives/${id}`, { method: 'DELETE' });
export const incentiveAction = async (id: number, action: 'publish' | 'close') =>
  (await post<{ data: IncentiveProgram }>(`/insurer/incentives/${id}/${action}`, {})).data;

export const listOffers = async (params: URLSearchParams) =>
  (await request<{ data: Offer[] }>(`/offers?${params.toString()}`)).data;
export const getOffer = async (id: number) =>
  (await request<{ data: Offer }>(`/offers/${id}`)).data;
export const myPromotions = () => request<{ data: Offer[]; meta: OfferMeta }>('/my/promotions');
export const createPromotion = async (actorSlug: string, draft: OfferDraft) =>
  (await post<{ data: Offer }>('/my/promotions', { actor_slug: actorSlug, ...draft })).data;
export const updatePromotion = async (id: number, draft: OfferDraft) =>
  (await patch<{ data: Offer }>(`/my/promotions/${id}`, draft)).data;
export const deletePromotion = (id: number) =>
  request<{ message: string }>(`/my/promotions/${id}`, { method: 'DELETE' });
export const promotionAction = async (id: number, action: 'submit' | 'withdraw') =>
  (await post<{ data: Offer }>(`/my/promotions/${id}/${action}`, {})).data;

export const insurerSales = (insurer: string | undefined, months: number) =>
  request<InsurerSales>(withInsurer(`/insurer/sales?months=${months}`, insurer));

export const myShowcase = () =>
  request<{ data: ProfileShowcaseItem[]; meta: { kinds: Record<string, string> } }>(
    '/my/profile-items',
  );
export const saveShowcaseItem = async (
  actorSlug: string,
  item: Omit<ProfileShowcaseItem, 'id'>,
  id?: number,
) =>
  (id
    ? await patch<{ data: ProfileShowcaseItem }>(`/my/profile-items/${id}`, item)
    : await post<{ data: ProfileShowcaseItem }>('/my/profile-items', {
        actor_slug: actorSlug,
        ...item,
      })
  ).data;
export const deleteShowcaseItem = (id: number) =>
  request<{ message: string }>(`/my/profile-items/${id}`, { method: 'DELETE' });
export const withdrawShowcaseItem = (id: number) =>
  post<{ data: ProfileShowcaseItem }>(`/my/profile-items/${id}/withdraw`, {});
export const receivedReviews = async () =>
  (await request<{ data: PublicReview[] }>('/my/reviews')).data;
export const replyReview = (id: number, reply: string) =>
  post<{ data: PublicReview }>(`/my/reviews/${id}/reply`, { reply });
export const reviewRequest = (
  reference: string,
  review: { speed: number; expertise: number; service: number; comment: string | null },
) => post<{ data: { id: number; status: string } }>(`/requests/${reference}/review`, review);
export const fileComplaint = (
  slug: string,
  complaint: { category: string; body: string; request_reference: string | null },
) => post<{ data: { id: number } }>(`/actors/${encodeURIComponent(slug)}/complaints`, complaint);
export const myComplaints = () =>
  request<
    {
      id: number;
      profile: ProfileRef;
      category: string;
      status: string;
      resolution: string | null;
      created_at: string;
    }[]
  >('/my/complaints');

export function eligibleProviders(
  requestType: string,
  province: string,
  line: string | null,
  slugs: string[] = [],
) {
  const params = new URLSearchParams({ request_type: requestType, province });
  if (line) params.set('line', line);
  slugs.forEach((slug) => params.append('slugs[]', slug));
  return request<{ data: EligibleProvider[]; not_qualified: string[] }>(
    `/providers/eligible?${params.toString()}`,
  );
}
export const providerMarket = async () =>
  (await request<{ data: MarketRequest[] }>('/provider/market')).data;
export const joinMarketRequest = (
  reference: string,
  actorSlug: string,
  conflictDeclared: boolean,
  conflictNote: string | null,
) =>
  post<{ invitation_id: number }>(`/provider/market/${reference}/join`, {
    actor_slug: actorSlug,
    conflict_declared: conflictDeclared,
    conflict_note: conflictNote,
  });

export const scheduleVisit = (invitationId: number, visitAt: string) =>
  post<ServiceDeliveryState>(`/provider/invitations/${invitationId}/delivery/schedule`, {
    visit_at: visitAt,
  });
export function deliverReport(invitationId: number, file: File, note: string | null) {
  const form = new FormData();
  form.append('file', file);
  if (note) form.append('note', note);
  return request<ServiceDeliveryState>(`/provider/invitations/${invitationId}/delivery/report`, {
    method: 'POST',
    body: form,
  });
}
export const reviseDelivery = (reference: string, note: string) =>
  post<ServiceDeliveryState>(`/requests/${reference}/delivery/revise`, { note });
export const acceptDelivery = (reference: string) =>
  post<ServiceDeliveryState>(`/requests/${reference}/delivery/accept`, {});
/** Reports are private, so they are fetched with the bearer token and opened locally. */
export async function openDeliverable(reference: string, id: number): Promise<void> {
  const token = storedToken();
  const response = await fetch(`/api/v1/requests/${reference}/deliverables/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new ApiError(response.status, 'دسترسی به این گزارش ممکن نیست.');
  const url = URL.createObjectURL(await response.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export const billingPlans = () =>
  request<{ enforced: boolean; tax_rate: number; plans: BillingPlan[] }>('/billing/plans');
export const myBilling = () => request<BillingOverview>('/my/billing');
export const subscribe = (plan: string, period: 'monthly' | 'yearly', subject: string) =>
  post<{ subscription_id: number; status: string }>('/my/billing/subscribe', {
    plan,
    period,
    subject,
  });

export const assistantBriefing = () => request<AssistantBriefing>('/crm/assistant');
export const draftMessage = (payload: {
  purpose: 'renewal' | 'follow_up' | 'cross_sell';
  tone?: 'formal' | 'friendly';
  policy_id?: number;
  opportunity_id?: number;
  line?: string;
}) => post<GeneratedText>('/crm/assistant/draft', payload);
export const salesAnalysis = () => post<GeneratedText>('/crm/assistant/analysis', {});
export const draftContent = (topic: string, line: string | null, channel: string) =>
  post<GeneratedText>('/crm/assistant/content', { topic, line, channel });
export const marketInsights = (insurer: string | undefined, months: number) =>
  request<MarketInsightsReport>(withInsurer(`/insurer/market-insights?months=${months}`, insurer));

export const sponsored = async (
  placement: string,
  filters: Record<string, string | undefined> = {},
) => {
  const params = new URLSearchParams({ placement });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return (await request<{ data: SponsoredCard[] }>(`/placements?${params.toString()}`)).data;
};
export const clickSponsored = (id: number) => post<{ slug: string }>(`/placements/${id}/click`, {});
export const myPlacements = () =>
  request<{
    data: MyPlacement[];
    meta: {
      slots: Record<string, { label: string; price_30d: number }>;
      max_days: number;
      profiles: ProfileRef[];
    };
  }>('/my/placements');
export const createPlacement = (payload: {
  actor_slug: string;
  placement: string;
  headline: string;
  insurance_lines: string[];
  provinces: string[];
  starts_on: string;
  ends_on: string;
}) => post<{ id: number; price: number; status: string }>('/my/placements', payload);
export const withdrawPlacement = (id: number) =>
  post<{ status: string }>(`/my/placements/${id}/withdraw`, {});

export const listCourses = async (params: URLSearchParams) =>
  (await request<{ data: Course[] }>(`/courses?${params.toString()}`)).data;
export const getCourse = async (id: number) =>
  (await request<{ data: Course }>(`/courses/${id}`)).data;
export const enrollCourse = (id: number) =>
  post<{ id: number; status: string }>(`/courses/${id}/enroll`, {});
export const myLearning = () => request<LearningItem[]>('/my/learning');
export const getExam = (enrollmentId: number) =>
  request<{ pass_mark: number; questions: ExamQuestion[] }>(`/my/learning/${enrollmentId}/exam`);
export const submitExam = (enrollmentId: number, answers: (number | null)[]) =>
  post<{ score: number; passed: boolean; certificate_code: string | null }>(
    `/my/learning/${enrollmentId}/exam`,
    { answers },
  );
export const getCertificate = (code: string) =>
  request<Certificate>(`/certificates/${encodeURIComponent(code)}`);
export const myCourses = () =>
  request<{
    data: Course[];
    meta: {
      profiles: ProfileRef[];
      levels: Record<string, string>;
      formats: Record<string, string>;
    };
  }>('/my/courses');
export const saveCourse = (actorSlug: string, draft: CourseDraft, id?: number) =>
  id
    ? patch<{ id: number; status: string }>(`/my/courses/${id}`, draft)
    : post<{ id: number; status: string }>('/my/courses', { actor_slug: actorSlug, ...draft });
export const withdrawCourse = (id: number) =>
  post<{ status: string }>(`/my/courses/${id}/withdraw`, {});
export const saveExam = (id: number, passMark: number, questions: ExamQuestion[]) =>
  request<{ saved: boolean }>(`/my/courses/${id}/exam`, {
    method: 'PUT',
    body: JSON.stringify({ pass_mark: passMark, questions }),
  });
export const completeEnrollment = (courseId: number, enrollmentId: number) =>
  post<{ certificate_code: string }>(
    `/my/courses/${courseId}/enrollments/${enrollmentId}/complete`,
    {},
  );

export const listJobs = async (params: URLSearchParams) =>
  (await request<{ data: JobPosting[] }>(`/jobs?${params.toString()}`)).data;
export const getJob = async (id: number) =>
  (await request<{ data: JobPosting }>(`/jobs/${id}`)).data;
export const applyJob = (id: number, coverLetter: string | null) =>
  post<{ id: number }>(`/jobs/${id}/apply`, { cover_letter: coverLetter });
export const myResume = () =>
  request<{ data: ResumeData | null; certificates: CertificateRef[] }>('/my/resume');
export const saveResume = (resume: ResumeData) =>
  request<{ data: ResumeData }>('/my/resume', { method: 'PUT', body: JSON.stringify(resume) });
export const myApplications = () =>
  request<{ id: number; status: string; created_at: string; job: JobPosting }[]>(
    '/my/applications',
  );
export const jobMatches = async () =>
  (await request<{ data: JobPosting[] }>('/my/job-matches')).data;
export const talent = async (params: URLSearchParams) =>
  (await request<{ data: TalentResume[] }>(`/talent?${params.toString()}`)).data;
export const inviteTalent = (resumeId: number, jobId: number) =>
  post<{ invited: boolean }>(`/talent/${resumeId}/invite`, { job_id: jobId });
export const myJobs = () => request<{ data: JobPosting[]; meta: JobMeta }>('/my/jobs');
export const saveJob = (actorSlug: string, draft: JobDraft, id?: number) =>
  id
    ? patch<{ id: number; status: string }>(`/my/jobs/${id}`, draft)
    : post<{ id: number; status: string }>('/my/jobs', { actor_slug: actorSlug, ...draft });
export const withdrawJob = (id: number) => post<{ status: string }>(`/my/jobs/${id}/withdraw`, {});
export const jobApplicants = async (id: number) =>
  (await request<{ data: Applicant[] }>(`/my/jobs/${id}/applications`)).data;
export const decideApplicant = (jobId: number, applicationId: number, status: string) =>
  post<{ status: string }>(`/my/jobs/${jobId}/applications/${applicationId}/status`, { status });
