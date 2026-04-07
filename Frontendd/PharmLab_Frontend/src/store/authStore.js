import create from 'zustand';
import api from '../services/api';
import useAppStore from './appStore';
import { saveToken, saveUser, clearAuthSession, onAuthCleared, getUser, getToken } from '../utils/auth';

const initial = {
  initialized: false,
  user: getUser(),
  token: null,
  loading: false,
  error: null
};

const clearedAuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  initialized: true,
};

const normalizeRole = (role) => {
  if (role === 'superAdmin') return 'super-admin';
  if (role === 'labAdmin') return 'lab-admin';
  if (role === 'storeAdmin') return 'store-admin';
  return role || 'student';
};

const normalizeUser = (user) => {
  if (!user) return null;
  return { ...user, role: normalizeRole(user.role) };
};

const useAuthStore = create((set) => ({
  ...initial,
  setUser: (user) => set({ user: normalizeUser(user), error: null }),
  register: async (values) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.post('/auth/register', values);
      const payload = resp.data?.data || resp.data;
      const user = normalizeUser(payload);
      set({ loading: false, error: null });
      return user;
    } catch (error) {
      const message = error?.response?.data?.message || 'Registration failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  login: async (values) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.post('/auth/login', values);
      const payload = resp.data?.data || resp.data;
      const token = payload?.accessToken || payload?.token || null;
      const user = normalizeUser(payload);

      saveToken(token);
      saveUser(user);
      set({ user, token, loading: false, error: null });
      return user;
    } catch (error) {
      const message = error?.response?.data?.message || 'Login failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  changePassword: async ({ currentPassword, newPassword }) => {
    set({ loading: true, error: null });
    try {
      const resp = await api.put('/auth/password', { currentPassword, newPassword });
      set({ loading: false, error: null });
      return resp.data?.data || resp.data;
    } catch (error) {
      const message = error?.response?.data?.message || 'Password update failed';
      set({ loading: false, error: message });
      throw new Error(message);
    }
  },
  logout: () => {
    clearAuthSession();
  },
  ensureAuth: async () => {
    const cachedUser = normalizeUser(getUser());
    const token = getToken();

    if (!token) {
      set({ user: null, token: null, initialized: true });
      return;
    }

    set({ user: cachedUser, token, initialized: true });

    try {
      const resp = await api.get('/auth/me');
      const user = normalizeUser(resp.data?.data || resp.data);
      saveUser(user);
      set({ user, token, initialized: true, error: null });
    } catch {
      clearAuthSession();
      set(clearedAuthState);
    }
  }
}));

if (typeof window !== 'undefined') {
  onAuthCleared(() => {
    useAuthStore.setState(clearedAuthState);
    useAppStore.getState().resetAppState();
  });
}

export default useAuthStore;
