import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import api from '../config/api';

/**
 * Restores the session on app load:
 * 1. If we have a stored access token, re-fetch /auth/me to validate
 * 2. If that fails with 401, attempt token refresh via cookie
 * 3. Connect socket once auth is confirmed
 */
export function useAuthInit() {
  const { isAuthenticated, accessToken, setAuth, clearAuth, fetchMe } = useAuthStore();
  const { connect } = useSocketStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if (isAuthenticated && accessToken) {
          // Set the header before fetching
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          try {
            await fetchMe();
            connect(accessToken);
          } catch {
            // fetchMe already calls clearAuth on failure
          }
        } else {
          // Try refresh token (httpOnly cookie)
          try {
            const res = await api.post('/auth/refresh');
            const { accessToken: newToken } = res.data;
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            await fetchMe();
            connect(newToken);
          } catch {
            clearAuth();
          }
        }
      } finally {
        setInitialized(true);
      }
    }

    init();
  }, [isAuthenticated, accessToken, clearAuth, connect, fetchMe]);

  return { initialized };
}
