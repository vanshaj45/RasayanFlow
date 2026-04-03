import create from 'zustand';
import api from '../services/api';

const getPayload = (responseData) => responseData?.data ?? responseData;

const normalizeLab = (lab) => ({
  ...lab,
  id: lab._id || lab.id,
  name: lab.name || lab.labName || 'Unnamed Lab',
  location: lab.location || lab.labCode || 'N/A',
  admin: lab.admin || (Array.isArray(lab.admins) && lab.admins.length ? lab.admins.map((admin) => admin.name).join(', ') : 'Unassigned')
});

const normalizeRole = (role) => {
  if (role === 'superAdmin') return 'super-admin';
  if (role === 'labAdmin') return 'lab-admin';
  if (role === 'storeAdmin') return 'store-admin';
  return role || 'student';
};

const normalizeUser = (user) => ({
  ...user,
  id: user._id || user.id,
  role: normalizeRole(user.role),
  isBlocked: Boolean(user.isBlocked),
  blockedReason: user.blockedReason || ''
});

const normalizeInventoryItem = (item) => ({
  ...item,
  id: item._id || item.id,
  itemCode: item.itemCode || '',
  name: item.name || item.itemName || 'Unnamed Item',
  category: item.category || 'General',
  quantityUnit: item.quantityUnit || item.unit || '',
  storageLocation: item.storageLocation || '',
  lotNumber: item.lotNumber || '',
  expiryDate: item.expiryDate || null
});

const normalizeTransaction = (tx) => ({
  ...tx,
  id: tx._id || tx.id,
  status: tx.status || 'pending',
  itemName: tx.itemName || tx.itemId?.itemName || 'item',
  itemCode: tx.itemCode || tx.itemId?.itemCode || '',
  requesterName: tx.requesterName || tx.userId?.name || 'Unknown',
  requesterEmail: tx.requesterEmail || tx.userId?.email || '',
  detail:
    tx.detail ||
    `${tx.type === 'return' ? 'Returned' : tx.status === 'pending' ? 'Requested' : 'Borrowed'} ${tx.quantity || 0} ${tx.itemId?.itemName || 'item'}`
});

const normalizeActivityLog = (log) => ({
  ...log,
  id: log._id || log.id,
  action: log.action || 'activity',
  details: log.details || '',
  timestamp: log.timestamp || log.createdAt || null,
  actorName: log.userId?.name || 'Unknown user',
  actorEmail: log.userId?.email || '',
  actorRole: normalizeRole(log.userId?.role),
});

const normalizeStoreItem = (item) => ({
  ...item,
  id: item._id || item.id,
  itemCode: item.itemCode || '',
  itemName: item.itemName || item.name || 'Unnamed Item',
  category: item.category || 'General',
  subCategory: item.subCategory || 'Miscellaneous',
  quantity: Number(item.quantity || 0),
  quantityUnit: item.quantityUnit || 'units',
  storageLocation: item.storageLocation || '',
  description: item.description || '',
});

const normalizeStoreAllotment = (entry) => ({
  ...entry,
  id: entry._id || entry.id,
  quantity: Number(entry.quantity || 0),
  quantityUnit: entry.quantityUnit || entry.storeItemId?.quantityUnit || 'units',
  studentName: entry.studentId?.name || 'Unknown student',
  studentEmail: entry.studentId?.email || '',
  itemName: entry.storeItemId?.itemName || 'Store item',
  itemCode: entry.storeItemId?.itemCode || '',
  allottedByName: entry.allottedBy?.name || 'Unknown admin',
  status: entry.status || 'approved',
  requestNotes: entry.requestNotes || '',
  reviewNotes: entry.reviewNotes || '',
  reviewedByName: entry.reviewedBy?.name || '',
  dueDate: entry.dueDate || null,
  timestamp: entry.timestamp || null,
});

