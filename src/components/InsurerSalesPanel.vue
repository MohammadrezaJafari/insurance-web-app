<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { insurerSales } from '../api';
import { actorTypes, faMoneyShort, faMonth, faNumber, faPercent, faDate } from '../format';
import type { Driver, InsurerSales } from '../types';

/** Sales of the insurer's verified network, from policies the insurer has confirmed. */
const props = defineProps<{ insurer: string }>();
const months = ref(12);
const data = ref<InsurerSales | null>(null);
const error = ref('');

const peak = computed(() =>
  Math.max(1, ...(data.value?.by_month.map((row) => row.premium) ?? [1])),
);
const linePeak = computed(() =>
  Math.max(1, ...(data.value?.by_line.map((row) => row.premium) ?? [1])),
);
const driverGroups = computed(() =>
  data.value
    ? [
        { title: 'رشته‌ها', rows: data.value.drivers.by_line },
        { title: 'نمایندگان', rows: data.value.drivers.by_agent },
        { title: 'استان‌ها', rows: data.value.drivers.by_province },
      ].filter((group) => group.rows.length)
    : [],
);

function signed(driver: Driver): string {
  return `${driver.delta > 0 ? '+' : '−'}${faMoneyShort(Math.abs(driver.delta)) || '۰'}`;
}
async function load(): Promise<void> {
  error.value = '';
  try {
    data.value = await insurerSales(props.insurer || undefined, months.value);
  } catch {
    error.value = 'دریافت آمار فروش ممکن نشد.';
  }
}

watch(() => props.insurer, load);
onMounted(load);
</script>

