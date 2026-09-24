import { defineStore } from 'pinia';
import { TOKEN_KEY, logout as apiLogout, me } from '../api';
import type { User } from '../types';

export const useAuthStore = defineStore('auth', {
  state: (): { user: User | null; ready: boolean } => ({ user: null, ready: false }),
  getters: {
    loggedIn: (state) => state.user !== null,
  },
  actions: {
    /** Resolve the current user from the stored token; safe to call repeatedly on the client. */
    async restore(): Promise<void> {
      if (this.ready) return;
      try {
        if (localStorage.getItem(TOKEN_KEY)) this.user = await me();
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        this.user = null;
      } finally {
        this.ready = true;
      }
    },
    signIn(token: string, user: User): void {
      localStorage.setItem(TOKEN_KEY, token);
      this.user = user;
      this.ready = true;
    },
    async signOut(): Promise<void> {
      await apiLogout().catch(() => undefined);
      localStorage.removeItem(TOKEN_KEY);
      this.user = null;
    },
  },
});
