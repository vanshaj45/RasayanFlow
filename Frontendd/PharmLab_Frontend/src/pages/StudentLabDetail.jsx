import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Package } from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

export default function StudentLabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { labs, inventory, transactions, fetchLabs, fetchInventory, fetchTransactions, createBorrowRequest, setToast } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [borrowForm, setBorrowForm] = useState({
    quantity: '',
    purpose: '',
    neededUntil: '',
    notes: ''
  });

  useEffect(() => {
    fetchLabs();
    fetchTransactions();
    if (id) {
      fetchInventory(id);
    }
  }, [fetchInventory, fetchLabs, fetchTransactions, id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTransactions();
      if (id) {
        fetchInventory(id);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchInventory, fetchTransactions, id]);

  const lab = useMemo(
    () => labs.find((entry) => (entry.id || entry._id) === id),
    [id, labs]
  );

  const rows = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    const filtered = query
      ? inventory.filter((item) =>
          [item.name, item.itemCode, item.category, item.storageLocation]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        )
      : inventory;

    return filtered.map((item) => ({
      ...item,
      id: item.id || item._id,
      quantityDisplay: `${item.quantity} ${item.quantityUnit || 'units'}`,
      expiryDisplay: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
      storageDisplay: item.storageLocation || 'Not specified'
    }));
  }, [inventory, inventorySearch]);

  const myRequests = useMemo(
    () => transactions.filter((tx) => String(tx.labId) === String(id) || String(tx.labId?._id) === String(id)),
    [id, transactions]
  );

  const openBorrowModal = (item) => {
    setSelectedItem(item);
    setBorrowForm({
      quantity: '',
      purpose: '',
      neededUntil: '',
      notes: ''
    });
    setBorrowOpen(true);
  };

  const submitBorrowRequest = async () => {
    if (!selectedItem || !borrowForm.quantity || !borrowForm.purpose.trim() || !borrowForm.neededUntil) return;

    setSubmitting(true);
    try {
      await createBorrowRequest({
        itemId: selectedItem.id || selectedItem._id,
        quantity: borrowForm.quantity,
        purpose: borrowForm.purpose.trim(),
        neededUntil: borrowForm.neededUntil,
        notes: borrowForm.notes.trim()
      });
      setToast({ type: 'success', message: 'Borrow request submitted for admin approval.' });
      setBorrowOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit borrow request.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <Button variant='outline' onClick={() => navigate('/')} className='mb-3 text-xs px-3 py-1'>
            <ArrowLeft size={14} className='mr-2' /> Back to labs
          </Button>
          <h2 className='text-2xl font-semibold'>{lab?.name || 'Lab Inventory'}</h2>
          <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>{lab?.location || 'Inventory and available items'}</p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Available Items' subtitle='Current inventory count'>
          <div className='flex items-center gap-3'>
            <Package size={18} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{inventory.length}</p>
          </div>
        </Card>
        <Card title='Low Stock' subtitle='Items needing refill soon'>
          <div className='flex items-center gap-3'>
            <FlaskConical size={18} className='text-amber-600' />
            <p className='text-3xl font-semibold'>{inventory.filter((item) => item.quantity <= (item.minThreshold || 0)).length}</p>
          </div>
        </Card>
        <Card title='Lab Admin' subtitle='Assigned administrator'>
          <p className='text-lg font-medium'>{lab?.admin || 'Unassigned'}</p>
        </Card>
      </div>

      <div>
        <div className='mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Available Inventory</h3>
            <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Search within this lab by item name, code, category, or storage.</p>
          </div>
          <div className='w-full sm:max-w-sm'>
            <Input
              label='Search this lab'
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder='Diazepam, DIAZ-10, sedatives...'
            />
          </div>
        </div>
        <Table
          headers={[
            { key: 'name', label: 'Item' },
            { key: 'category', label: 'Category' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'storageDisplay', label: 'Storage' },
            { key: 'expiryDisplay', label: 'Expiry' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <Button variant='outline' onClick={() => openBorrowModal(row)} className='text-xs px-3 py-1'>
                  Request Borrow
                </Button>
              )
            }
          ]}
          rows={rows}
        />
      </div>
      <Modal open={borrowOpen} onClose={() => setBorrowOpen(false)} title={selectedItem ? `Borrow Request: ${selectedItem.name}` : 'Borrow Request'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f5eb] p-3 text-sm text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
            Available quantity: {selectedItem?.quantity} {selectedItem?.quantityUnit || 'units'}
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Quantity requested' type='number' value={borrowForm.quantity} onChange={(e) => setBorrowForm((state) => ({ ...state, quantity: e.target.value }))} />
            <Input label='Requested in unit' value={selectedItem?.quantityUnit || 'units'} readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
          </div>
          <Input label='Purpose / experiment use' value={borrowForm.purpose} onChange={(e) => setBorrowForm((state) => ({ ...state, purpose: e.target.value }))} placeholder='Practical class, assay, project work...' />
          <Input label='Needed until' type='date' value={borrowForm.neededUntil} onChange={(e) => setBorrowForm((state) => ({ ...state, neededUntil: e.target.value }))} />
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Requester name' value={user?.name || ''} readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
            <Input label='Requester email' type='email' value={user?.email || ''} readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
          </div>
          <Input label='Additional notes' value={borrowForm.notes} onChange={(e) => setBorrowForm((state) => ({ ...state, notes: e.target.value }))} placeholder='Section, faculty name, handling notes, urgency...' />
          <Button onClick={submitBorrowRequest} className='w-full' disabled={submitting}>
            {submitting ? 'Submitting...' : 'Send Borrow Request'}
          </Button>
        </div>
      </Modal>
      <div>
        <h3 className='mb-3 text-lg font-semibold'>My Borrow Requests</h3>
        <Table
          headers={[
            { key: 'itemName', label: 'Item' },
            { key: 'quantityDisplay', label: 'Qty' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'neededUntilDisplay', label: 'Needed Until' },
            {
              key: 'status',
              label: 'Status',
              render: (row) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  row.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : row.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : row.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-700'
                }`}>
                  {row.status}
                </span>
              )
            }
          ]}
          rows={myRequests.map((tx) => ({
            ...tx,
            quantityDisplay: `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
            neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'N/A'
          }))}
        />
      </div>
    </div>
  );
}
