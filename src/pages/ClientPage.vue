<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, createOpportunity, deleteClient, getClient, updateClient } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import {
  crmStages,
  errorMessage,
  faDate,
  faMoney,
  faMoneyShort,
  leadSources,
  policyStatuses,
} from '../format';
import type { Client, ClientDraft, Policy } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';
import ClientForm from '../components/ClientForm.vue';
import PolicyDialog from '../components/PolicyDialog.vue';
import StatusBadge from '../components/StatusBadge.vue';

useMeta({ title: 'مشتری | اینشورهاب', meta: { robots: { name: 'robots', content: 'noindex' } } });

const route = useRoute();
const router = useRouter();
const requireAuth = useRequireAuth();
const id = Number(route.params.id);
const client = ref<Client | null>(null);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const editing = ref(false);
const addingPolicy = ref(false);
const editingPolicy = ref<Policy | null>(null);
const policyOpen = ref(false);
const draft = reactive<ClientDraft>({
  kind: 'person',
  name: '',
  national_id: null,
  phone: null,
  email: null,
  province: null,
  city: null,
  tags: [],
  notes: null,
});
const initial = computed<Partial<ClientDraft> | null>(() => (editing.value ? client.value : null));

async function save(): Promise<void> {
  busy.value = true;
  actionError.value = '';
  try {
    client.value = await updateClient(id, draft);
    editing.value = false;
  } catch (exception) {
    actionError.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}
async function remove(): Promise<void> {
  if (!window.confirm('این مشتری و همهٔ بیمه‌نامه‌هایش حذف شوند؟ این کار بازگشت‌پذیر نیست.'))
    return;
  await deleteClient(id);
  await router.push('/crm/clients');
}
async function newLead(): Promise<void> {
  if (!client.value) return;
  busy.value = true;
  try {
    const created = await createOpportunity(client.value.provider.slug, {
      title: `فرصت جدید — ${client.value.name}`,
      insurance_line: null,
      contact_name: client.value.name,
      contact_phone: client.value.phone,
      contact_email: client.value.email,
      estimated_premium: null,
      expected_close_date: null,
      client_id: client.value.id,
    });
    await router.push(`/crm/${created.id}`);
  } catch (exception) {
    actionError.value = errorMessage(exception);
  } finally {
    busy.value = false;
  }
}
function openPolicy(policy: Policy | null): void {
  editingPolicy.value = policy;
  addingPolicy.value = policy === null;
  policyOpen.value = true;
}
async function reload(): Promise<void> {
  client.value = await getClient(id);
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  try {
    await reload();
  } catch (exception) {
    error.value =
      exception instanceof ApiError && exception.status === 403
        ? 'این مشتری متعلق به شما نیست.'
        : 'مشتری پیدا نشد.';
  }
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <nav class="breadcrumb" aria-label="مسیر">
      <router-link to="/crm/clients">مشتریان</router-link>
      <q-icon name="chevron_left" />
      <span>{{ client?.name ?? 'مشتری' }}</span>
    </nav>
    <CrmNav />

    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!client" class="skeleton" style="height: 240px" />

    <template v-else>
      <header class="profile-head">
        <span class="tile tile--lg tone-teal">
          <q-icon :name="client.kind === 'company' ? 'domain' : 'person'" />
        </span>
        <div class="profile-head__body">
          <h1>{{ client.name }}</h1>
          <div class="profile-head__meta">
            {{ client.kind === 'company' ? 'شخص حقوقی' : 'شخص حقیقی' }}
            <template v-if="client.province"> · {{ client.province }}</template>
            <template v-if="client.city"> · {{ client.city }}</template>
            · {{ client.provider.name }}
          </div>
          <div v-if="client.tags.length" class="chips">
            <span v-for="tag in client.tags" :key="tag" class="chip">{{ tag }}</span>
          </div>
        </div>
        <div class="profile-head__actions">
          <button class="btn btn--outline" :disabled="busy" @click="newLead">
            <q-icon name="add_task" size="18px" />فرصت جدید
          </button>
          <button class="btn btn--primary" @click="openPolicy(null)">
            <q-icon name="note_add" size="18px" />ثبت بیمه‌نامه
          </button>
        </div>
      </header>
      <div v-if="actionError" class="notice notice--error">{{ actionError }}</div>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="description" />بیمه‌نامه‌ها</h2>
            <p v-if="!client.policies?.length" class="muted-text">
              هنوز بیمه‌نامه‌ای ثبت نشده است.
            </p>
            <div v-else class="compare-scroll">
              <table class="compare data-table">
                <thead>
                  <tr>
                    <th scope="col">رشته</th>
                    <th scope="col">شرکت بیمه</th>
                    <th scope="col">حق بیمه</th>
                    <th scope="col">اعتبار</th>
                    <th scope="col">وضعیت</th>
                    <th scope="col"><span class="sr-only">اقدام</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="policy in client.policies" :key="policy.id">
                    <td>
                      {{ policy.insurance_line }}
                      <small
                        v-if="policy.policy_number"
                        class="muted-text"
                        dir="ltr"
                        style="display: block"
                      >
                        {{ policy.policy_number }}
                      </small>
                    </td>
                    <td>{{ policy.insurer || '—' }}</td>
                    <td>{{ faMoneyShort(policy.premium) }}</td>
                    <td>{{ faDate(policy.starts_on) }} تا {{ faDate(policy.ends_on) }}</td>
                    <td><StatusBadge :status="policyStatuses[policy.status]" /></td>
                    <td>
                      <button
                        class="btn btn--ghost"
                        aria-label="ویرایش"
                        @click="openPolicy(policy)"
                      >
                        <q-icon name="edit" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="view_kanban" />فرصت‌ها</h2>
            <p v-if="!client.opportunities?.length" class="muted-text">
              فرصتی برای این مشتری نیست.
            </p>
            <router-link
              v-for="lead in client.opportunities"
              :key="lead.id"
              :to="`/crm/${lead.id}`"
              class="review-item"
            >
              <div>
                {{ lead.title }}
                <small
                  >{{ leadSources[lead.source] }} · {{ faMoney(lead.estimated_premium) }}</small
                >
              </div>
              <StatusBadge :status="crmStages[lead.stage]" />
            </router-link>
          </section>
        </div>

        <aside>
          <form v-if="editing" class="card" @submit.prevent="save">
            <h2><q-icon name="edit" />ویرایش مشتری</h2>
            <ClientForm v-model="draft" :initial="initial" />
            <div class="dialog-actions">
              <button type="button" class="btn btn--ghost" @click="editing = false">انصراف</button>
              <button class="btn btn--primary" :disabled="busy">ذخیره</button>
            </div>
          </form>
          <section v-else class="card">
            <h2><q-icon name="contact_page" />اطلاعات تماس</h2>
            <div class="kv">
              <b>{{ client.kind === 'company' ? 'شناسه ملی' : 'کد ملی' }}</b>
              <span dir="ltr">{{ client.national_id || '—' }}</span>
            </div>
            <div class="kv">
              <b>تلفن</b>
              <a v-if="client.phone" :href="`tel:${client.phone}`" class="link" dir="ltr">{{
                client.phone
              }}</a>
              <span v-else>—</span>
            </div>
            <div class="kv">
              <b>ایمیل</b>
              <a v-if="client.email" :href="`mailto:${client.email}`" class="link" dir="ltr">{{
                client.email
              }}</a>
              <span v-else>—</span>
            </div>
            <p v-if="client.notes" class="pre">{{ client.notes }}</p>
            <div class="dialog-actions">
              <button class="btn btn--ghost" style="color: var(--danger)" @click="remove">
                حذف
              </button>
              <button class="btn btn--outline" @click="editing = true">ویرایش</button>
            </div>
          </section>
        </aside>
      </div>

      <PolicyDialog
        v-model="policyOpen"
        :client-id="client.id"
        :client-name="client.name"
        :policy="addingPolicy ? null : editingPolicy"
        @saved="reload"
      />
    </template>
  </main>
  <SiteFooter />
</template>
