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
const EMPTY_ITEM_FORM = {
  itemCode: '',
  name: '',
  category: '',
  quantity: '',
  quantityUnit: UNIT_OPTIONS[4],
  storageLocation: '',
  lotNumber: '',
  expiryDate: '',
  minThreshold: '5',
  abstract: '',
  pubmedId: ''
};

export default function LabAdminDashboard() {
  const { labs, inventory, users, fetchLabs, fetchUsers, fetchInventory, transactions, fetchTransactions, createInventoryItem, updateInventoryItem, deleteInventoryItem, approveBorrowRequest, rejectBorrowRequest, setUserBlockedState, setToast, setHighlight } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const assignedLabs = useMemo(() => {
    const currentUserId = String(user?.id || user?._id || '');
    return labs.filter((lab) => Array.isArray(lab.admins) && lab.admins.some((admin) => String(admin.id || admin._id || admin) === currentUserId));
  }, [labs, user]);
  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  const labId = selectedLabId || assignedLabs[0]?.id || assignedLabs[0]?._id || user?.labId || '';
  const isTransactionsPage = location.pathname === '/transactions';
  const isAnalyticsPage = location.pathname === '/analytics';
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [savingItem, setSavingItem] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState('');
  const [reviewingId, setReviewingId] = useState('');
  const [blockingUserId, setBlockingUserId] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [appliedTransactionCode, setAppliedTransactionCode] = useState('');
  const [newItem, setNewItem] = useState(EMPTY_ITEM_FORM);
  const [editItem, setEditItem] = useState(EMPTY_ITEM_FORM);

  useEffect(() => {
    if (!assignedLabs.length) return;

    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  const currentLab = useMemo(
    () => assignedLabs.find((entry) => String(entry.id || entry._id) === String(labId)) || labs.find((entry) => String(entry.id || entry._id) === String(labId)),
    [assignedLabs, labId, labs]
  );

  useEffect(() => {
    if (!labId) return;
    fetchLabs();
    fetchInventory(labId);
    fetchTransactions({ labId, itemCode: isTransactionsPage ? appliedTransactionCode : '' });
    fetchUsers();
  }, [appliedTransactionCode, fetchInventory, fetchTransactions, fetchLabs, fetchUsers, isTransactionsPage, labId]);

  useEffect(() => {
    if (!labId) return undefined;

    const intervalId = setInterval(() => {
      fetchInventory(labId);
      fetchTransactions({ labId, itemCode: isTransactionsPage ? appliedTransactionCode : '' });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [appliedTransactionCode, fetchInventory, fetchTransactions, isTransactionsPage, labId]);

  const triage = inventory.filter((item) => item.quantity <= 5).length;
  const pendingRequests = transactions.filter((tx) => tx.status === 'pending' && tx.type === 'borrow');
  const approvedRequests = transactions.filter((tx) => tx.status === 'approved' && tx.type === 'borrow');
  const rejectedRequests = transactions.filter((tx) => tx.status === 'rejected' && tx.type === 'borrow');
  const totalRequests = pendingRequests.length + approvedRequests.length + rejectedRequests.length;
  const categoryStats = Object.values(
    inventory.reduce((acc, item) => {
      const key = item.category || 'General';
      if (!acc[key]) {
        acc[key] = { label: key, count: 0, quantity: 0 };
      }
      acc[key].count += 1;
      acc[key].quantity += Number(item.quantity || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);
  const topInventory = [...inventory]
    .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
    .slice(0, 5);
  const expiringItems = inventory
    .filter((item) => item.expiryDate)
    .map((item) => ({
      ...item,
      daysLeft: Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);
  const upcomingExpiries = expiringItems.filter((item) => item.daysLeft >= 0 && item.daysLeft <= 30);
  const expiredItems = inventory
    .filter((item) => item.expiryDate)
    .map((item) => ({
      ...item,
      daysLeft: Math.ceil((new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((item) => item.daysLeft < 0);
  const maxCategoryCount = Math.max(...categoryStats.map((item) => item.count), 1);
  const totalQuantity = inventory.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalThresholdGap = inventory.reduce((sum, item) => {
    const gap = Number(item.minThreshold || 0) - Number(item.quantity || 0);
    return gap > 0 ? sum + gap : sum;
  }, 0);
  const healthyItems = inventory.filter((item) => Number(item.quantity || 0) > Number(item.minThreshold || 0)).length;
  const thresholdAtRisk = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minThreshold || 0)).length;
  const approvalRate = totalRequests ? Math.round((approvedRequests.length / totalRequests) * 100) : 0;
  const rejectionRate = totalRequests ? Math.round((rejectedRequests.length / totalRequests) * 100) : 0;
  const mostRequestedItems = Object.values(
    transactions.reduce((acc, tx) => {
      const key = tx.itemCode || tx.itemName || 'UNKNOWN';
      if (!acc[key]) {
        acc[key] = {
          id: key,
          label: tx.itemName || 'Unknown item',
          code: tx.itemCode || 'NO-CODE',
          requests: 0,
          quantity: 0,
        };
      }
      acc[key].requests += 1;
      acc[key].quantity += Number(tx.quantity || 0);
      return acc;
    }, {})
  )
    .sort((a, b) => b.requests - a.requests || b.quantity - a.quantity)
    .slice(0, 5);
  const actionQueue = [
    ...inventory
      .filter((item) => Number(item.quantity || 0) <= Number(item.minThreshold || 0))
      .map((item) => ({
        id: `stock-${item.id || item._id}`,
        title: item.name,
        subtitle: `${item.itemCode} in ${item.storageLocation || 'unassigned storage'}`,
        status: 'Low stock',
        tone: 'rose',
        metric: `${item.quantity}/${item.minThreshold} ${item.quantityUnit || 'units'}`,
      })),
    ...upcomingExpiries.map((item) => ({
      id: `expiry-${item.id || item._id}`,
      title: item.name,
      subtitle: `${item.itemCode} expires on ${new Date(item.expiryDate).toLocaleDateString()}`,
      status: item.daysLeft <= 7 ? 'Expires this week' : 'Expiring soon',
      tone: 'amber',
      metric: `${item.daysLeft} days left`,
    })),
    ...pendingRequests.map((tx) => ({
      id: `request-${tx.id}`,
      title: tx.itemName,
      subtitle: `${tx.requesterName} requested ${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
      status: 'Approval pending',
      tone: 'sky',
      metric: tx.neededUntil ? `Needed by ${new Date(tx.neededUntil).toLocaleDateString()}` : 'Needs review',
    })),
  ].slice(0, 8);

  const duplicateCodeExists = inventory.some((item) => item.itemCode?.toUpperCase() === newItem.itemCode.trim().toUpperCase());
  const students = users.filter((entry) => entry.role === 'student' && (!entry.labId || String(entry.labId) === String(labId)));

  const openEditModal = (row) => {
    setEditItem({
      id: row.id,
      itemCode: row.itemCode || '',
      name: row.name || '',
      category: row.category || '',
      quantity: String(row.quantity ?? ''),
      quantityUnit: row.quantityUnit || UNIT_OPTIONS[4],
      storageLocation: row.storageLocation || '',
      lotNumber: row.lotNumber || '',
      expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString().slice(0, 10) : '',
      minThreshold: String(row.minThreshold ?? 5),
      abstract: row.abstract || '',
      pubmedId: row.pubmedId || ''
    });
    setEditOpen(true);
  };

  const headers = [
    { key: 'itemCode', label: 'Code' },
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'storageLocation', label: 'Storage' },
    {
      key: 'quantity',
      label: 'Qty',
      render: (row) => `${row.quantity} ${row.quantityUnit || 'units'}`
    },

    {
      key: 'status',
      label: 'Low Stock',
      render: (row) => (
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            row.quantity <= 5
              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-800 dark:text-emerald-200'
          }`}
        >
          {row.quantity <= 5 ? 'Critical' : 'OK'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' onClick={() => openEditModal(row)} className='px-3 py-1 text-xs'>
            <Pencil size={14} /> Edit
          </Button>
          <Button variant='outline' onClick={() => setDeleteTarget(row)} className='px-3 py-1 text-xs text-red-700 dark:text-red-300'>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )
    }
  ];

  const rows = inventory.map((item) => ({ ...item, id: item._id || item.id }));

  const addItem = async () => {
    if (!labId || !newItem.itemCode.trim() || !newItem.name.trim() || !newItem.category.trim() || !newItem.quantity || !newItem.quantityUnit.trim()) return;
    if (duplicateCodeExists) {
      setToast({ type: 'error', message: 'This item is already listed.' });
      return;
    }

    setSavingItem(true);
    try {
      const item = await createInventoryItem({
        labId,
        itemCode: newItem.itemCode.trim().toUpperCase(),
        name: newItem.name.trim(),
        category: newItem.category.trim(),
        quantity: newItem.quantity,
        quantityUnit: newItem.quantityUnit.trim(),
        storageLocation: newItem.storageLocation.trim(),
        lotNumber: newItem.lotNumber.trim(),
        expiryDate: newItem.expiryDate,
        minThreshold: newItem.minThreshold || 5,
        abstract: newItem.abstract?.trim() || '',
        pubmedId: newItem.pubmedId?.trim() || ''
      });
      setToast({ type: 'success', message: `${item.name} added` });
      setHighlight(item.id);
      setCreateOpen(false);
      setNewItem(EMPTY_ITEM_FORM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to add item.' });
    } finally {
      setSavingItem(false);
    }
  };

  const saveEditedItem = async () => {
    if (!editItem.id || !editItem.itemCode.trim() || !editItem.name.trim() || !editItem.category.trim() || !editItem.quantity || !editItem.quantityUnit.trim()) return;

    setSavingEdit(true);
    try {
      const updatedItem = await updateInventoryItem(editItem.id, {
        itemCode: editItem.itemCode.trim().toUpperCase(),
        itemName: editItem.name.trim(),
        category: editItem.category.trim(),
        quantity: Number(editItem.quantity),
        quantityUnit: editItem.quantityUnit.trim(),
        storageLocation: editItem.storageLocation.trim(),
        lotNumber: editItem.lotNumber.trim(),
        expiryDate: editItem.expiryDate || null,
        minThreshold: Number(editItem.minThreshold || 5),
        abstract: editItem.abstract?.trim() || '',
        pubmedId: editItem.pubmedId?.trim() || ''
      });
      setToast({ type: 'success', message: `${updatedItem.name} updated` });
      setHighlight(updatedItem.id);
      setEditOpen(false);
      setEditItem(EMPTY_ITEM_FORM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update item.' });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteTarget?.id) return;

    setDeletingItemId(deleteTarget.id);
    try {
      await deleteInventoryItem(deleteTarget.id);
      setToast({ type: 'success', message: `${deleteTarget.name} deleted.` });
      setDeleteTarget(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete item.' });
    } finally {
      setDeletingItemId('');
    }
  };

  const handleTransactionSearch = async () => {
    if (!labId) return;

    const nextCode = transactionSearch.trim().toUpperCase();
    setAppliedTransactionCode(nextCode);
    await fetchTransactions({ labId, itemCode: nextCode });
  };

  const clearTransactionSearch = async () => {
    if (!labId) return;

    setTransactionSearch('');
    setAppliedTransactionCode('');
    await fetchTransactions({ labId, itemCode: '' });
  };

  const handleApproveRequest = async (transactionId) => {
    setReviewingId(transactionId);
    try {
      await approveBorrowRequest(transactionId);
      await Promise.all([fetchInventory(labId), fetchTransactions({ labId, itemCode: isTransactionsPage ? appliedTransactionCode : '' })]);
      setToast({ type: 'success', message: 'Borrow request approved.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve request.' });
    } finally {
      setReviewingId('');
    }
  };

  const handleRejectRequest = async (transactionId) => {
    setReviewingId(transactionId);
    try {
      await rejectBorrowRequest(transactionId);
      await fetchTransactions({ labId, itemCode: isTransactionsPage ? appliedTransactionCode : '' });
      setToast({ type: 'success', message: 'Borrow request rejected.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to reject request.' });
    } finally {
      setReviewingId('');
    }
  };

  const handleToggleStudentBlock = async (student) => {
    setBlockingUserId(student.id);
    try {
      await setUserBlockedState({
        userId: student.id,
        isBlocked: !student.isBlocked,
        blockedReason: student.isBlocked ? '' : 'Blocked by lab admin due to spam or misuse.',
      });
      await fetchUsers();
      setToast({ type: 'success', message: `${student.name} ${student.isBlocked ? 'unblocked' : 'blocked'}.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update student access.' });
    } finally {
      setBlockingUserId('');
    }
  };

  const downloadTransactionsPdf = () => {
    if (!transactions.length) {
      setToast({ type: 'error', message: 'No transactions available to download.' });
      return;
    }

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const now = new Date();
    const createdAt = now.toLocaleString();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 40;
    const right = pageWidth - 40;
    const bottom = pageHeight - 40;

    const cols = {
      date: left,
      item: left + 110,
      requester: left + 230,
      type: left + 360,
      qty: left + 420,
      status: left + 470
    };

    let y = 70;

    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Lab Transactions Report', left, 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${createdAt}`, left, 56);
      if (user?.labId) {
        doc.text(`Lab ID: ${user.labId}`, right, 56, { align: 'right' });
      }

      y = 84;
      doc.setDrawColor(180);
      doc.line(left, y, right, y);
      y += 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Date', cols.date, y);
      doc.text('Item', cols.item, y);
      doc.text('Requester', cols.requester, y);
      doc.text('Type', cols.type, y);
      doc.text('Qty', cols.qty, y);
      doc.text('Status', cols.status, y);
      y += 8;
      doc.line(left, y, right, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
    };

    const addPageIfNeeded = (neededHeight = 16) => {
      if (y + neededHeight <= bottom) return;
      doc.addPage();
      drawHeader();
    };

    drawHeader();

    transactions.forEach((tx) => {
      const dateLabel = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A';
      const itemLabel = [tx.itemName, tx.itemCode ? `(${tx.itemCode})` : ''].filter(Boolean).join(' ') || 'N/A';
      const requesterLabel = tx.requesterName || tx.requesterEmail || 'N/A';
      const typeLabel = tx.type || 'borrow';
      const qtyLabel = `${tx.quantity || 0} ${tx.itemId?.quantityUnit || ''}`.trim();
      const statusLabel = tx.status || 'pending';

      const rowDate = doc.splitTextToSize(dateLabel, 90);
      const rowItem = doc.splitTextToSize(itemLabel, 110);
      const rowRequester = doc.splitTextToSize(requesterLabel, 120);
      const rowType = doc.splitTextToSize(typeLabel, 50);
      const rowQty = doc.splitTextToSize(qtyLabel, 45);
      const rowStatus = doc.splitTextToSize(statusLabel, 60);

      const lineCount = Math.max(
        rowDate.length,
        rowItem.length,
        rowRequester.length,
        rowType.length,
        rowQty.length,
        rowStatus.length
      );
      const rowHeight = Math.max(16, lineCount * 12 + 6);

      addPageIfNeeded(rowHeight + 14);

      doc.text(rowDate, cols.date, y);
      doc.text(rowItem, cols.item, y);
      doc.text(rowRequester, cols.requester, y);
      doc.text(rowType, cols.type, y);
      doc.text(rowQty, cols.qty, y);
      doc.text(rowStatus, cols.status, y);

      y += rowHeight;
      doc.setDrawColor(225);
      doc.line(left, y, right, y);
      y += 12;
    });

    const fileDate = now.toISOString().slice(0, 10);
    doc.save(`lab-transactions-${fileDate}.pdf`);
    setToast({ type: 'success', message: 'Transactions PDF downloaded.' });
  };

  return (
    <div className='space-y-6 pb-10'>
      {!assignedLabs.length ? (
        <Card title='Lab Not Assigned' subtitle='This lab admin account is not linked to a lab yet'>
          <p className='text-sm text-slate-500 dark:text-slate-400'>Ask the super admin to assign this account to a lab from the Manage dialog.</p>
        </Card>
      ) : (
        <>
          <div className='rounded-xl border border-[#d9e1ca] bg-[#f9faef] px-4 py-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>
                  You are admin of {assignedLabs.length} lab{assignedLabs.length > 1 ? 's' : ''}
                </p>
                <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                  Current dashboard: {currentLab?.name || 'Assigned Lab'}{currentLab?.labCode ? ` (${currentLab.labCode})` : ''}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {assignedLabs.map((lab) => {
                  const labKey = String(lab.id || lab._id);
                  const isActive = labKey === String(labId);
                  return (
                    <Button
                      key={labKey}
                      variant={isActive ? 'primary' : 'outline'}
                      className='px-3 py-1 text-xs'
                      onClick={() => {
                        setSelectedLabId(labKey);
                        localStorage.setItem('pharmlab-active-lab', labKey);
                      }}
                    >
                      {lab.labName || lab.name || 'Lab'}{lab.labCode ? ` • ${lab.labCode}` : ''}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <Card title='Inventory Value' subtitle='Real-time items'>
              <p className='text-3xl font-semibold'>{inventory.length}</p>
            </Card>
            <Card title='Low Stock' subtitle='Count under threshold'>
              <p className='text-3xl font-semibold'>{triage}</p>
            </Card>
            <Card title='Recent Actions' subtitle='Live updates in feed'>
              <p className='text-3xl font-semibold'>{transactions.slice(0, 5).length}</p>
            </Card>
            <Card title='Pending Requests' subtitle='Borrow requests awaiting your approval'>
              <p className='text-3xl font-semibold'>{pendingRequests.length}</p>
            </Card>
          </div>
          {!isTransactionsPage && !isAnalyticsPage ? (
            <>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-semibold'>Inventory</h2>
                <Button variant='outline' onClick={() => setCreateOpen(true)}><Plus size={16}/> Add Item</Button>
              </div>
              <Table headers={headers} rows={rows.map((item) => ({ ...item, highlight: item.quantity <= 5 ? true : false }))} />
              <div>
                <h3 className='mt-6 text-lg font-semibold'>Pending Borrow Requests</h3>
                <div className='mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700'>
                  {pendingRequests.length === 0 ? (
                    <p className='text-sm text-slate-500'>No pending requests right now</p>
                  ) : (
                    pendingRequests.map((tx) => (
                      <div key={tx.id} className='rounded-lg bg-slate-50 p-4 dark:bg-slate-800'>
                        <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                          {tx.itemName} - {tx.quantity} {tx.itemId?.quantityUnit || ''} requested by {tx.requesterName}
                        </p>
                        <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                          {tx.requesterEmail} | Needed until {tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'N/A'}
                        </p>
                        <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Purpose: {tx.purpose || 'N/A'}</p>
                        <div className='mt-3 flex gap-2'>
                          <Button className='text-xs px-3 py-1' onClick={() => handleApproveRequest(tx.id)} disabled={reviewingId === tx.id}>
                            {reviewingId === tx.id ? 'Working...' : 'Approve'}
                          </Button>
                          <Button variant='outline' className='text-xs px-3 py-1' onClick={() => handleRejectRequest(tx.id)} disabled={reviewingId === tx.id}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className='mt-6 text-lg font-semibold'>Student Access Control</h3>
                <div className='mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700'>
                  {students.length === 0 ? (
                    <p className='text-sm text-slate-500'>No students linked yet.</p>
                  ) : (
                    students.map((student) => (
                      <div key={student.id} className='flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-800'>
                        <div>
                          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{student.name}</p>
                          <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{student.email}</p>
                          <p className={`mt-2 text-xs font-medium ${student.isBlocked ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                            {student.isBlocked ? `Blocked${student.blockedReason ? `: ${student.blockedReason}` : ''}` : 'Active'}
                          </p>
                        </div>
                        <Button
                          variant='outline'
                          className={`px-3 py-1 text-xs ${student.isBlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
                          onClick={() => handleToggleStudentBlock(student)}
                          disabled={blockingUserId === student.id}
                        >
                          {blockingUserId === student.id ? 'Saving...' : student.isBlocked ? 'Unblock' : 'Block'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : isAnalyticsPage ? (
            <div className='space-y-6'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='text-xl font-semibold'>Analytics</h2>
                  <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>Operational insight for stock health, request performance, and immediate lab priorities.</p>
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                <Card title='Stock Coverage' subtitle='Items above threshold'>
                  <p className='text-3xl font-semibold'>{inventory.length ? Math.round((healthyItems / inventory.length) * 100) : 0}%</p>
                  <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>{healthyItems} healthy items, {thresholdAtRisk} at risk</p>
                </Card>
                <Card title='Approval Rate' subtitle='Borrow requests approved'>
                  <p className='text-3xl font-semibold'>{approvalRate}%</p>
                  <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>{approvedRequests.length} of {totalRequests} requests approved</p>
                </Card>
                <Card title='Expiry Pressure' subtitle='Needs action within 30 days'>
                  <p className='text-3xl font-semibold'>{upcomingExpiries.length + expiredItems.length}</p>
                  <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>{expiredItems.length} expired, {upcomingExpiries.length} upcoming</p>
                </Card>
                <Card title='Restock Gap' subtitle='Units needed to reach threshold'>
                  <p className='text-3xl font-semibold'>{totalThresholdGap}</p>
                  <p className='mt-2 text-sm text-slate-500 dark:text-slate-400'>Across {thresholdAtRisk} understocked items</p>
                </Card>
              </div>
              <div className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
                <Card title='Action Queue' subtitle='Highest-priority items and requests'>
                  <div className='space-y-3'>
                    {actionQueue.length === 0 ? (
                      <p className='text-sm text-slate-500 dark:text-slate-400'>Everything looks stable right now.</p>
                    ) : (
                      actionQueue.map((entry) => (
                        <div key={entry.id} className='flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700'>
                          <div>
                            <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>{entry.title}</p>
                            <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>{entry.subtitle}</p>
                          </div>
                          <div className='text-right'>
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                              entry.tone === 'rose'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                : entry.tone === 'amber'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                  : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                            }`}>
                              {entry.status}
                            </span>
                            <p className='mt-2 text-xs text-slate-500 dark:text-slate-400'>{entry.metric}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card title='Request Funnel' subtitle='Live approval performance'>
                  <div className='grid gap-3 sm:grid-cols-3'>
                    <div className='rounded-xl bg-amber-50 p-4 dark:bg-amber-900/20'>
                      <p className='text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300'>Pending</p>
                      <p className='mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100'>{pendingRequests.length}</p>
                    </div>
                    <div className='rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20'>
                      <p className='text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300'>Approved</p>
                      <p className='mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100'>{approvedRequests.length}</p>
                    </div>
                    <div className='rounded-xl bg-rose-50 p-4 dark:bg-rose-900/20'>
                      <p className='text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300'>Rejected</p>
                      <p className='mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100'>{rejectedRequests.length}</p>
                    </div>
                  </div>
                  <div className='mt-4 space-y-3'>
                    <div className='flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>Approval rate</span>
                      <span className='text-lg font-semibold text-slate-900 dark:text-slate-100'>{approvalRate}%</span>
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>Rejection rate</span>
                      <span className='text-lg font-semibold text-slate-900 dark:text-slate-100'>{rejectionRate}%</span>
                    </div>
                    <div className='flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                      <span className='text-sm text-slate-500 dark:text-slate-400'>Tracked requests</span>
                      <span className='text-lg font-semibold text-slate-900 dark:text-slate-100'>{totalRequests}</span>
                    </div>
                  </div>
                </Card>
                <Card title='Category Distribution' subtitle='Where inventory is concentrated'>
                  <div className='space-y-3'>
                    {categoryStats.length === 0 ? (
                      <p className='text-sm text-slate-500 dark:text-slate-400'>Add some inventory items to generate category analytics.</p>
                    ) : (
                      categoryStats.map((entry) => (
                        <div key={entry.label} className='space-y-1'>
                          <div className='flex items-center justify-between text-sm'>
                            <span className='font-medium text-slate-700 dark:text-slate-200'>{entry.label}</span>
                            <span className='text-slate-500 dark:text-slate-400'>{entry.count} items • {entry.quantity} total qty</span>
                          </div>
                          <div className='h-2 overflow-hidden rounded-full bg-[#edf1e3] dark:bg-[#28301f]'>
                            <div
                              className='h-full rounded-full bg-gradient-to-r from-[#556b2f] to-[#7a8f4b]'
                              style={{ width: `${(entry.count / maxCategoryCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card title='Most Requested Items' subtitle='Demand based on borrow activity'>
                  <div className='space-y-3'>
                    {mostRequestedItems.length === 0 ? (
                      <p className='text-sm text-slate-500 dark:text-slate-400'>No request history yet.</p>
                    ) : (
                      mostRequestedItems.map((item) => (
                        <div key={item.id} className='flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700'>
                          <div>
                            <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>{item.label}</p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>{item.code}</p>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>{item.requests} requests</p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>{item.quantity} units requested</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card title='Expiry Watchlist' subtitle='Items expiring soonest'>
                  <div className='space-y-3'>
                    {expiringItems.length === 0 ? (
                      <p className='text-sm text-slate-500 dark:text-slate-400'>No expiry dates recorded yet.</p>
                    ) : (
                      expiringItems.map((item) => (
                        <div key={item.id || item._id} className='flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700'>
                          <div>
                            <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>{item.name}</p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>{new Date(item.expiryDate).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-sm font-semibold ${
                            item.daysLeft < 0
                              ? 'text-rose-600'
                              : item.daysLeft <= 30
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}>
                            {item.daysLeft < 0 ? 'Expired' : `${item.daysLeft} days`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card title='Top Stocked Items' subtitle='Current on-hand leaders'>
                  <div className='space-y-3'>
                    {topInventory.length === 0 ? (
                      <p className='text-sm text-slate-500 dark:text-slate-400'>No inventory data yet.</p>
                    ) : (
                      topInventory.map((item) => (
                        <div key={item.id || item._id} className='flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700'>
                          <div>
                            <p className='text-sm font-medium text-slate-900 dark:text-slate-100'>{item.name}</p>
                            <p className='text-xs text-slate-500 dark:text-slate-400'>{item.category || 'General'}</p>
                          </div>
                          <span className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                            {item.quantity} {item.quantityUnit || ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
              <Card title='Inventory Totals' subtitle='High-level operational totals'>
                <div className='grid gap-3 md:grid-cols-4'>
                  <div className='rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                    <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>Tracked items</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100'>{inventory.length}</p>
                  </div>
                  <div className='rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                    <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>Total quantity</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100'>{totalQuantity}</p>
                  </div>
                  <div className='rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                    <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>Low stock items</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100'>{triage}</p>
                  </div>
                  <div className='rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800'>
                    <p className='text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400'>Pending approvals</p>
                    <p className='mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100'>{pendingRequests.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <div>
              <div className='flex items-center justify-between gap-3'>
                <h2 className='text-xl font-semibold'>Transactions</h2>
                <Button variant='outline' onClick={downloadTransactionsPdf} disabled={!transactions.length}>
                  <Download size={16} /> Download PDF
                </Button>
              </div>
              <div className='mt-3 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700 md:flex-row md:items-end'>
                <Input
                  label='Search by item code'
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value.toUpperCase())}
                  placeholder='Enter item code'
                  className='md:max-w-xs'
                />
                <Button onClick={handleTransactionSearch} className='px-4 py-2'>
                  Search
                </Button>
                <Button variant='outline' onClick={clearTransactionSearch} className='px-4 py-2'>
                  Clear
                </Button>
                <p className='text-sm text-slate-500 dark:text-slate-400'>
                  {appliedTransactionCode
                    ? `Showing transactions for item code ${appliedTransactionCode}`
                    : 'Search an item code to view all transactions for that inventory item.'}
                </p>
              </div>
              <div className='mt-3 space-y-3 rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700'>
                {transactions.length === 0 ? (
                  <p className='text-sm text-slate-500'>No transactions yet</p>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className='rounded-lg bg-slate-50 p-4 dark:bg-slate-800'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-slate-900 dark:text-slate-100'>
                            {tx.itemName} • {tx.quantity} {tx.itemId?.quantityUnit || ''} requested by {tx.requesterName}
                          </p>
                          <p className='mt-1 text-xs text-slate-500 dark:text-slate-400'>
                            {tx.requesterEmail} | Needed until {tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className='mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400'>
                            Item code: {tx.itemCode || 'NO-CODE'}
                          </p>
                          <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Purpose: {tx.purpose || 'N/A'}</p>
                          {tx.notes ? <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>Notes: {tx.notes}</p> : null}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          tx.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : tx.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : tx.status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                      {tx.status === 'pending' ? (
                        <div className='mt-3 flex gap-2'>
                          <Button className='text-xs px-3 py-1' onClick={() => handleApproveRequest(tx.id)} disabled={reviewingId === tx.id}>
                            {reviewingId === tx.id ? 'Working...' : 'Approve'}
                          </Button>
                          <Button variant='outline' className='text-xs px-3 py-1' onClick={() => handleRejectRequest(tx.id)} disabled={reviewingId === tx.id}>
                            Reject
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Add Inventory Item'>
        <div className='space-y-4'>
          <Input label='Item code' value={newItem.itemCode} onChange={(e) => setNewItem((s) => ({ ...s, itemCode: e.target.value.toUpperCase() }))} placeholder='HN03' />
          {newItem.itemCode.trim() && duplicateCodeExists ? (
            <p className='text-sm text-red-600 dark:text-red-300'>This item is already listed.</p>
          ) : null}
          <Input label='Item name' value={newItem.name} onChange={(e) => setNewItem((s) => ({ ...s, name: e.target.value }))} />
          <Input label='Category' value={newItem.category} onChange={(e) => setNewItem((s) => ({ ...s, category: e.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Quantity' type='number' value={newItem.quantity} onChange={(e) => setNewItem((s) => ({ ...s, quantity: e.target.value }))} />
            <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
              <select
                value={newItem.quantityUnit}
                onChange={(e) => setNewItem((s) => ({ ...s, quantityUnit: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] transition focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Storage location' value={newItem.storageLocation} onChange={(e) => setNewItem((s) => ({ ...s, storageLocation: e.target.value }))} placeholder='Shelf A2, Cold room, Cabinet 3' />
            <Input label='Lot / batch number' value={newItem.lotNumber} onChange={(e) => setNewItem((s) => ({ ...s, lotNumber: e.target.value }))} />
          </div>
          <Input label='Expiry date' type='date' value={newItem.expiryDate} onChange={(e) => setNewItem((s) => ({ ...s, expiryDate: e.target.value }))} />
          <Input label='Low stock threshold' type='number' value={newItem.minThreshold} onChange={(e) => setNewItem((s) => ({ ...s, minThreshold: e.target.value }))} />
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>PubMed Information (Optional)</p>
            <p className='mt-1 text-xs text-[#71805a] dark:text-[#a8b8a0]'>Use for chemical/drug items. Leave empty for non-chemical items.</p>
          </div>
          <Input label='PubMed ID' value={newItem.pubmedId} onChange={(e) => setNewItem((s) => ({ ...s, pubmedId: e.target.value }))} placeholder='e.g., 12345678' />
          <textarea
            placeholder='Chemical abstract (you can paste from PubMed or enter manually)'
            value={newItem.abstract}
            onChange={(e) => setNewItem((s) => ({ ...s, abstract: e.target.value }))}
            className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] text-sm transition focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
            rows={4}
          />
          <Button className='w-full' onClick={addItem} disabled={savingItem || !labId || duplicateCodeExists}>
            {savingItem ? 'Saving...' : 'Save item'}
          </Button>
        </div>
      </Modal>
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Inventory Item'>
        <div className='space-y-4'>
          <Input label='Item code' value={editItem.itemCode} onChange={(e) => setEditItem((s) => ({ ...s, itemCode: e.target.value.toUpperCase() }))} placeholder='HN03' />
          <Input label='Item name' value={editItem.name} onChange={(e) => setEditItem((s) => ({ ...s, name: e.target.value }))} />
          <Input label='Category' value={editItem.category} onChange={(e) => setEditItem((s) => ({ ...s, category: e.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Quantity' type='number' value={editItem.quantity} onChange={(e) => setEditItem((s) => ({ ...s, quantity: e.target.value }))} />
            <label className='relative block text-sm text-slate-700 dark:text-slate-300'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
              <select
                value={editItem.quantityUnit}
                onChange={(e) => setEditItem((s) => ({ ...s, quantityUnit: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] transition focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                {UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Storage location' value={editItem.storageLocation} onChange={(e) => setEditItem((s) => ({ ...s, storageLocation: e.target.value }))} />
            <Input label='Lot / batch number' value={editItem.lotNumber} onChange={(e) => setEditItem((s) => ({ ...s, lotNumber: e.target.value }))} />
          </div>
          <Input label='Expiry date' type='date' value={editItem.expiryDate} onChange={(e) => setEditItem((s) => ({ ...s, expiryDate: e.target.value }))} />
          <Input label='Low stock threshold' type='number' value={editItem.minThreshold} onChange={(e) => setEditItem((s) => ({ ...s, minThreshold: e.target.value }))} />
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>PubMed Information (Optional)</p>
            <p className='mt-1 text-xs text-[#71805a] dark:text-[#a8b8a0]'>Use for chemical/drug items. Leave empty for non-chemical items.</p>
          </div>
          <Input label='PubMed ID' value={editItem.pubmedId} onChange={(e) => setEditItem((s) => ({ ...s, pubmedId: e.target.value }))} placeholder='e.g., 12345678' />
          <textarea
            placeholder='Chemical abstract (you can paste from PubMed or enter manually)'
            value={editItem.abstract}
            onChange={(e) => setEditItem((s) => ({ ...s, abstract: e.target.value }))}
            className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-[#3c4e23] text-sm transition focus:outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
            rows={4}
          />
          <Button className='w-full' onClick={saveEditedItem} disabled={savingEdit}>
            {savingEdit ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Modal>
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Inventory Item'>
        <div className='space-y-4'>
          <p className='text-sm text-slate-600 dark:text-slate-300'>
            {deleteTarget ? `Delete ${deleteTarget.name} (${deleteTarget.itemCode}) from inventory? This action will be recorded in the audit log.` : ''}
          </p>
          <div className='flex gap-3'>
            <Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingItemId)}>
              Cancel
            </Button>
            <Button variant='danger' className='w-full' onClick={confirmDeleteItem} disabled={Boolean(deletingItemId)}>
              {deletingItemId ? 'Deleting...' : 'Delete item'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
