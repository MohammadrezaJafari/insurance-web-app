<script setup lang="ts">
import { useMeta } from 'quasar';
import SiteHeader from '../components/SiteHeader.vue';
import SiteFooter from '../components/SiteFooter.vue';

useMeta({
  title: 'معنای نشان‌های تأیید | اینشورهاب',
  meta: {
    description: {
      name: 'description',
      content: 'هر نشان در اینشورهاب دقیقاً چه چیزی را تأیید می‌کند و چه چیزی را نه.',
    },
  },
});
</script>

<template>
  <SiteHeader />
  <main class="container prose-page">
    <div class="eyebrow">شفافیت داده</div>
    <h1>هر نشان دقیقاً چه معنایی دارد؟</h1>
    <p class="lead">
      در اینشورهاب «وجود پروفایل»، «تأیید صاحب پروفایل» و «بررسی مجوز حرفه‌ای» سه وضعیت مستقل‌اند.
      هیچ نشانی به معنای توصیه، رتبه‌بندی یا تضمین کیفیت خدمت نیست.
    </p>

    <article class="badge-explain">
      <span class="tile tone-blue"><q-icon name="source" /></span>
      <div>
        <h2>پروفایل منتشرشده</h2>
        <p>اطلاعات پایه از دست‌کم یک منبع مشخص دریافت و توسط اپراتور پیش از انتشار مرور شده است.</p>
        <ul>
          <li>نام منبع و تاریخ دریافت در کنار هر پروفایل نمایش داده می‌شود.</li>
          <li>پروفایلی که هیچ نشان دیگری ندارد برای موتورهای جست‌وجو نمایه نمی‌شود.</li>
        </ul>
      </div>
    </article>

    <article class="badge-explain">
      <span class="tile tone-teal"><q-icon name="verified" /></span>
      <div>
        <h2>
          <span class="badge badge--verified"
            ><q-icon name="verified" size="16px" />مجوز حرفه‌ای بررسی‌شده</span
          >
        </h2>
        <p>
          شماره، نوع و مرجع صدور دست‌کم یک مجوز با منبع مرجع مقایسه شده و تاریخ اعتبار آن نگذشته
          است.
        </p>
        <ul>
          <li>
            تاریخ بررسی و تاریخ پایان اعتبار کنار مجوز می‌آید؛ مجوز منقضی خودکار از صفحه حذف می‌شود.
          </li>
          <li>صاحب پروفایل نمی‌تواند مجوز یا وابستگی تأییدشده را خودش تغییر دهد.</li>
        </ul>
      </div>
    </article>

    <article class="badge-explain">
      <span class="tile tone-violet"><q-icon name="how_to_reg" /></span>
      <div>
        <h2>
          <span class="badge badge--brand"
            ><q-icon name="how_to_reg" size="16px" />صاحب پروفایل تأییدشده</span
          >
        </h2>
        <p>
          کسی که پروفایل را مطالبه کرده، نسبت خود با این شخص یا سازمان را به اپراتور اثبات کرده است.
        </p>
        <ul>
          <li>این نشان دربارهٔ مجوز حرفه‌ای چیزی نمی‌گوید.</li>
          <li>
            ویرایش‌های صاحب پروفایل پیش از انتشار بازبینی و با برچسب «اظهاری» نمایش داده می‌شوند.
          </li>
        </ul>
      </div>
    </article>

    <article class="badge-explain">
      <span class="tile tone-amber"><q-icon name="flag" /></span>
      <div>
        <h2>اطلاعات نادرست دیدید یا نمی‌خواهید پروفایلتان نمایش داده شود؟</h2>
        <p>
          از دکمهٔ «گزارش خطا» در صفحهٔ هر پروفایل استفاده کنید. گزارش با منبع مقایسه و نتیجه در
          سابقهٔ تغییرات ثبت می‌شود.
        </p>
        <p>
          بخشی از پروفایل‌ها از فهرست‌های رسمی منتشرشده (مانند سامانهٔ سنهاب بیمهٔ مرکزی) ساخته
          می‌شوند. اگر صاحب پروفایل هستید، در همان پنجره «درخواست حذف پروفایل» را انتخاب کنید؛ پس از
          بررسی ارتباط شما، پروفایل از سایت برداشته می‌شود و با به‌روزرسانی بعدی منابع هم
          برنمی‌گردد. راه تماسی که می‌دهید فقط برای پیگیری است و ۱۸۰ روز پس از رسیدگی پاک می‌شود.
        </p>
      </div>
    </article>
  </main>
  <SiteFooter />
</template>
