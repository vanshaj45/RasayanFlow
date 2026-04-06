import axios from 'axios';
import { getToken, clearAuthSession } from '../utils/auth';
import { navigate } from '../utils/navigate';

// Support both VITE_API_BASE and VITE_API_BASE_URL for compatibility
const API_BASE = 
  import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_BASE || 
  'http://localhost:5000';

const TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10);

const api = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT,
  headers: { 
    'Content-Type': 'application/json',
    'X-Client-Version': import.meta.env.VITE_APP_VERSION || '1.0.0',
  }
});

/**
 * Request interceptor: Add auth token and handle setup
 */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request setup failed:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor: Handle errors and auth
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Handle 401 Unauthorized - clear session and redirect to login
    if (status === 401) {
      clearAuthSession();
      navigate('/login');
    }

    // Log error for debugging in development
    if (import.meta.env.DEV) {
      console.error(`[API Error ${status}]`, error?.response?.data?.message || error?.message);
    }

    // Return original error so all handlers work correctly
    return Promise.reject(error);
  }
);

export default api;
