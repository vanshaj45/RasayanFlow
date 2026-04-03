import axios from 'axios';
import { getToken, clearAuthSession } from '../utils/auth';
import { navigate } from '../utils/navigate';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      clearAuthSession();
      navigate('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
