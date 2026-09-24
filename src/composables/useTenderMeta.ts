import { ref } from 'vue';
import { tenderMeta } from '../api';
import type { TenderMeta } from '../types';

const meta = ref<TenderMeta | null>(null);
let pending: Promise<TenderMeta | null> | null = null;

/** Shared, lazily loaded tender settings; `null` means the feature is off (or signed out). */
export function useTenderMeta() {
  async function load(): Promise<TenderMeta | null> {
    if (meta.value) return meta.value;
    pending ??= tenderMeta().then((result) => {
      meta.value = result;
      pending = null;
      return result;
    });
    return pending;
  }
  return { meta, load };
}
