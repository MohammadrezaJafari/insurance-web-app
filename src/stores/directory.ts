import { defineStore } from 'pinia';
import { getActor, getStats, getTaxonomy, listActors } from '../api';
import type { Actor, DirectoryStats, PaginatedActors, Taxonomy } from '../types';

export const listFilterKeys = [
  'q',
  'type',
  'province',
  'line',
  'specialty',
  'verified',
  'page',
] as const;

interface DirectoryState {
  list: PaginatedActors | null;
  listKey: string;
  profile: Actor | null;
  profileSlug: string;
  taxonomy: Taxonomy | null;
  stats: DirectoryStats | null;
}

export const useDirectoryStore = defineStore('directory', {
  state: (): DirectoryState => ({
    list: null,
    listKey: '',
    profile: null,
    profileSlug: '',
    taxonomy: null,
    stats: null,
  }),
  actions: {
    async loadList(query: Record<string, unknown>): Promise<void> {
      const params = new URLSearchParams();
      for (const key of listFilterKeys) {
        const value = query[key];
        if (typeof value === 'string' && value.trim()) params.set(key, value);
      }
      const key = params.toString();
      if (this.list && this.listKey === key) return;
      this.list = await listActors(params);
      this.listKey = key;
    },
    /** `ref` is the referral channel (?ref=) counted with the visit. */
    async loadProfile(slug: string, ref?: string): Promise<void> {
      if (this.profile && this.profileSlug === slug) return;
      this.profile = await getActor(slug, ref);
      this.profileSlug = slug;
    },
    async loadTaxonomy(): Promise<void> {
      if (!this.taxonomy) this.taxonomy = await getTaxonomy();
    },
    async loadStats(): Promise<void> {
      if (!this.stats) this.stats = await getStats();
    },
  },
});