<template>
  <section aria-label="فروش شبکه">
    <div class="dashboard-head" style="margin-top: 0">
      <h2 class="section-title" style="margin: 0">فروش تأییدشدهٔ شبکه</h2>
      <select
        v-model.number="months"
        class="select"
        style="width: auto; margin: 0"
        aria-label="بازه"
        @change="load"
      >
        <option :value="3">۳ ماه اخیر</option>
        <option :value="6">۶ ماه اخیر</option>
        <option :value="12">۱۲ ماه اخیر</option>
        <option :value="24">۲۴ ماه اخیر</option>
      </select>
    </div>
    <div v-if="error" class="state state--error">{{ error }}</div>
    <div v-else-if="!data" class="skeleton" style="height: 260px" />
    <template v-else>
      <div class="kpi-row">
        <div class="kpi">
          <span>حق بیمهٔ فروش شبکه</span><b>{{ faMoneyShort(data.totals.premium) || '—' }}</b>
          <small class="muted-text">{{ faNumber(data.totals.policies) }} بیمه‌نامه</small>
        </div>
        <div class="kpi">
          <span>نرخ تمدید</span><b>{{ faPercent(data.totals.renewal_rate) }}</b>
        </div>
        <div class="kpi">
          <span>کارمزد قطعی</span><b>{{ faMoneyShort(data.totals.commission) || '—' }}</b>
        </div>
        <router-link
          :to="{ path: '/insurer/policies', query: { insurer } }"
          class="kpi"
          :class="{ 'kpi--alert': data.totals.awaiting_confirmation > 0 }"
        >
          <span>در انتظار تأیید شما</span><b>{{ faNumber(data.totals.awaiting_confirmation) }}</b>
          <small class="muted-text">
            {{ faNumber(data.totals.active_agents) }} از {{ faNumber(data.totals.network_size) }}
            نماینده فعال
          </small>
        </router-link>
      </div>

      <div class="profile-grid">
        <div>
          <section class="card">
            <h2><q-icon name="bar_chart" />روند ماهانه</h2>
            <div class="bars" :style="{ '--count': data.by_month.length }" role="list">
              <div
                v-for="month in data.by_month"
                :key="month.month"
                class="bars__col"
                role="listitem"
                :aria-label="`${faMonth(month.month)}: ${faMoneyShort(month.premium) || 'بدون فروش'}`"
                :title="`${faMonth(month.month)} · ${faNumber(month.policies)} بیمه‌نامه · ${faMoneyShort(month.premium) || '۰'}`"
              >
                <span class="bars__bar" :style="{ height: `${(month.premium / peak) * 100}%` }" />
                <small>{{
                  faMonth(month.month, month.month.endsWith('-01') || month === data.by_month[0])
                }}</small>
              </div>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="groups" />عملکرد فروش نمایندگان</h2>
            <p v-if="!data.agents.length" class="muted-text">
              نمایندهٔ دارای وابستگی بررسی‌شده‌ای نیست.
            </p>
            <div v-else class="compare-scroll">
              <table class="compare data-table">
                <thead>
                  <tr>
                    <th scope="col">نماینده</th>
                    <th scope="col">حق بیمه</th>
                    <th scope="col">بیمه‌نامه</th>
                    <th scope="col">نرخ تمدید</th>
                    <th scope="col">کارمزد</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="agent in data.agents" :key="agent.slug">
                    <td>
                      <router-link :to="`/profiles/${agent.slug}`" class="link">{{
                        agent.name
                      }}</router-link>
                      <small class="muted-text" style="display: block">
                        {{ actorTypes[agent.type].label
                        }}<template v-if="agent.province"> · {{ agent.province }}</template>
                      </small>
                    </td>
                    <td>{{ faMoneyShort(agent.premium) || '—' }}</td>
                    <td>{{ faNumber(agent.policies) }}</td>
                    <td>{{ faPercent(agent.renewal_rate) }}</td>
                    <td>{{ faMoneyShort(agent.commission) || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside>
          <section class="card">
            <h2><q-icon name="troubleshoot" />چرا تغییر کرد؟</h2>
            <p class="muted-text" style="margin: 0">
              سه ماه اخیر (از {{ faDate(data.drivers.current_from) }}) در برابر سه ماه پیش از آن
            </p>
            <div class="kv">
              <b>تغییر فروش</b>
              <span
                :style="{
                  color:
                    (data.drivers.change_percent ?? 0) < 0 ? 'var(--danger)' : 'var(--success)',
                  fontWeight: 700,
                }"
              >
                {{
                  data.drivers.change_percent === null
                    ? '—'
                    : `${data.drivers.change_percent > 0 ? '+' : ''}${faNumber(data.drivers.change_percent)}٪`
                }}
              </span>
            </div>
            <div class="kv">
              <b>قبل / بعد</b>
              <span
                >{{ faMoneyShort(data.drivers.previous) || '۰' }} ←
                {{ faMoneyShort(data.drivers.current) || '۰' }}</span
              >
            </div>
            <p v-if="data.drivers.narrative" class="pre" style="margin-top: 10px">
              {{ data.drivers.narrative }}
            </p>
            <p v-if="!driverGroups.length" class="muted-text">
              تغییر معناداری در این دو دوره نیست.
            </p>
            <div v-for="group in driverGroups" :key="group.title" style="margin-top: 10px">
              <small class="muted-text">بیشترین اثر · {{ group.title }}</small>
              <div v-for="row in group.rows" :key="row.name" class="kv" style="padding: 4px 0">
                <b>{{ row.name }}</b>
                <span
                  :style="{ color: row.delta < 0 ? 'var(--danger)' : 'var(--success)' }"
                  dir="ltr"
                >
                  {{ signed(row) }}
                </span>
              </div>
            </div>
          </section>

          <section class="card">
            <h2><q-icon name="category" />ترکیب رشته‌ها</h2>
            <p v-if="!data.by_line.length" class="muted-text">فروش تأییدشده‌ای در این بازه نیست.</p>
            <div v-for="line in data.by_line" :key="line.line" style="margin-bottom: 10px">
              <div class="kv" style="border: 0; padding: 0">
                <b>{{ line.line }}</b
                ><span>{{ faMoneyShort(line.premium) }}</span>
              </div>
              <div class="meter">
                <span :style="{ width: `${(line.premium / linePeak) * 100}%` }" />
              </div>
            </div>
          </section>

          <section v-if="data.incentives.length" class="card">
            <h2><q-icon name="emoji_events" />جشنواره‌های جاری</h2>
            <router-link
              v-for="program in data.incentives"
              :key="program.id"
              :to="`/insurer/incentives/${program.id}`"
              class="review-item"
            >
              <div>
                {{ program.title }}
                <small
                  >تا {{ faDate(program.ends_on) }} · {{ faNumber(program.reached_tier) }} نماینده
                  به پله رسیده</small
                >
              </div>
            </router-link>
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>
