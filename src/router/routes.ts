import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
  { path: '/search', name: 'search', component: () => import('../pages/SearchPage.vue') },
  { path: '/profiles/:slug', name: 'profile', component: () => import('../pages/ProfilePage.vue') },
  {
    path: '/profiles/:slug/card',
    name: 'profile-card',
    component: () => import('../pages/ProfileCardPage.vue'),
  },
  {
    path: '/verification',
    name: 'verification',
    component: () => import('../pages/VerificationPage.vue'),
  },
  { path: '/account', name: 'account', component: () => import('../pages/AccountPage.vue') },
  {
    path: '/account/billing',
    name: 'billing',
    component: () => import('../pages/BillingPage.vue'),
  },
  {
    path: '/account/placements',
    name: 'my-placements',
    component: () => import('../pages/MyPlacementsPage.vue'),
  },
  {
    path: '/account/showcase',
    name: 'showcase',
    component: () => import('../pages/ShowcasePage.vue'),
  },
  {
    path: '/account/promotions',
    name: 'my-promotions',
    component: () => import('../pages/MyPromotionsPage.vue'),
  },
  { path: '/offers', name: 'offers', component: () => import('../pages/OffersPage.vue') },
  { path: '/learn', name: 'learn', component: () => import('../pages/CoursesPage.vue') },
  { path: '/jobs', name: 'jobs', component: () => import('../pages/JobsPage.vue') },
  { path: '/jobs/:id(\\d+)', name: 'job', component: () => import('../pages/JobPage.vue') },
  { path: '/account/resume', name: 'resume', component: () => import('../pages/ResumePage.vue') },
  { path: '/account/jobs', name: 'my-jobs', component: () => import('../pages/MyJobsPage.vue') },
  { path: '/learn/:id(\\d+)', name: 'course', component: () => import('../pages/CoursePage.vue') },
  {
    path: '/certificates/:code',
    name: 'certificate',
    component: () => import('../pages/CertificatePage.vue'),
  },
  {
    path: '/account/learning',
    name: 'learning',
    component: () => import('../pages/LearningPage.vue'),
  },
  {
    path: '/account/courses',
    name: 'my-courses',
    component: () => import('../pages/MyCoursesPage.vue'),
  },
  {
    path: '/offers/:id(\\d+)',
    name: 'offer',
    component: () => import('../pages/OfferPage.vue'),
  },
  { path: '/requests', name: 'requests', component: () => import('../pages/RequestsPage.vue') },
  {
    path: '/requests/new',
    name: 'request-new',
    component: () => import('../pages/RequestFormPage.vue'),
  },
  {
    path: '/requests/:reference/edit',
    name: 'request-edit',
    component: () => import('../pages/RequestFormPage.vue'),
  },
  {
    path: '/requests/:reference',
    name: 'request',
    component: () => import('../pages/RequestDetailPage.vue'),
  },
  { path: '/tenders', name: 'tenders', component: () => import('../pages/TendersPage.vue') },
  {
    path: '/tenders/new',
    name: 'tender-new',
    component: () => import('../pages/TenderFormPage.vue'),
  },
  {
    path: '/tenders/:reference/edit',
    name: 'tender-edit',
    component: () => import('../pages/TenderFormPage.vue'),
  },
  {
    path: '/tenders/:reference/report',
    name: 'tender-report',
    component: () => import('../pages/TenderReportPage.vue'),
  },
  {
    path: '/tenders/:reference',
    name: 'tender',
    component: () => import('../pages/TenderPage.vue'),
  },
  {
    path: '/provider/tenders/:id(\\d+)',
    name: 'provider-tender',
    component: () => import('../pages/ProviderTenderPage.vue'),
  },
  { path: '/crm', name: 'crm', component: () => import('../pages/CrmPage.vue') },
  { path: '/crm/clients', name: 'clients', component: () => import('../pages/ClientsPage.vue') },
  {
    path: '/crm/clients/:id(\\d+)',
    name: 'client',
    component: () => import('../pages/ClientPage.vue'),
  },
  { path: '/crm/policies', name: 'policies', component: () => import('../pages/PoliciesPage.vue') },
  {
    path: '/crm/commissions',
    name: 'commissions',
    component: () => import('../pages/CommissionsPage.vue'),
  },
  {
    path: '/crm/assistant',
    name: 'assistant',
    component: () => import('../pages/AssistantPage.vue'),
  },
  {
    path: '/insurer/market',
    name: 'insurer-market',
    component: () => import('../pages/InsurerMarketPage.vue'),
  },
  {
    path: '/insurer/policies',
    name: 'insurer-policies',
    component: () => import('../pages/InsurerPoliciesPage.vue'),
  },
  {
    path: '/insurer/commissions',
    name: 'insurer-commissions',
    component: () => import('../pages/InsurerCommissionsPage.vue'),
  },
  {
    path: '/insurer/incentives',
    name: 'insurer-incentives',
    component: () => import('../pages/InsurerIncentivesPage.vue'),
  },
  {
    path: '/insurer/incentives/:id(\\d+)',
    name: 'insurer-incentive',
    component: () => import('../pages/InsurerIncentivePage.vue'),
  },
  {
    path: '/crm/report',
    name: 'crm-report',
    component: () => import('../pages/CrmReportPage.vue'),
  },
  {
    path: '/crm/:id(\\d+)',
    name: 'opportunity',
    component: () => import('../pages/OpportunityPage.vue'),
  },
  {
    path: '/insurer',
    name: 'insurer',
    component: () => import('../pages/InsurerDashboardPage.vue'),
  },
  {
    path: '/provider',
    name: 'provider',
    component: () => import('../pages/ProviderInboxPage.vue'),
  },
  {
    path: '/provider/market',
    name: 'provider-market',
    component: () => import('../pages/ProviderMarketPage.vue'),
  },
  {
    path: '/provider/invitations/:id(\\d+)',
    name: 'provider-invitation',
    component: () => import('../pages/ProviderInvitationPage.vue'),
  },
  { path: '/:catchAll(.*)*', component: () => import('../pages/NotFoundPage.vue') },
];

export default routes;