const useAppStore = create((set) => ({
  labs: [],
  users: [],
  inventory: [],
  storeItems: [],
  storeAllotments: [],
  transactions: [],
  activityLogs: [],
  loading: false,
  filters: { search: '', lab: 'All' },
  toast: null,
  highlight: null,
  fetchLabs: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/labs');
      const labs = (getPayload(data) || []).map(normalizeLab);
      set({ labs, loading: false });
    } catch {
      set({ labs: [], loading: false });
    }
  },
  createLab: async ({ name, code }) => {
    const { data } = await api.post('/labs', { labName: name, labCode: code });
    const createdLab = normalizeLab(getPayload(data));
    set((state) => ({ labs: [createdLab, ...state.labs] }));
    return createdLab;
  },
  createInventoryItem: async ({ labId, itemCode, name, category, quantity, quantityUnit, minThreshold = 5, storageLocation = '', lotNumber = '', expiryDate = '' }) => {
    const response = await api.post('/inventory', {
      labId,
      itemCode,
      itemName: name,
      category,
      quantity: Number(quantity),
      quantityUnit,
      minThreshold: Number(minThreshold),
      storageLocation,
      lotNumber,
      expiryDate: expiryDate || null
    });
    const item = normalizeInventoryItem(getPayload(response.data));
    set((state) => ({ inventory: [item, ...state.inventory] }));
    return item;
  },
  updateInventoryItem: async (itemId, updates) => {
    const response = await api.put(`/inventory/${itemId}`, updates);
    const updatedItem = normalizeInventoryItem(getPayload(response.data));
    set((state) => ({
      inventory: state.inventory.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    }));
    return updatedItem;
  },
  deleteInventoryItem: async (itemId) => {
    await api.delete(`/inventory/${itemId}`);
    set((state) => ({
      inventory: state.inventory.filter((item) => item.id !== itemId)
    }));
  },
  createBorrowRequest: async ({ itemId, quantity, purpose, neededUntil, notes = '' }) => {
    const response = await api.post('/transactions/borrow', {
      itemId,
      quantity: Number(quantity),
      purpose,
      neededUntil,
      notes
    });
    return normalizeTransaction(getPayload(response.data)?.transaction || getPayload(response.data));
  },
  approveBorrowRequest: async (transactionId, reviewNotes = '') => {
    const response = await api.put(`/transactions/approve/${transactionId}`, { reviewNotes });
    return getPayload(response.data);
  },
  rejectBorrowRequest: async (transactionId, reviewNotes = '') => {
    const response = await api.put(`/transactions/reject/${transactionId}`, { reviewNotes });
    return getPayload(response.data);
  },
  assignAdminToLab: async ({ labId, adminId }) => {
    const response = await api.post('/labs/assign', { labId, adminId });
    return getPayload(response.data);
  },
  removeAdminFromLab: async ({ labId, adminId }) => {
    const response = await api.post('/labs/remove', { labId, adminId });
    return getPayload(response.data);
  },
  createLabAdmin: async ({ name, email, password }) => {
    const response = await api.post('/auth/register', { name, email, password, role: 'labAdmin' });
    return normalizeUser(getPayload(response.data));
  },
  createStoreAdmin: async ({ name, email, password }) => {
    const response = await api.post('/auth/register', { name, email, password, role: 'storeAdmin' });
    return normalizeUser(getPayload(response.data));
  },
  approveUserAccount: async (userId) => {
    const response = await api.put(`/users/approve/${userId}`);
    return normalizeUser(getPayload(response.data));
  },
  setUserBlockedState: async ({ userId, isBlocked, blockedReason = '' }) => {
    const response = await api.put(`/users/block/${userId}`, { isBlocked, blockedReason });
    const updatedUser = normalizeUser(getPayload(response.data));
    set((state) => ({
      users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    }));
    return updatedUser;
  },
  fetchUsers: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/users');
      const users = (getPayload(data) || []).map(normalizeUser);
      set({ users, loading: false });
    } catch {
      set({ users: [], loading: false });
    }
  },
  fetchInventory: async (labId) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/inventory?labId=${labId}`);
      const inventory = (getPayload(data) || []).map(normalizeInventoryItem);
      set({ inventory, loading: false });
    } catch {
      set({ inventory: [], loading: false });
    }
  },
  fetchStoreItems: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.subCategory) queryParams.set('subCategory', filters.subCategory);
      if (filters.search) queryParams.set('search', filters.search);

      const query = queryParams.toString() ? `/store-items?${queryParams.toString()}` : '/store-items';
      const { data } = await api.get(query);
      const storeItems = (getPayload(data) || []).map(normalizeStoreItem);
      set({ storeItems, loading: false });
      return storeItems;
    } catch {
      set({ storeItems: [], loading: false });
      return [];
    }
  },
  createStoreItem: async (payload) => {
    const response = await api.post('/store-items', payload);
    const createdItem = normalizeStoreItem(getPayload(response.data));
    set((state) => ({ storeItems: [createdItem, ...state.storeItems] }));
    return createdItem;
  },
  updateStoreItem: async (itemId, updates) => {
    const response = await api.put(`/store-items/${itemId}`, updates);
    const updatedItem = normalizeStoreItem(getPayload(response.data));
    set((state) => ({
      storeItems: state.storeItems.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    }));
    return updatedItem;
  },
  deleteStoreItem: async (itemId) => {
    await api.delete(`/store-items/${itemId}`);
    set((state) => ({
      storeItems: state.storeItems.filter((item) => item.id !== itemId)
    }));
  },
  fetchStoreAllotments: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();
      if (filters.studentId) queryParams.set('studentId', filters.studentId);
      if (filters.storeItemId) queryParams.set('storeItemId', filters.storeItemId);

      const query = queryParams.toString() ? `/store-allotments?${queryParams.toString()}` : '/store-allotments';
      const { data } = await api.get(query);
      const storeAllotments = (getPayload(data) || []).map(normalizeStoreAllotment);
      set({ storeAllotments, loading: false });
      return storeAllotments;
    } catch {
      set({ storeAllotments: [], loading: false });
      return [];
    }
  },
  createStoreAllotment: async (payload) => {
    const response = await api.post('/store-allotments', payload);
    const allotment = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({ storeAllotments: [allotment, ...state.storeAllotments] }));
    return allotment;
  },
  requestStoreItem: async (payload) => {
    const response = await api.post('/store-allotments/request', payload);
    const allotment = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({ storeAllotments: [allotment, ...state.storeAllotments] }));
    return allotment;
  },
  approveStoreRequest: async (allotmentId, reviewNotes = '') => {
    const response = await api.put(`/store-allotments/approve/${allotmentId}`, { reviewNotes });
    const updated = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({
      storeAllotments: state.storeAllotments.map((entry) => (entry.id === updated.id ? updated : entry))
    }));
    return updated;
  },
  rejectStoreRequest: async (allotmentId, reviewNotes = '') => {
    const response = await api.put(`/store-allotments/reject/${allotmentId}`, { reviewNotes });
    const updated = normalizeStoreAllotment(getPayload(response.data));
    set((state) => ({
      storeAllotments: state.storeAllotments.map((entry) => (entry.id === updated.id ? updated : entry))
    }));
    return updated;
  },
  fetchTransactions: async (paramsOrLabId) => {
    set({ loading: true });
    try {
      const filters =
        typeof paramsOrLabId === 'string' || !paramsOrLabId
          ? { labId: paramsOrLabId || '' }
          : paramsOrLabId;
      const queryParams = new URLSearchParams();

      if (filters.labId) queryParams.set('labId', filters.labId);
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.itemCode) queryParams.set('itemCode', filters.itemCode.trim().toUpperCase());

      const query = queryParams.toString() ? `/transactions?${queryParams.toString()}` : '/transactions';
      const { data } = await api.get(query);
      const transactions = (getPayload(data) || []).map(normalizeTransaction);
      set({ transactions, loading: false });
    } catch {
      set({ transactions: [], loading: false });
    }
  },
  fetchActivityLogs: async (filters = {}) => {
    set({ loading: true });
    try {
      const queryParams = new URLSearchParams();

      if (filters.page) queryParams.set('page', String(filters.page));
      if (filters.limit) queryParams.set('limit', String(filters.limit));
      if (filters.userId) queryParams.set('userId', filters.userId);
      if (filters.action) queryParams.set('action', filters.action);

      const query = queryParams.toString() ? `/logs?${queryParams.toString()}` : '/logs';
      const { data } = await api.get(query);
      const activityLogs = (getPayload(data) || []).map(normalizeActivityLog);
      set({ activityLogs, loading: false });
      return activityLogs;
    } catch {
      set({ activityLogs: [], loading: false });
      return [];
    }
  },
  setFilters: (payload) => set((state) => ({ filters: { ...state.filters, ...payload } })),
  setToast: (toast) => set({ toast }),
  removeToast: () => set({ toast: null }),
  setHighlight: (id) => {
    set({ highlight: id });
    setTimeout(() => set({ highlight: null }), 1000);
  }
}));

export default useAppStore;
