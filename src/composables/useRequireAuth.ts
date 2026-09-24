import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

/** Resolve the session on the client and send signed-out visitors to the login page. */
export function useRequireAuth(): () => Promise<boolean> {
  const auth = useAuthStore();
  const route = useRoute();
  const router = useRouter();

  return async () => {
    await auth.restore();
    if (!auth.loggedIn) {
      await router.replace({ path: '/account', query: { redirect: route.fullPath } });
      return false;
    }
    return true;
  };
}
