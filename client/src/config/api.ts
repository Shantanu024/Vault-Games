import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}/api`,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Response interceptor — auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            return api(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await api.post('/auth/refresh');
        const { accessToken } = res.data;
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        // Redirect to login
        window.location.href = '/auth';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
