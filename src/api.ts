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

export const listActors = (params: URLSearchParams) =>
  request<PaginatedActors>(`/actors?${params.toString()}`);
export const getActor = async (slug: string): Promise<Actor> =>
  (await request<{ data: Actor }>(`/actors/${encodeURIComponent(slug)}`)).data;
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
