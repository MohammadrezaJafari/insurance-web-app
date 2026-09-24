import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
  { path: '/search', name: 'search', component: () => import('../pages/SearchPage.vue') },
  { path: '/profiles/:slug', name: 'profile', component: () => import('../pages/ProfilePage.vue') },
  {
    path: '/verification',
    name: 'verification',
    component: () => import('../pages/VerificationPage.vue'),
  },
  { path: '/account', name: 'account', component: () => import('../pages/AccountPage.vue') },
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
    path: '/provider/invitations/:id(\\d+)',
    name: 'provider-invitation',
    component: () => import('../pages/ProviderInvitationPage.vue'),
  },
  { path: '/:catchAll(.*)*', component: () => import('../pages/NotFoundPage.vue') },
];

export default routes;
