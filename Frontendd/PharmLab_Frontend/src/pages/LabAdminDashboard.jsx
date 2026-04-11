import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Trash2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const UNIT_OPTIONS = ['mg', 'g', 'kg', 'mcg', 'mL', 'L', 'uL', 'tablets', 'capsules', 'bottles', 'boxes', 'packs', 'vials', 'ampoules', 'units'];
const getTodayDate = () => new Date().toISOString().slice(0, 10);
const EMPTY_ITEM = { itemCode: '', chemicalName: '', category: 'Chemical', quantity: '', quantityUnit: 'mL', costPerUnit: '', minThreshold: '5', casNumber: '', smiles: '', inchi: '', chemicalFormula: '', manufacturingCompany: '', entryDate: getTodayDate(), storageLocation: '', lotNumber: '', expiryDate: '', abstract: '', pubmedId: '' };
const EMPTY_EXPERIMENT = { title: '', experimentObject: '', description: '', procedure: '', requiredInventory: [{ inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] };

const SelectUnit = ({ value, onChange }) => (
  <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
    <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
    <select value={value} onChange={onChange} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'>
      {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
    </select>
  </label>
);

export default function LabAdminDashboard() {
  const store = useAppStore();
  const {
    fetchLabs,
    fetchUsers,
    fetchInventory,
    fetchTransactions,
    fetchExperiments,
  } = store;
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isTransactionsPage = location.pathname === '/transactions';
  const isAnalyticsPage = location.pathname === '/analytics';
  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    return store.labs.filter((lab) => Array.isArray(lab.admins) && lab.admins.some((admin) => String(admin.id || admin._id || admin) === currentUserId));
  }, [store.labs, user]);
  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const labId = selectedLabId || assignedLabs[0]?.id || assignedLabs[0]?._id || user?.labId || '';
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editItem, setEditItem] = useState(EMPTY_ITEM);
  const [experimentForm, setExperimentForm] = useState(EMPTY_EXPERIMENT);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteExperimentTarget, setDeleteExperimentTarget] = useState(null);
  const [reviewingId, setReviewingId] = useState('');
  const [reviewingExperimentRequestId, setReviewingExperimentRequestId] = useState('');
  const [blockingUserId, setBlockingUserId] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingExperiment, setSavingExperiment] = useState(false);
  const [autofillingCas, setAutofillingCas] = useState(false);
  const [editAutofillingCas, setEditAutofillingCas] = useState(false);
  const [lastAutofilledCas, setLastAutofilledCas] = useState('');
  const [lastEditAutofilledCas, setLastEditAutofilledCas] = useState('');
  const [casLookupMessage, setCasLookupMessage] = useState('');
  const [casLookupType, setCasLookupType] = useState('');
  const [editCasLookupMessage, setEditCasLookupMessage] = useState('');
  const [editCasLookupType, setEditCasLookupType] = useState('');

  useEffect(() => { fetchLabs(); fetchUsers(); }, [fetchLabs, fetchUsers]);
  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);
  useEffect(() => {
    if (!labId) return;
    fetchInventory(labId);
    fetchTransactions({ labId });
    fetchExperiments({ labId });
  }, [fetchExperiments, fetchInventory, fetchTransactions, labId]);

  const currentLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(labId)) || store.labs.find((lab) => String(lab.id || lab._id) === String(labId));
  const pendingBorrowRequests = store.transactions.filter((tx) => tx.status === 'pending' && tx.type === 'borrow');
  const pendingExperimentRequests = pendingBorrowRequests.filter((tx) => tx.requestCategory === 'experiment');
  const pendingInventoryRequests = pendingBorrowRequests.filter((tx) => tx.requestCategory !== 'experiment');
  const students = store.users.filter((entry) => entry.role === 'student' && (!entry.labId || String(entry.labId) === String(labId)));
  const lowStockCount = store.inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minThreshold || 0)).length;
  const totalInventoryValue = store.inventory.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.costPerUnit || 0), 0);
  const experimentSpend = store.experiments.reduce((sum, experiment) => sum + Number(experiment.totalEstimatedExpense || 0), 0);

  const openEditModal = (row) => {
    setEditItem({
      id: row.id, itemCode: row.itemCode || '', chemicalName: row.chemicalName || row.name || '', category: row.category || '', quantity: String(row.quantity ?? ''), quantityUnit: row.quantityUnit || 'mL', costPerUnit: String(row.costPerUnit ?? ''), minThreshold: String(row.minThreshold ?? 5), casNumber: row.casNumber || '', smiles: row.smiles || '', inchi: row.inchi || '', chemicalFormula: row.chemicalFormula || '', manufacturingCompany: row.manufacturingCompany || '', entryDate: row.entryDate ? new Date(row.entryDate).toISOString().slice(0, 10) : getTodayDate(), storageLocation: row.storageLocation || '', lotNumber: row.lotNumber || '', expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : '', abstract: row.abstract || '', pubmedId: row.pubmedId || ''
    });
    setEditCasLookupMessage('');
    setEditCasLookupType('');
    setLastEditAutofilledCas(row.casNumber || '');
    setEditOpen(true);
  };

  const saveItem = async (payload, isEdit = false) => {
    const action = isEdit ? store.updateInventoryItem(payload.id, payload) : store.createInventoryItem({ labId, ...payload });
    return action;
  };

  const handleAddItem = async () => {
    if (!labId || !newItem.chemicalName.trim() || !String(newItem.quantity).trim()) {
      store.setToast({ type: 'error', message: 'Chemical name and quantity are required before saving.' });
      return;
    }
    setSavingItem(true);
    try {
      const item = await saveItem({ ...newItem, chemicalName: newItem.chemicalName.trim(), category: newItem.category.trim(), quantity: Number(newItem.quantity), costPerUnit: Number(newItem.costPerUnit || 0), minThreshold: Number(newItem.minThreshold || 5) });
      store.setToast({ type: 'success', message: `${item.chemicalName} added.` });
      store.setHighlight(item.id);
      setCreateOpen(false);
      setNewItem(EMPTY_ITEM);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to add chemical.' });
    } finally { setSavingItem(false); }
  };

  const handleEditItem = async () => {
    if (!editItem.id || !editItem.chemicalName.trim()) return;
    setSavingEdit(true);
    try {
      const item = await saveItem({ ...editItem, chemicalName: editItem.chemicalName.trim(), category: editItem.category.trim(), quantity: Number(editItem.quantity), costPerUnit: Number(editItem.costPerUnit || 0), minThreshold: Number(editItem.minThreshold || 5) }, true);
      store.setToast({ type: 'success', message: `${item.chemicalName} updated.` });
      store.setHighlight(item.id);
      setEditOpen(false);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update chemical.' });
    } finally { setSavingEdit(false); }
  };

  const handleCreateExperiment = async () => {
    const requiredInventory = experimentForm.requiredInventory.filter((entry) => entry.inventoryItemId && Number(entry.quantity) > 0).map((entry) => ({ ...entry, quantity: Number(entry.quantity) }));
    if (!labId || !experimentForm.title.trim() || !experimentForm.experimentObject.trim() || !requiredInventory.length) return;
    setSavingExperiment(true);
    try {
      await store.createExperiment({ labId, title: experimentForm.title.trim(), experimentObject: experimentForm.experimentObject.trim(), description: experimentForm.description.trim(), procedure: experimentForm.procedure.trim(), requiredInventory });
      store.setToast({ type: 'success', message: 'Experiment created.' });
      setExperimentOpen(false);
      setExperimentForm(EMPTY_EXPERIMENT);
    } catch (error) {
      store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create experiment.' });
    } finally { setSavingExperiment(false); }
  };

  const autofillFromCas = async (item, setItem, setLoading, setLastFetchedCas, setStatusMessage, setStatusType) => {
    const normalizedCas = item.casNumber.trim();

    if (!normalizedCas) {
      setStatusType('error');
      setStatusMessage('Enter a CAS number first.');
      return;
    }

    setStatusType('loading');
    setStatusMessage(`Checking PubChem for CAS ${normalizedCas}...`);
    setLoading(true);
    try {
      const result = await store.fetchChemicalDataByCasForInventory(normalizedCas);
      if (!result?.found) {
        setStatusType('error');
        setStatusMessage(result?.message || 'No PubChem data found for this CAS number.');
        return;
      }

      const pubchemData = result.data || {};
      setItem((state) => ({
        ...state,
        category: 'Chemical',
        chemicalName: pubchemData.chemicalName || state.chemicalName,
        casNumber: pubchemData.casNumber || state.casNumber,
        chemicalFormula: pubchemData.chemicalFormula || state.chemicalFormula,
        smiles: pubchemData.smiles || state.smiles,
        inchi: pubchemData.inchi || state.inchi,
      }));
      setLastFetchedCas(normalizedCas);
      setStatusType('success');
      setStatusMessage(`PubChem matched ${pubchemData.chemicalName || normalizedCas}. Review the fields below, then save the chemical.`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(error?.response?.data?.message || 'Failed to fetch chemical details from PubChem.');
    } finally {
      setLoading(false);
    }
  };

  const reviewBorrow = async (id, status) => {
    setReviewingId(id);
    try {
      if (status === 'approved') await store.approveBorrowRequest(id); else await store.rejectBorrowRequest(id);
      await Promise.all([store.fetchInventory(labId), store.fetchTransactions({ labId })]);
      store.setToast({ type: 'success', message: `Borrow request ${status}.` });
    } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update borrow request.' }); } finally { setReviewingId(''); }
  };

  const reviewExperimentRequest = async (id, status) => {
    setReviewingExperimentRequestId(id);
    try {
      if (status === 'approved') await store.approveBorrowRequest(id); else await store.rejectBorrowRequest(id);
      await store.fetchTransactions({ labId });
      store.setToast({ type: 'success', message: `Experiment request ${status}.` });
    } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update experiment request.' }); } finally { setReviewingExperimentRequestId(''); }
  };

  const toggleStudentBlock = async (student) => {
    setBlockingUserId(student.id);
    try {
      await store.setUserBlockedState({ userId: student.id, isBlocked: !student.isBlocked, blockedReason: student.isBlocked ? '' : 'Blocked by lab admin due to misuse.' });
      await store.fetchUsers();
      store.setToast({ type: 'success', message: `${student.name} ${student.isBlocked ? 'unblocked' : 'blocked'}.` });
    } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update student access.' }); } finally { setBlockingUserId(''); }
  };

  const inventoryHeaders = [
    { key: 'chemicalName', label: 'Chemical Name' },
    { key: 'casNumber', label: 'CAS No.' },
    { key: 'chemicalFormula', label: 'Formula' },
    { key: 'manufacturingCompany', label: 'Company' },
    { key: 'costPerUnit', label: 'Cost/Unit', render: (row) => `Rs. ${Number(row.costPerUnit || 0).toFixed(2)}` },
    { key: 'quantity', label: 'Stock', render: (row) => `${row.quantity} ${row.quantityUnit || ''}`.trim() },
    { key: 'entryDate', label: 'Entry Date', render: (row) => row.entryDate ? new Date(row.entryDate).toLocaleDateString() : 'N/A' },
    { key: 'actions', label: 'Actions', render: (row) => <div className='flex flex-wrap gap-2'><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openEditModal(row)}><Pencil size={14} /> Edit</Button><Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteTarget(row)}><Trash2 size={14} /> Delete</Button></div> }
  ];
  const experimentHeaders = [
    { key: 'title', label: 'Experiment' },
    { key: 'experimentObject', label: 'Experiment Object' },
    { key: 'requiredInventory', label: 'Required Chemicals', render: (row) => row.requiredInventory.map((entry) => entry.chemicalName).join(', ') || '--' },
    { key: 'totalEstimatedExpense', label: 'Expense', render: (row) => `Rs. ${Number(row.totalEstimatedExpense || 0).toFixed(2)}` },
    { key: 'actions', label: 'Actions', render: (row) => <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteExperimentTarget(row)}><Trash2 size={14} /> Delete</Button> }
  ];

  const downloadTransactionsPdf = () => {
    if (!store.transactions.length) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    let y = 40;
    doc.setFontSize(16); doc.text('Lab Transactions Report', 40, y); y += 20;
    store.transactions.forEach((tx) => { if (y > 760) { doc.addPage(); y = 40; } doc.setFontSize(10); doc.text(`${new Date(tx.timestamp || tx.createdAt || Date.now()).toLocaleDateString()} | ${tx.itemName} | ${tx.quantity} ${tx.itemId?.quantityUnit || ''} | ${tx.requesterName} | ${tx.status}`, 40, y); y += 16; });
    doc.save(`lab-transactions-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!assignedLabs.length) return <Card title='Lab Not Assigned' subtitle='This lab admin account is not linked to a lab yet'><p className='text-sm text-slate-500 dark:text-slate-400'>Ask the super admin to assign this account to a lab from the Manage dialog.</p></Card>;

  const modalFields = (item, setItem, isLoadingCas, lastFetchedCas, setLoading, setLastFetchedCas, statusMessage, statusType, setStatusMessage, setStatusType) => <div className='space-y-4'>
    <div className='rounded-xl border border-[#d9e1ca] bg-[#f7f8f1] p-4 dark:border-[#414a33] dark:bg-[#28301f]'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
        <div className='flex-1'>
          <Input
            label='CAS number'
            value={item.casNumber}
            onChange={(e) => {
              const nextCas = e.target.value;
              setItem((s) => ({ ...s, casNumber: nextCas, category: 'Chemical' }));
              if (nextCas.trim() !== lastFetchedCas) {
                setLastFetchedCas('');
                setStatusMessage('');
                setStatusType('');
              }
            }}
            placeholder='50-78-2'
          />
        </div>
        <Button type='button' variant='outline' className='sm:w-auto' onClick={() => autofillFromCas(item, setItem, setLoading, setLastFetchedCas, setStatusMessage, setStatusType)} disabled={isLoadingCas}>
          {isLoadingCas ? 'Fetching...' : 'Auto Fetch'}
        </Button>
      </div>
      <p className='mt-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Enter the CAS number, then click Auto Fetch to pull available PubChem fields. This only fills the form. Use Save chemical to add it to inventory.</p>
      {statusMessage ? <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${statusType === 'success' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200' : statusType === 'error' ? 'bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>{statusMessage}</div> : null}
    </div>
    <Input label='Chemical name' value={item.chemicalName} onChange={(e) => setItem((s) => ({ ...s, chemicalName: e.target.value }))} />
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Cost per unit' type='number' value={item.costPerUnit} onChange={(e) => setItem((s) => ({ ...s, costPerUnit: e.target.value }))} /><Input label='Category' value='Chemical' readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='PubChem matched CAS' value={item.casNumber} onChange={(e) => setItem((s) => ({ ...s, casNumber: e.target.value }))} /><Input label='Chemical formula' value={item.chemicalFormula} onChange={(e) => setItem((s) => ({ ...s, chemicalFormula: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='SMILES' value={item.smiles} onChange={(e) => setItem((s) => ({ ...s, smiles: e.target.value }))} /><Input label='InChI' value={item.inchi} onChange={(e) => setItem((s) => ({ ...s, inchi: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Manufacturing company' value={item.manufacturingCompany} onChange={(e) => setItem((s) => ({ ...s, manufacturingCompany: e.target.value }))} /><Input label='Entry date' type='date' value={item.entryDate} onChange={(e) => setItem((s) => ({ ...s, entryDate: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Quantity' type='number' value={item.quantity} onChange={(e) => setItem((s) => ({ ...s, quantity: e.target.value }))} /><SelectUnit value={item.quantityUnit} onChange={(e) => setItem((s) => ({ ...s, quantityUnit: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Storage location' value={item.storageLocation} onChange={(e) => setItem((s) => ({ ...s, storageLocation: e.target.value }))} /><Input label='Lot / batch number' value={item.lotNumber} onChange={(e) => setItem((s) => ({ ...s, lotNumber: e.target.value }))} /></div>
    <div className='grid gap-4 sm:grid-cols-2'><Input label='Low stock threshold' type='number' value={item.minThreshold} onChange={(e) => setItem((s) => ({ ...s, minThreshold: e.target.value }))} /><Input label='Expiry date' type='date' value={item.expiryDate} onChange={(e) => setItem((s) => ({ ...s, expiryDate: e.target.value }))} /></div>
  </div>;

  return <div className='space-y-6 pb-10'>
    <div className='rounded-xl border border-[#d9e1ca] bg-[#f9faef] px-4 py-3 dark:border-[#414a33] dark:bg-[#1f2419]'><div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'><div><p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>You are admin of {assignedLabs.length} lab{assignedLabs.length > 1 ? 's' : ''}</p><p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Current dashboard: {currentLab?.name || 'Assigned Lab'}</p></div><div className='flex flex-wrap gap-2'>{assignedLabs.map((lab) => { const labKey = String(lab.id || lab._id); return <Button key={labKey} variant={labKey === String(labId) ? 'primary' : 'outline'} className='px-3 py-1 text-xs' onClick={() => { setSelectedLabId(labKey); localStorage.setItem('pharmlab-active-lab', labKey); }}>{lab.labName || lab.name || 'Lab'}</Button>; })}</div></div></div>
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'><Card title='Tracked Chemicals' subtitle='Current inventory count'><p className='text-3xl font-semibold'>{store.inventory.length}</p></Card><Card title='Inventory Value' subtitle='Based on cost per unit'><p className='text-3xl font-semibold'>Rs. {totalInventoryValue.toFixed(2)}</p></Card><Card title='Experiments' subtitle='Configured for this lab'><p className='text-3xl font-semibold'>{store.experiments.length}</p></Card><Card title='Pending Requests' subtitle='All shown in borrow and transactions'><p className='text-3xl font-semibold'>{pendingBorrowRequests.length}</p></Card></div>
    {!isTransactionsPage && !isAnalyticsPage ? <>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'><h2 className='text-xl font-semibold'>Chemical Inventory</h2><Button variant='outline' onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Chemical</Button></div>
      <Table headers={inventoryHeaders} rows={store.inventory.map((item) => ({ ...item, highlight: Number(item.quantity || 0) <= Number(item.minThreshold || 0) }))} />
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'><div><h2 className='text-xl font-semibold'>Experiments In This Lab</h2><p className='text-sm text-slate-500 dark:text-slate-400'>Experiment object, required inventory, and estimated expense are managed together here.</p></div><div className='flex gap-2'><Button variant='outline' onClick={() => setCreateOpen(true)}><Plus size={16} /> Add Inventory First</Button><Button onClick={() => setExperimentOpen(true)}><Plus size={16} /> Add Experiment</Button></div></div>
      <Table headers={experimentHeaders} rows={store.experiments} />
      <Card title='Pending Borrow Requests' subtitle='Both chemical and experiment requests are reviewed here'><div className='space-y-3'>{pendingBorrowRequests.length ? pendingBorrowRequests.map((tx) => <div key={tx.id} className='rounded-lg bg-slate-50 p-4 dark:bg-slate-800'><p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{tx.requestCategory === 'experiment' ? `${tx.experimentTitle || tx.itemName} experiment request` : `${tx.itemName} requested`} by {tx.requesterName}</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{tx.requestCategory === 'experiment' ? `${tx.teamName ? `${tx.teamName} • ` : ''}${tx.memberCount || 1} participant${Number(tx.memberCount || 1) > 1 ? 's' : ''}` : `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`} | {tx.requesterEmail}</p><p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Purpose: {tx.purpose || 'N/A'}</p><div className='mt-3 flex gap-2'>{tx.requestCategory === 'experiment' ? <><Button className='px-3 py-1 text-xs' onClick={() => reviewExperimentRequest(tx.id, 'approved')} disabled={reviewingExperimentRequestId === tx.id}>{reviewingExperimentRequestId === tx.id ? 'Working...' : 'Approve'}</Button><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => reviewExperimentRequest(tx.id, 'rejected')} disabled={reviewingExperimentRequestId === tx.id}>Reject</Button></> : <><Button className='px-3 py-1 text-xs' onClick={() => reviewBorrow(tx.id, 'approved')} disabled={reviewingId === tx.id}>{reviewingId === tx.id ? 'Working...' : 'Approve'}</Button><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => reviewBorrow(tx.id, 'rejected')} disabled={reviewingId === tx.id}>Reject</Button></>}</div></div>) : <p className='text-sm text-slate-500'>No pending borrow requests right now.</p>}</div></Card>
      <Card title='Student Access Control' subtitle='Block or unblock users if needed'><div className='space-y-3'>{students.length ? students.map((student) => <div key={student.id} className='flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800'><div><p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{student.name}</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{student.email}</p><p className={`mt-2 text-xs font-medium ${student.isBlocked ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{student.isBlocked ? 'Blocked' : 'Active'}</p></div><Button variant='outline' className={`px-3 py-1 text-xs ${student.isBlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`} onClick={() => toggleStudentBlock(student)} disabled={blockingUserId === student.id}>{blockingUserId === student.id ? 'Saving...' : student.isBlocked ? 'Unblock' : 'Block'}</Button></div>) : <p className='text-sm text-slate-500'>No students linked yet.</p>}</div></Card>
    </> : isAnalyticsPage ? <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'><Card title='Low Stock Chemicals' subtitle='At or below threshold'><p className='text-3xl font-semibold'>{lowStockCount}</p></Card><Card title='Estimated Experiment Spend' subtitle='Total experiment expenses'><p className='text-3xl font-semibold'>Rs. {experimentSpend.toFixed(2)}</p></Card><Card title='Pending Inventory Borrows' subtitle='Chemical requests awaiting review'><p className='text-3xl font-semibold'>{pendingInventoryRequests.length}</p></Card><Card title='Pending Experiment Borrows' subtitle='Experiment requests awaiting review'><p className='text-3xl font-semibold'>{pendingExperimentRequests.length}</p></Card></div> : <div className='space-y-4'><div className='flex items-center justify-between gap-3'><h2 className='text-xl font-semibold'>Transactions</h2><Button variant='outline' onClick={downloadTransactionsPdf} disabled={!store.transactions.length}><Download size={16} /> Download PDF</Button></div><Card title='Recent Transactions' subtitle='Borrow, experiment-request, and return activity'>{store.transactions.length ? <div className='space-y-3'>{store.transactions.map((tx) => <div key={tx.id} className='rounded-lg bg-slate-50 p-4 dark:bg-slate-800'><p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{tx.requestCategory === 'experiment' ? `${tx.experimentTitle || tx.itemName} | Complete experiment request` : `${tx.itemName} | ${tx.quantity} ${tx.itemId?.quantityUnit || ''}`} | {tx.requesterName}</p><p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{tx.requesterEmail} | {tx.status}</p><p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Purpose: {tx.purpose || 'N/A'}</p></div>)}</div> : <p className='text-sm text-slate-500'>No transactions yet.</p>}</Card></div>}
    <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Add Chemical To Inventory'><div className='space-y-4'>{modalFields(newItem, setNewItem, autofillingCas, lastAutofilledCas, setAutofillingCas, setLastAutofilledCas, casLookupMessage, casLookupType, setCasLookupMessage, setCasLookupType)}<div className='rounded-lg border border-dashed border-[#cfd8bd] bg-[#f9faef] px-4 py-3 text-xs text-[#71805a] dark:border-[#4e5d35] dark:bg-[#1f2419] dark:text-[#c5d0b5]'>PubChem autofill does not save automatically. Review the fields, enter quantity, then click Save chemical.</div><Button className='w-full' onClick={handleAddItem} disabled={savingItem || !labId || autofillingCas}>{savingItem ? 'Saving...' : 'Save chemical'}</Button></div></Modal>
    <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Chemical'><div className='space-y-4'>{modalFields(editItem, setEditItem, editAutofillingCas, lastEditAutofilledCas, setEditAutofillingCas, setLastEditAutofilledCas, editCasLookupMessage, editCasLookupType, setEditCasLookupMessage, setEditCasLookupType)}<Button className='w-full' onClick={handleEditItem} disabled={savingEdit || editAutofillingCas}>{savingEdit ? 'Saving...' : 'Save changes'}</Button></div></Modal>
    <Modal open={experimentOpen} onClose={() => setExperimentOpen(false)} title='Add Experiment'><div className='space-y-4'><Input label='Experiment title' value={experimentForm.title} onChange={(e) => setExperimentForm((s) => ({ ...s, title: e.target.value }))} /><Input label='Experiment object' value={experimentForm.experimentObject} onChange={(e) => setExperimentForm((s) => ({ ...s, experimentObject: e.target.value }))} /><textarea value={experimentForm.description} onChange={(e) => setExperimentForm((s) => ({ ...s, description: e.target.value }))} placeholder='Experiment description' rows={3} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-sm text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]' /><textarea value={experimentForm.procedure} onChange={(e) => setExperimentForm((s) => ({ ...s, procedure: e.target.value }))} placeholder='Procedure / steps' rows={4} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-sm text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]' /><div className='rounded-xl border border-[#d9e1ca] p-4 dark:border-[#414a33]'><div className='mb-3 flex items-center justify-between'><div><p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>Required Inventory</p><p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>If a chemical is missing, add it first from this same dashboard.</p></div><Button variant='outline' className='px-3 py-1 text-xs' onClick={() => setCreateOpen(true)}><Plus size={14} /> Add Chemical</Button></div><div className='space-y-3'>{experimentForm.requiredInventory.map((entry, index) => <div key={`req-${index}`} className='grid gap-3 rounded-lg bg-[#f7f8f1] p-3 dark:bg-[#28301f] lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]'><label className='relative block text-sm text-slate-700 dark:text-slate-300'><span className='mb-1 block text-xs font-medium tracking-wide'>Chemical</span><select value={entry.inventoryItemId} onChange={(e) => { const selected = store.inventory.find((item) => item.id === e.target.value); setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, inventoryItemId: e.target.value, quantityUnit: selected?.quantityUnit || 'mL' } : current) })); }} className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'><option value=''>Select chemical</option>{store.inventory.map((item) => <option key={item.id} value={item.id}>{item.chemicalName} ({item.quantity} {item.quantityUnit})</option>)}</select></label><Input label='Required qty' type='number' value={entry.quantity} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantity: e.target.value } : current) }))} /><SelectUnit value={entry.quantityUnit} onChange={(e) => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.map((current, i) => i === index ? { ...current, quantityUnit: e.target.value } : current) }))} /><div className='flex items-end'><Button variant='outline' className='px-3 py-2 text-xs text-red-700 dark:text-red-300' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: s.requiredInventory.filter((_, i) => i !== index) }))} disabled={experimentForm.requiredInventory.length === 1}>Remove</Button></div></div>)}</div><Button variant='outline' className='mt-3 px-3 py-1 text-xs' onClick={() => setExperimentForm((s) => ({ ...s, requiredInventory: [...s.requiredInventory, { inventoryItemId: '', quantity: '', quantityUnit: 'mL' }] }))}><Plus size={14} /> Add Another Chemical</Button></div><Button className='w-full' onClick={handleCreateExperiment} disabled={savingExperiment}>{savingExperiment ? 'Saving...' : 'Save experiment'}</Button></div></Modal>
    <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Chemical'><div className='space-y-4'><p className='text-sm text-slate-600 dark:text-slate-300'>{deleteTarget ? `Delete ${deleteTarget.chemicalName || deleteTarget.name} from inventory?` : ''}</p><div className='flex gap-3'><Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)}>Cancel</Button><Button variant='danger' className='w-full' onClick={async () => { try { await store.deleteInventoryItem(deleteTarget.id); store.setToast({ type: 'success', message: `${deleteTarget.chemicalName || deleteTarget.name} deleted.` }); setDeleteTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete chemical.' }); } }}>Delete</Button></div></div></Modal>
    <Modal open={Boolean(deleteExperimentTarget)} onClose={() => setDeleteExperimentTarget(null)} title='Delete Experiment'><div className='space-y-4'><p className='text-sm text-slate-600 dark:text-slate-300'>{deleteExperimentTarget ? `Delete experiment ${deleteExperimentTarget.title}?` : ''}</p><div className='flex gap-3'><Button variant='outline' className='w-full' onClick={() => setDeleteExperimentTarget(null)}>Cancel</Button><Button variant='danger' className='w-full' onClick={async () => { try { await store.deleteExperiment(deleteExperimentTarget.id); store.setToast({ type: 'success', message: `${deleteExperimentTarget.title} deleted.` }); setDeleteExperimentTarget(null); } catch (error) { store.setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete experiment.' }); } }}>Delete</Button></div></div></Modal>
  </div>;
}
