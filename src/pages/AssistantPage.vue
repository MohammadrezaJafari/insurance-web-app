<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useMeta } from 'quasar';
import { assistantBriefing, draftContent, draftMessage, salesAnalysis } from '../api';
import { useRequireAuth } from '../composables/useRequireAuth';
import { useDirectoryStore } from '../stores/directory';
import {
  crmStages,
  errorMessage,
  faDate,
  faMoneyShort,
  faNumber,
  referralChannels,
} from '../format';
import type { AssistantBriefing, GeneratedText } from '../types';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';
import CrmNav from '../components/CrmNav.vue';

useMeta({
  title: 'دستیار فروش | اینشورهاب',
  meta: { robots: { name: 'robots', content: 'noindex' } },
});

const requireAuth = useRequireAuth();
const directory = useDirectoryStore();
const briefing = ref<AssistantBriefing | null>(null);
const error = ref('');
const busy = ref('');
const draft = ref<(GeneratedText & { for: string }) | null>(null);
const analysis = ref<GeneratedText | null>(null);
const content = reactive({
  topic: '',
  line: null as string | null,
  channel: 'instagram',
  result: null as GeneratedText | null,
});
const copied = ref(false);

async function run<T>(key: string, action: () => Promise<T>): Promise<T | null> {
  busy.value = key;
  error.value = '';
  try {
    return await action();
  } catch (exception) {
    error.value = errorMessage(exception, 'انجام نشد.');
    return null;
  } finally {
    busy.value = '';
  }
}
async function renewalDraft(policyId: number, client: string): Promise<void> {
  const result = await run(`r${policyId}`, () =>
    draftMessage({ purpose: 'renewal', policy_id: policyId }),
  );
  if (result) draft.value = { ...result, for: client };
}
async function crossDraft(line: string, client: string): Promise<void> {
  const result = await run(`c${client}${line}`, () =>
    draftMessage({ purpose: 'cross_sell', line }),
  );
  if (result) draft.value = { ...result, for: client };
}
async function followDraft(opportunityId: number, title: string): Promise<void> {
  const result = await run(`o${opportunityId}`, () =>
    draftMessage({ purpose: 'follow_up', opportunity_id: opportunityId }),
  );
  if (result) draft.value = { ...result, for: title };
}
async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text).catch(() => undefined);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

onMounted(async () => {
  if (!(await requireAuth())) return;
  const result = await run('load', assistantBriefing);
  briefing.value = result;
  await directory.loadTaxonomy().catch(() => undefined);
});
</script>

