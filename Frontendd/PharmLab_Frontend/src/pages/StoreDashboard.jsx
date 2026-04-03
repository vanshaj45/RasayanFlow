import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Send, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import useAppStore from '../store/appStore';
import socket from '../services/socket';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const CATEGORY_OPTIONS = ['Glassware', 'Chemical'];
const CHEMICAL_UNITS = ['mL', 'L', 'uL', 'mg', 'g', 'kg'];

const EMPTY_STORE_ITEM = {
  itemCode: '',
  itemName: '',
  category: 'Glassware',
  subCategory: '',
  quantity: '',
  quantityUnit: 'pieces',
  storageLocation: '',
  description: '',
};

const EMPTY_ALLOTMENT = {
  storeItemId: '',
  studentId: '',
  quantity: '',
  purpose: '',
  notes: '',
  dueDate: '',
};

export default function StoreDashboard() {
  const {
    storeItems,
    storeAllotments,
    users,
    fetchStoreItems,
    fetchStoreAllotments,
    fetchUsers,
    createStoreItem,
    updateStoreItem,
    deleteStoreItem,
    createStoreAllotment,
    approveStoreRequest,
    rejectStoreRequest,
    setUserBlockedState,
    setToast,
    setHighlight,
  } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_STORE_ITEM);
  const [editItem, setEditItem] = useState(EMPTY_STORE_ITEM);
  const [allotmentForm, setAllotmentForm] = useState(EMPTY_ALLOTMENT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [allotting, setAllotting] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState('');
  const [blockingUserId, setBlockingUserId] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    inventory: true,
    requests: true,
    allotments: true,
    recent: true,
    control: false,
  });

  useEffect(() => {
    fetchStoreItems();
    fetchStoreAllotments();
    fetchUsers();

    // Set up real-time socket listeners
    socket.on('store:new_request', () => {
      fetchStoreAllotments();
    });

    socket.on('store:request_approved', () => {
      fetchStoreAllotments();
      fetchStoreItems();
    });

    socket.on('store:request_rejected', () => {
      fetchStoreAllotments();
    });

    return () => {
      socket.off('store:new_request');
      socket.off('store:request_approved');
      socket.off('store:request_rejected');
    };
  }, [fetchStoreAllotments, fetchStoreItems, fetchUsers]);

  const duplicateCodeExists = useMemo(
    () => storeItems.some((item) => item.itemCode?.toUpperCase() === newItem.itemCode.trim().toUpperCase()),
    [newItem.itemCode, storeItems]
  );

  const categoryCount = new Set(storeItems.map((item) => item.category)).size;
  const subCategoryCount = new Set(storeItems.map((item) => `${item.category}:${item.subCategory}`)).size;
  const lowStockItems = storeItems.filter((item) => item.quantity <= 5);
  const students = users.filter((user) => user.role === 'student');
  const pendingStoreRequests = storeAllotments.filter((entry) => entry.status === 'pending');
  const selectedAllotmentItem = storeItems.find((item) => item.id === allotmentForm.storeItemId);

  const applyCategoryRules = (item) => {
    if (item.category === 'Glassware') {
      return { ...item, quantityUnit: 'pieces' };
    }

    if (!CHEMICAL_UNITS.includes(item.quantityUnit)) {
      return { ...item, quantityUnit: CHEMICAL_UNITS[0] };
    }

    return item;
  };

  const openEditModal = (item) => {
    setEditItem(applyCategoryRules({
      id: item.id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      subCategory: item.subCategory,
      quantity: String(item.quantity),
      quantityUnit: item.category === 'Glassware' ? 'pieces' : item.quantityUnit,
      storageLocation: item.storageLocation,
      description: item.description,
    }));
    setEditOpen(true);
  };

  const saveNewItem = async () => {
    if (!newItem.itemCode.trim() || !newItem.itemName.trim() || !newItem.subCategory.trim() || !newItem.quantity) return;
    if (duplicateCodeExists) {
      setToast({ type: 'error', message: 'This store item is already listed.' });
      return;
    }

    setSaving(true);
    try {
      const payload = applyCategoryRules(newItem);
      const created = await createStoreItem({
        itemCode: payload.itemCode.trim().toUpperCase(),
        itemName: payload.itemName.trim(),
        category: payload.category,
        subCategory: payload.subCategory.trim(),
        quantity: Number(payload.quantity),
        quantityUnit: payload.quantityUnit,
        storageLocation: payload.storageLocation.trim(),
        description: payload.description.trim(),
      });
      setToast({ type: 'success', message: `${created.itemName} added to store.` });
      setHighlight(created.id);
      setCreateOpen(false);
      setNewItem(EMPTY_STORE_ITEM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create store item.' });
    } finally {
      setSaving(false);
    }
  };

  const saveEditedItem = async () => {
    if (!editItem.id || !editItem.itemCode.trim() || !editItem.itemName.trim() || !editItem.subCategory.trim() || !editItem.quantity) return;

    setSaving(true);
    try {
      const payload = applyCategoryRules(editItem);
      const updated = await updateStoreItem(editItem.id, {
        itemCode: payload.itemCode.trim().toUpperCase(),
        itemName: payload.itemName.trim(),
        category: payload.category,
        subCategory: payload.subCategory.trim(),
        quantity: Number(payload.quantity),
        quantityUnit: payload.quantityUnit,
        storageLocation: payload.storageLocation.trim(),
        description: payload.description.trim(),
      });
      setToast({ type: 'success', message: `${updated.itemName} updated.` });
      setHighlight(updated.id);
      setEditOpen(false);
      setEditItem(EMPTY_STORE_ITEM);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update store item.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteStoreItem(deleteTarget.id);
      setToast({ type: 'success', message: `${deleteTarget.itemName} deleted from store.` });
      setDeleteTarget(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete store item.' });
    } finally {
      setDeleting(false);
    }
  };

  const submitAllotment = async () => {
    if (!allotmentForm.storeItemId || !allotmentForm.studentId || !allotmentForm.quantity) return;

    setAllotting(true);
    try {
      const created = await createStoreAllotment({
        storeItemId: allotmentForm.storeItemId,
        studentId: allotmentForm.studentId,
        quantity: Number(allotmentForm.quantity),
        purpose: allotmentForm.purpose.trim(),
        notes: allotmentForm.notes.trim(),
        dueDate: allotmentForm.dueDate || null,
      });
      await fetchStoreItems();
      setToast({ type: 'success', message: `${created.itemName} allotted to ${created.studentName}.` });
      setAllotmentForm(EMPTY_ALLOTMENT);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to allot store item.' });
    } finally {
      setAllotting(false);
    }
  };

  const handleApproveStoreRequest = async (requestId) => {
    setReviewingRequestId(requestId);
    try {
      await approveStoreRequest(requestId);
      await Promise.all([fetchStoreItems(), fetchStoreAllotments()]);
      setToast({ type: 'success', message: 'Store request approved.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve store request.' });
    } finally {
      setReviewingRequestId('');
    }
  };

  const handleRejectStoreRequest = async (requestId) => {
    setReviewingRequestId(requestId);
    try {
      await rejectStoreRequest(requestId);
      await fetchStoreAllotments();
      setToast({ type: 'success', message: 'Store request rejected.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to reject store request.' });
    } finally {
      setReviewingRequestId('');
    }
  };

  const handleToggleStudentBlock = async (student) => {
    setBlockingUserId(student.id);
    try {
      await setUserBlockedState({
        userId: student.id,
        isBlocked: !student.isBlocked,
        blockedReason: student.isBlocked ? '' : 'Blocked by store admin due to spam or misuse.',
      });
      await fetchUsers();
      setToast({ type: 'success', message: `${student.name} ${student.isBlocked ? 'unblocked' : 'blocked'}.` });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update student access.' });
    } finally {
      setBlockingUserId('');
    }
  };

  const rows = storeItems.map((item) => ({
    ...item,
    quantityDisplay: item.category === 'Glassware' ? `${item.quantity}` : `${item.quantity} ${item.quantityUnit}`,
  }));

  const toggleSection = (section) => {
    setExpandedSections((state) => ({ ...state, [section]: !state[section] }));
  };

  const SectionHeader = ({ title, subtitle, section }) => (
    <div
      className='flex items-center justify-between gap-3 cursor-pointer hover:opacity-80 transition-opacity'
      onClick={() => toggleSection(section)}
    >
      <div>
        <h2 className='text-lg font-semibold flex items-center gap-2'>
          {expandedSections[section] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          {title}
        </h2>
        {subtitle ? <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>{subtitle}</p> : null}
      </div>
    </div>
  );

  return (
    <div className='space-y-8 pb-10'>
      {/* Dashboard Stats */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card title='Store SKUs' subtitle='Total managed items'>
          <p className='text-3xl font-semibold'>{storeItems.length}</p>
        </Card>
        <Card title='Categories' subtitle='Main grouped sections'>
          <p className='text-3xl font-semibold'>{categoryCount}</p>
        </Card>
        <Card title='Sub Categories' subtitle='Shelf-level grouping'>
          <p className='text-3xl font-semibold'>{subCategoryCount}</p>
        </Card>
        <Card title='Pending Requests' subtitle='Awaiting approval'>
          <p className='text-3xl font-semibold text-amber-600 dark:text-amber-300'>{pendingStoreRequests.length}</p>
        </Card>
      </div>

      {/* Central Store Inventory Section - MAIN SECTION, NOT COLLAPSIBLE */}
      <div className='rounded-2xl border-2 border-[#4e5d35] bg-white p-6 shadow-md dark:border-[#6b7a4a] dark:bg-[#23281d]'>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div>
            <h2 className='text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]'>📦 Store Inventory</h2>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-300'>Manage all store items - Add, Edit, Delete inventory</p>
          </div>
          <Button variant='outline' onClick={() => setCreateOpen(true)} className='text-sm'>
            <Plus size={18} /> Add Item
          </Button>
        </div>

        <div className='space-y-4'>
          <p className='text-sm text-slate-500 dark:text-slate-400'>Only two store categories are allowed: Glassware and Chemical.</p>
          <Table
            headers={[
              { key: 'itemCode', label: 'Code' },
              { key: 'itemName', label: 'Item' },
              { key: 'category', label: 'Category' },
              { key: 'subCategory', label: 'Sub Category' },
              { key: 'quantityDisplay', label: 'Available' },
              { key: 'storageLocation', label: 'Storage' },
              {
                key: 'actions',
                label: 'Actions',
                render: (row) => (
                  <div className='flex flex-wrap gap-2'>
                    <Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openEditModal(row)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant='outline' className='px-3 py-1 text-xs text-red-700 dark:text-red-300' onClick={() => setDeleteTarget(row)}>
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                )
              }
            ]}
            rows={rows}
          />
          {lowStockItems.length > 0 && (
            <div className='mt-4 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20'>
              <p className='text-sm font-medium text-amber-900 dark:text-amber-100'>⚠️ Low Stock Alert: {lowStockItems.length} item(s) need refilling</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Store Requests Section */}
      <div className='rounded-2xl border-2 border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900 dark:bg-[#23281d]'>
        <SectionHeader
          title='Pending Store Requests'
          subtitle={`${pendingStoreRequests.length} request${pendingStoreRequests.length !== 1 ? 's' : ''} awaiting approval`}
          section='requests'
        />

        {expandedSections.requests && (
          <div className='mt-4 space-y-3'>
            {pendingStoreRequests.length === 0 ? (
              <p className='text-sm text-slate-500 dark:text-slate-400'>No pending store requests right now.</p>
            ) : (
              pendingStoreRequests.map((entry) => (
                <div key={entry.id} className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-900/20'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='flex-1'>
                      <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{entry.itemName} ({entry.itemCode})</p>
                      <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>Requested by {entry.studentName} ({entry.studentEmail})</p>
                      <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>Quantity: <span className='font-semibold'>{entry.quantity} {entry.quantityUnit}</span></p>
                      {entry.dueDate && <p className='mt-1 text-sm text-[#71805a] dark:text-[#c5d0b5]'>Return by: {new Date(entry.dueDate).toLocaleDateString()}</p>}
                      {entry.purpose && <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Purpose: {entry.purpose}</p>}
                      {entry.requestNotes && <p className='mt-1 text-sm italic text-slate-500 dark:text-slate-400'>Notes: {entry.requestNotes}</p>}
                    </div>
                    <div className='flex gap-2'>
                      <Button
                        className='px-3 py-2 text-xs whitespace-nowrap'
                        onClick={() => handleApproveStoreRequest(entry.id)}
                        disabled={reviewingRequestId === entry.id}
                      >
                        {reviewingRequestId === entry.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        variant='outline'
                        className='px-3 py-2 text-xs whitespace-nowrap text-red-700 dark:text-red-300'
                        onClick={() => handleRejectStoreRequest(entry.id)}
                        disabled={reviewingRequestId === entry.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Direct Allotment Section */}
      <div className='rounded-2xl border-2 border-[#d9e1ca] bg-white p-6 shadow-sm dark:border-[#414a33] dark:bg-[#23281d]'>
        <SectionHeader title='Direct Allotment' subtitle='Issue items directly to students' section='allotments' />

        {expandedSections.allotments && (
          <div className='mt-4 space-y-4'>
            <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Store item</span>
              <select
                value={allotmentForm.storeItemId}
                onChange={(e) => setAllotmentForm((state) => ({ ...state, storeItemId: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value=''>Select item</option>
                {storeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemName} ({item.itemCode}) - {item.quantity} {item.category === 'Glassware' ? 'available' : item.quantityUnit}
                  </option>
                ))}
              </select>
            </label>
            <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Student</span>
              <select
                value={allotmentForm.studentId}
                onChange={(e) => setAllotmentForm((state) => ({ ...state, studentId: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value=''>Select student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </label>
            <div className='grid gap-4 sm:grid-cols-2'>
              <Input label='Quantity' type='number' value={allotmentForm.quantity} onChange={(e) => setAllotmentForm((state) => ({ ...state, quantity: e.target.value }))} />
              <Input
                label='Unit'
                value={selectedAllotmentItem ? (selectedAllotmentItem.category === 'Glassware' ? 'number' : selectedAllotmentItem.quantityUnit) : ''}
                readOnly
                className='bg-[#f4f5eb] dark:bg-[#28301f]'
              />
            </div>
            <Input label='Purpose' value={allotmentForm.purpose} onChange={(e) => setAllotmentForm((state) => ({ ...state, purpose: e.target.value }))} placeholder='Practical, issue, replacement...' />
            <Input label='Return by date (optional)' type='date' value={allotmentForm.dueDate} onChange={(e) => setAllotmentForm((state) => ({ ...state, dueDate: e.target.value }))} />
            <Input label='Notes' value={allotmentForm.notes} onChange={(e) => setAllotmentForm((state) => ({ ...state, notes: e.target.value }))} placeholder='Faculty note or issue reason' />
            <Button className='w-full' onClick={submitAllotment} disabled={allotting}>
              <Send size={16} /> {allotting ? 'Allotting...' : 'Allot To Student'}
            </Button>
          </div>
        )}
      </div>

      {/* Recent Allotments Section */}
      <div className='rounded-2xl border-2 border-[#d9e1ca] bg-white p-6 shadow-sm dark:border-[#414a33] dark:bg-[#23281d]'>
        <SectionHeader title='Recent Allotments' subtitle='Latest store issues to students' section='recent' />

        {expandedSections.recent && (
          <div className='mt-4 space-y-3 max-h-96 overflow-y-auto'>
            {storeAllotments.length === 0 ? (
              <p className='text-sm text-slate-500 dark:text-slate-400'>No store allotments recorded yet.</p>
            ) : (
              storeAllotments.slice(0, 10).map((entry) => (
                <div key={entry.id} className={`rounded-lg border p-3 ${entry.status === 'pending' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-900/20' : 'border-[#d9e1ca] dark:border-[#414a33]'}`}>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8] truncate'>{entry.itemName} ({entry.itemCode})</p>
                      <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{entry.studentName}</p>
                      <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{entry.quantity} {entry.quantityUnit}</p>
                      {entry.status && <p className={`mt-1 text-xs font-semibold ${entry.status === 'pending' ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{entry.status.toUpperCase()}</p>}
                    </div>
                    <p className='text-xs text-[#71805a] dark:text-[#c5d0b5] whitespace-nowrap'>{entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Student Access Control Section */}
      <div className='rounded-2xl border-2 border-[#d9e1ca] bg-white p-6 shadow-sm dark:border-[#414a33] dark:bg-[#23281d]'>
        <SectionHeader title='Student Access Control' subtitle='Block or unblock students who spam or misuse requests' section='control' />

        {expandedSections.control && (
          <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {students.length === 0 ? (
              <p className='text-sm text-slate-500 dark:text-slate-400'>No students available.</p>
            ) : (
              students.map((student) => (
                <div key={student.id} className='rounded-lg border border-[#d9e1ca] p-3 dark:border-[#414a33]'>
                  <p className='font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{student.name}</p>
                  <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{student.email}</p>
                  <p className={`mt-2 text-xs font-semibold ${student.isBlocked ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
                    {student.isBlocked ? 'Blocked' : 'Active'}
                  </p>
                  <Button
                    variant='outline'
                    className={`mt-3 w-full text-xs ${student.isBlocked ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}
                    onClick={() => handleToggleStudentBlock(student)}
                    disabled={blockingUserId === student.id}
                  >
                    {blockingUserId === student.id ? 'Saving...' : student.isBlocked ? 'Unblock' : 'Block'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals remain the same */}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Add Store Item'>
        <div className='space-y-4'>
          <Input label='Item code' value={newItem.itemCode} onChange={(e) => setNewItem((state) => ({ ...state, itemCode: e.target.value.toUpperCase() }))} />
          {newItem.itemCode.trim() && duplicateCodeExists ? <p className='text-sm text-red-600 dark:text-red-300'>This store item is already listed.</p> : null}
          <Input label='Item name' value={newItem.itemName} onChange={(e) => setNewItem((state) => ({ ...state, itemName: e.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Category</span>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem((state) => applyCategoryRules({ ...state, category: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <Input label='Sub category' value={newItem.subCategory} onChange={(e) => setNewItem((state) => ({ ...state, subCategory: e.target.value }))} placeholder={newItem.category === 'Glassware' ? 'Funnels' : 'Solvents'} />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label={newItem.category === 'Glassware' ? 'Quantity in number' : 'Quantity'} type='number' value={newItem.quantity} onChange={(e) => setNewItem((state) => ({ ...state, quantity: e.target.value }))} />
            {newItem.category === 'Chemical' ? (
              <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
                <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
                <select
                  value={newItem.quantityUnit}
                  onChange={(e) => setNewItem((state) => ({ ...state, quantityUnit: e.target.value }))}
                  className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  {CHEMICAL_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            ) : (
              <Input label='Quantity unit' value='number' readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
            )}
          </div>
          <Input label='Storage location' value={newItem.storageLocation} onChange={(e) => setNewItem((state) => ({ ...state, storageLocation: e.target.value }))} />
          <Input label='Description' value={newItem.description} onChange={(e) => setNewItem((state) => ({ ...state, description: e.target.value }))} />
          <Button className='w-full' onClick={saveNewItem} disabled={saving || duplicateCodeExists}>
            {saving ? 'Saving...' : 'Save store item'}
          </Button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title='Edit Store Item'>
        <div className='space-y-4'>
          <Input label='Item code' value={editItem.itemCode} onChange={(e) => setEditItem((state) => ({ ...state, itemCode: e.target.value.toUpperCase() }))} />
          <Input label='Item name' value={editItem.itemName} onChange={(e) => setEditItem((state) => ({ ...state, itemName: e.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Category</span>
              <select
                value={editItem.category}
                onChange={(e) => setEditItem((state) => applyCategoryRules({ ...state, category: e.target.value }))}
                className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <Input label='Sub category' value={editItem.subCategory} onChange={(e) => setEditItem((state) => ({ ...state, subCategory: e.target.value }))} />
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label={editItem.category === 'Glassware' ? 'Quantity in number' : 'Quantity'} type='number' value={editItem.quantity} onChange={(e) => setEditItem((state) => ({ ...state, quantity: e.target.value }))} />
            {editItem.category === 'Chemical' ? (
              <label className='relative block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
                <span className='mb-1 block text-xs font-medium tracking-wide'>Quantity unit</span>
                <select
                  value={editItem.quantityUnit}
                  onChange={(e) => setEditItem((state) => ({ ...state, quantityUnit: e.target.value }))}
                  className='w-full rounded-lg border border-[#cfd8bd] bg-white px-3 py-2 text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  {CHEMICAL_UNITS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            ) : (
              <Input label='Quantity unit' value='number' readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
            )}
          </div>
          <Input label='Storage location' value={editItem.storageLocation} onChange={(e) => setEditItem((state) => ({ ...state, storageLocation: e.target.value }))} />
          <Input label='Description' value={editItem.description} onChange={(e) => setEditItem((state) => ({ ...state, description: e.target.value }))} />
          <Button className='w-full' onClick={saveEditedItem} disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title='Delete Store Item'>
        <div className='space-y-4'>
          <p className='text-sm text-slate-600 dark:text-slate-300'>
            {deleteTarget ? `Delete ${deleteTarget.itemName} (${deleteTarget.itemCode}) from the central store?` : ''}
          </p>
          <div className='flex gap-3'>
            <Button variant='outline' className='w-full' onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant='danger' className='w-full' onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete item'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
