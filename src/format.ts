import type { ActorType } from './types';

export const actorTypes: Record<
  ActorType,
  { label: string; plural: string; icon: string; tone: string }
> = {
  insurer: { label: 'شرکت بیمه', plural: 'شرکت‌های بیمه', icon: 'apartment', tone: 'blue' },
  broker: { label: 'کارگزار', plural: 'کارگزاران', icon: 'handshake', tone: 'violet' },
  agency: { label: 'نماینده', plural: 'نمایندگان', icon: 'storefront', tone: 'amber' },
  expert: { label: 'مشاور ریسک', plural: 'مشاوران ریسک', icon: 'insights', tone: 'teal' },
  adjuster: { label: 'ارزیاب خسارت', plural: 'ارزیابان خسارت', icon: 'fact_check', tone: 'rose' },
};

export const fieldLabels: Record<string, string> = {
  description: 'معرفی',
  city: 'شهر',
  website: 'وب‌سایت',
  public_phone: 'تلفن عمومی',
  specialties: 'تخصص‌ها',
};

export const statusLabels: Record<string, string> = {
  pending: 'در انتظار بررسی',
  approved: 'تأیید شد',
  rejected: 'رد شد',
  reverted: 'بازگردانده شد',
};

export function faNumber(value: number | string): string {
  return typeof value === 'number'
    ? value.toLocaleString('fa-IR')
    : value.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]!);
}

/** Render an ISO date in the Persian (Jalali) calendar. */
export function faDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export const requestStatuses: Record<string, { label: string; tone: string }> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' },
  submitted: { label: 'در انتظار بررسی اپراتور', tone: 'amber' },
  rejected: { label: 'رد شد', tone: 'danger' },
  open: { label: 'در حال دریافت پیشنهاد', tone: 'brand' },
  selected: { label: 'پیشنهاد انتخاب شد', tone: 'verified' },
  cancelled: { label: 'لغو شد', tone: 'neutral' },
  closed: { label: 'بسته شد', tone: 'neutral' },
};

export const invitationStatuses: Record<string, { label: string; tone: string }> = {
  invited: { label: 'منتظر پاسخ', tone: 'amber' },
  accepted: { label: 'پذیرفته؛ در حال تهیه پیشنهاد', tone: 'brand' },
  proposed: { label: 'پیشنهاد ارسال شد', tone: 'verified' },
  declined: { label: 'رد دعوت', tone: 'neutral' },
  expired: { label: 'منقضی', tone: 'neutral' },
  closed: { label: 'بسته شد', tone: 'neutral' },
};

/** Amounts are stored in rials. */
export function faMoney(rials: number | null | undefined): string {
  if (rials === null || rials === undefined) return '—';
  return `${rials.toLocaleString('fa-IR')} ریال`;
}

/** Short human reading of a rial amount, e.g. «۱٫۲ میلیارد ریال». */
export function faMoneyShort(rials: number | null | undefined): string {
  if (!rials) return '';
  const units: [number, string][] = [
    [1e12, 'هزار میلیارد'],
    [1e9, 'میلیارد'],
    [1e6, 'میلیون'],
  ];
  for (const [size, label] of units) {
    if (rials >= size) {
      return `${(Math.round((rials / size) * 10) / 10).toLocaleString('fa-IR')} ${label} ریال`;
    }
  }
  return faMoney(rials);
}

export function faDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fa-IR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fileSize(bytes: number): string {
  return bytes >= 1048576
    ? `${(bytes / 1048576).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} مگابایت`
    : `${Math.ceil(bytes / 1024).toLocaleString('fa-IR')} کیلوبایت`;
}

/** Display a user-entered detail value, with numbers in Persian digits. */
export function faValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'number' ? value.toLocaleString('fa-IR') : value;
}

export const crmStages: Record<string, { label: string; tone: string }> = {
  new: { label: 'جدید', tone: 'neutral' },
  contacted: { label: 'تماس گرفته شد', tone: 'brand' },
  quoting: { label: 'در حال پیشنهاد', tone: 'amber' },
  negotiation: { label: 'مذاکره', tone: 'brand' },
  won: { label: 'موفق', tone: 'verified' },
  lost: { label: 'ناموفق', tone: 'danger' },
};
export const openStages = ['new', 'contacted', 'quoting', 'negotiation'] as const;

export const activityTypes: Record<string, { label: string; icon: string }> = {
  note: { label: 'یادداشت', icon: 'sticky_note_2' },
  call: { label: 'تماس', icon: 'call' },
  meeting: { label: 'جلسه', icon: 'groups' },
  email: { label: 'ایمیل', icon: 'mail' },
  stage: { label: 'تغییر مرحله', icon: 'swap_horiz' },
  system: { label: 'سیستم', icon: 'bolt' },
};

export const leadSources: Record<string, string> = {
  platform: 'اینشورهاب',
  manual: 'ثبت دستی',
  import: 'فایل ورودی',
};

export const tenderStatuses: Record<string, { label: string; tone: string }> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' },
  open: { label: 'در حال دریافت پیشنهاد', tone: 'brand' },
  evaluation: { label: 'ارزیابی', tone: 'amber' },
  awarded: { label: 'واگذار شد', tone: 'verified' },
  cancelled: { label: 'لغو شد', tone: 'danger' },
};
export const tenderInvitationStatuses: Record<string, { label: string; tone: string }> = {
  invited: { label: 'منتظر پاسخ', tone: 'amber' },
  accepted: { label: 'شرکت می‌کند', tone: 'brand' },
  declined: { label: 'انصراف', tone: 'neutral' },
  expired: { label: 'بدون پاسخ', tone: 'neutral' },
};

/** Proposal wording differs between insurance quotes and expert-service offers. */
export function proposalLabels(kind: string | undefined) {
  const service = kind === 'service';
  return {
    service,
    premium: service ? 'حق‌الزحمه' : 'حق بیمه',
    coverages: service ? 'دامنهٔ کار' : 'پوشش‌ها',
    exclusions: service ? 'خارج از دامنهٔ کار' : 'استثناها',
    services: service ? 'روش کار و خروجی' : 'خدمات همراه',
  };
}