<template>
  <SiteHeader />
  <main class="container flow-page">
    <div class="dashboard-head">
      <div>
        <div class="eyebrow">مدیریت کسب‌وکار</div>
        <h1>دستیار فروش</h1>
      </div>
    </div>
    <CrmNav />
    <p class="muted-text" style="margin-top: -6px">
      پیشنهادها با قواعد روشن ساخته می‌شوند: سررسید تمدید، پوشش مکمل رایج و فرصت‌هایی که پیگیری
      نشده‌اند.
      <template v-if="briefing?.ai_enabled">
        متن پیام‌ها را مدل زبانی پیش‌نویس می‌کند؛ نام و اطلاعات تماس مشتری برای آن فرستاده نمی‌شود و
        پیش از ارسال باید متن را بازبینی کنید.
      </template>
    </p>
    <div v-if="error" class="notice notice--error">{{ error }}</div>
    <div v-if="!briefing" class="skeleton" style="height: 320px" />

    <template v-else>
      <section v-if="draft" class="card draft-box">
        <h2><q-icon name="edit_note" />پیش‌نویس پیام برای {{ draft.for }}</h2>
        <p class="pre">{{ draft.text }}</p>
        <div class="dialog-actions">
          <small class="muted-text">
            {{
              draft.generated ? 'نوشتهٔ دستیار هوشمند؛ پیش از ارسال بازبینی کنید.' : 'قالب آماده'
            }}
            · «{نام مشتری}» را جایگزین کنید.
          </small>
          <button class="btn btn--outline" @click="copy(draft.text)">
            {{ copied ? 'کپی شد ✓' : 'کپی متن' }}
          </button>
          <button class="btn btn--ghost" @click="draft = null">بستن</button>
        </div>
      </section>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="priority_high" />اولویت پیگیری امروز</h2>
            <p v-if="!briefing.priorities.length" class="muted-text">فرصت عقب‌افتاده‌ای ندارید.</p>
            <div v-for="item in briefing.priorities" :key="item.id" class="review-item">
              <div>
                <router-link :to="`/crm/${item.id}`" class="link">{{ item.title }}</router-link>
                <small>
                  {{ crmStages[item.stage]?.label }}
                  <template v-if="item.estimated_premium">
                    · {{ faMoneyShort(item.estimated_premium) }}</template
                  >
                  · {{ item.reasons.join('، ') }}
                </small>
              </div>
              <button
                class="btn btn--ghost"
                :disabled="busy !== ''"
                @click="followDraft(item.id, item.title)"
              >
                پیش‌نویس پیام
              </button>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="autorenew" />تمدیدهای ۴۵ روز آینده</h2>
            <p v-if="!briefing.renewals.length" class="muted-text">سررسید نزدیکی نیست.</p>
            <div v-for="item in briefing.renewals" :key="item.policy_id" class="review-item">
              <div>
                <router-link :to="`/crm/clients/${item.client.id}`" class="link">{{
                  item.client.name
                }}</router-link>
                <small>
                  {{ item.insurance_line }} · {{ faMoneyShort(item.premium) }} ·
                  {{ faDate(item.ends_on) }} ({{ faNumber(item.days_left) }} روز)
                </small>
              </div>
              <router-link
                v-if="item.opportunity"
                :to="`/crm/${item.opportunity.id}`"
                class="btn btn--ghost"
              >
                فرصت تمدید
              </router-link>
              <button
                class="btn btn--ghost"
                :disabled="busy !== ''"
                @click="renewalDraft(item.policy_id, item.client.name)"
              >
                پیش‌نویس پیام
              </button>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="add_shopping_cart" />پیشنهاد فروش مکمل</h2>
            <p v-if="!briefing.cross_sell.length" class="muted-text">پیشنهادی نیست.</p>
            <div
              v-for="item in briefing.cross_sell"
              :key="`${item.client.id}-${item.suggest}`"
              class="review-item"
            >
              <div>
                <router-link :to="`/crm/clients/${item.client.id}`" class="link">{{
                  item.client.name
                }}</router-link>
                <small>دارای {{ item.has }} · پیشنهاد: {{ item.suggest }}</small>
              </div>
              <button
                class="btn btn--ghost"
                :disabled="busy !== ''"
                @click="crossDraft(item.suggest, item.client.name)"
              >
                پیش‌نویس پیام
              </button>
            </div>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="insights" />تحلیل فروش شش ماه</h2>
            <p v-if="analysis" class="pre">{{ analysis.text }}</p>
            <button
              class="btn btn--outline btn--block"
              :disabled="busy !== ''"
              @click="run('a', salesAnalysis).then((r) => r && (analysis = r))"
            >
              {{ analysis ? 'تحلیل دوباره' : 'تحلیل کن' }}
            </button>
          </section>

          <form
            v-if="briefing.ai_enabled"
            class="card"
            @submit.prevent="
              run('t', () => draftContent(content.topic, content.line, content.channel)).then(
                (r) => r && (content.result = r),
              )
            "
          >
            <h2><q-icon name="campaign" />محتوای شبکه‌های اجتماعی</h2>
            <label class="field-label">
              موضوع<input
                v-model="content.topic"
                class="input"
                required
                minlength="5"
                maxlength="200"
                placeholder="مثلاً: فرق بیمهٔ بدنه و شخص ثالث"
              />
            </label>
            <div class="form-row">
              <label class="field-label">
                رشته
                <select v-model="content.line" class="select">
                  <option :value="null">عمومی</option>
                  <option v-for="line in directory.taxonomy?.insurance_lines ?? []" :key="line">
                    {{ line }}
                  </option>
                </select>
              </label>
              <label class="field-label">
                کانال
                <select v-model="content.channel" class="select">
                  <option v-for="(label, key) in referralChannels" :key="key" :value="key">
                    {{ label }}
                  </option>
                </select>
              </label>
            </div>
            <button class="btn btn--primary btn--block" :disabled="busy !== ''">
              نوشتن پیش‌نویس
            </button>
            <template v-if="content.result">
              <p class="pre" style="margin-top: 12px">{{ content.result.text }}</p>
              <button type="button" class="btn btn--ghost" @click="copy(content.result.text)">
                کپی
              </button>
            </template>
          </form>
        </aside>
      </div>
    </template>
  </main>
  <SiteFooter />
</template>
