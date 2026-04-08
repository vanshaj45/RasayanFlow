import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, Info, MapPin, PackageCheck, Search, TestTube2 } from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';

export default function StudentDashboard() {
  const { labs, transactions, storeAllotments, fetchLabs, fetchTransactions, fetchStoreAllotments, fetchInventorySearch, createBorrowRequest, setToast } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [inventorySearch, setInventorySearch] = useState('');
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submittingBorrow, setSubmittingBorrow] = useState(false);
  const [borrowForm, setBorrowForm] = useState({
    quantity: '',
    purpose: '',
    neededUntil: '',
    notes: '',
  });
  const labLookup = useMemo(
    () =>
      labs.reduce((acc, lab) => {
        const key = String(lab.id || lab._id || '');
        if (key) acc[key] = lab;
        return acc;
      }, {}),
    [labs]
  );

  useEffect(() => {
    fetchLabs();
    fetchTransactions();
    fetchStoreAllotments();
  }, [fetchLabs, fetchStoreAllotments, fetchTransactions]);

  const borrowings = useMemo(
    () => transactions.filter((tx) => tx.type === 'borrow'),
    [transactions]
  );

  const activeBorrowings = useMemo(
    () => borrowings.filter((tx) => tx.status === 'approved' || tx.status === 'pending'),
    [borrowings]
  );

  const overdueStoreItems = useMemo(
    () =>
      storeAllotments.filter((entry) => {
        if (!entry.dueDate) return false;
        return new Date(entry.dueDate) < new Date();
      }),
    [storeAllotments]
  );

  const [inventoryMatches, setInventoryMatches] = useState([]);

  useEffect(() => {
    const query = inventorySearch.trim();

    if (!query) {
      return;
    }

    let active = true;

    const timerId = setTimeout(async () => {
      const results = await fetchInventorySearch(query);
      if (active) {
        setInventoryMatches(results);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [fetchInventorySearch, inventorySearch]);

  const inventorySearchGroups = useMemo(() => {
    if (!inventorySearch.trim()) return [];

    return Object.values(
      inventoryMatches.reduce((acc, item) => {
        const linkedLab = item.labId ? labLookup[String(item.labId)] : null;
        const resolvedLabName = item.labName || linkedLab?.name || linkedLab?.labName || 'Unknown lab';
        const resolvedLabCode = item.labCode || linkedLab?.labCode || '';
        const labKey = item.labId || resolvedLabName || 'unknown-lab';

        if (!acc[labKey]) {
          acc[labKey] = {
            labId: item.labId,
            labName: resolvedLabName,
            labCode: resolvedLabCode,
            items: [],
          };
        }

        acc[labKey].items.push(item);
        return acc;
      }, {})
    ).sort((a, b) => a.labName.localeCompare(b.labName));
  }, [inventoryMatches, inventorySearch, labLookup]);

  const myExperimentRequests = useMemo(
    () => transactions.filter((tx) => tx.requestCategory === 'experiment' && tx.type === 'borrow'),
    [transactions]
  );

  const openBorrowRequest = (item) => {
    setSelectedItem(item);
    setBorrowForm({ quantity: '', purpose: '', neededUntil: '', notes: '' });
    setBorrowOpen(true);
  };

  const submitBorrowRequest = async () => {
    if (!selectedItem || !borrowForm.quantity || !borrowForm.purpose.trim() || !borrowForm.neededUntil) {
      setToast({ type: 'error', message: 'Quantity, purpose, and needed-until date are required.' });
      return;
    }

    setSubmittingBorrow(true);
    try {
      await createBorrowRequest({
        itemId: selectedItem.id,
        quantity: borrowForm.quantity,
        purpose: borrowForm.purpose.trim(),
        neededUntil: borrowForm.neededUntil,
        notes: borrowForm.notes.trim(),
      });
      setToast({ type: 'success', message: `Borrow request sent for ${selectedItem.name}.` });
      setBorrowOpen(false);
      await fetchTransactions();
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit borrow request.' });
    } finally {
      setSubmittingBorrow(false);
    }
  };

  if (!labs.length) {
    return <div className='p-6 text-center text-slate-500'>No labs available currently.</div>;
  }

  return (
    <div className='space-y-5 pb-10'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-xl font-semibold'>Find a lab and borrow equipment</h2>
        <Button variant='outline' onClick={() => navigate('/about')}>
          <Info size={14} /> About Us
        </Button>
      </div>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        <Card title='Active Borrowings' subtitle='Pending and approved lab requests'>
          <div className='flex items-center gap-3'>
            <PackageCheck size={18} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{activeBorrowings.length}</p>
          </div>
        </Card>
        <Card title='Store Allotments' subtitle='Items issued by store admin'>
          <div className='flex items-center gap-3'>
            <TestTube2 size={18} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{storeAllotments.length}</p>
          </div>
        </Card>
        <Card title='Overdue' subtitle='Store items past return date'>
          <div className='flex items-center gap-3'>
            <Clock3 size={18} className='text-rose-600' />
            <p className='text-3xl font-semibold'>{overdueStoreItems.length}</p>
          </div>
        </Card>
      </div>

      <Card
        title='Search Lab Inventory'
        subtitle='Find an item across all labs. If more than one lab has it, all matching labs will be listed.'
      >
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='max-w-2xl'>
            <p className='text-sm text-slate-600 dark:text-slate-300'>
              Search by item name to see which labs currently stock that inventory item.
            </p>
          </div>
          <div className='w-full lg:max-w-sm'>
            <Input
              label='Search lab inventory'
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder='HCL, pipette, beaker...'
            />
          </div>
        </div>

        {inventorySearch.trim() ? (
          inventorySearchGroups.length ? (
            <div className='mt-5 space-y-4'>
              {inventorySearchGroups.map((group) => (
                <div key={group.labId || group.labName} className='rounded-xl border border-[#d9e1ca] px-4 py-4 dark:border-[#414a33]'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <p className='text-base font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{group.labName}</p>
                      <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>
                        {group.labCode ? `Code: ${group.labCode} • ` : ''}{group.items.length} matching item{group.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                    {group.labId ? (
                      <Button variant='outline' onClick={() => navigate(`/labs/${group.labId}`)}>
                        <Search size={14} /> Open Lab
                      </Button>
                    ) : null}
                  </div>

                  <div className='mt-4 space-y-3'>
                    {group.items.map((item) => (
                      <div key={item.id} className='flex flex-col gap-3 rounded-xl bg-[#f7f8f1] px-4 py-3 dark:bg-[#28301f] sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                          <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{item.name}</p>
                          <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                            {item.category} • Code: {item.itemCode}
                          </p>
                          <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                            Company: {item.manufacturingCompany || 'Not specified'}
                          </p>
                          <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                            Storage: {item.storageLocation || 'Not specified'}
                          </p>
                        </div>
                        <div className='text-left sm:text-right'>
                          <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{item.quantity} {item.quantityUnit}</p>
                          <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                            {item.quantity <= (item.minThreshold || 0) ? 'Low stock' : 'Available'}
                          </p>
                          <div className='mt-3 flex flex-wrap gap-2 sm:justify-end'>
                            <Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openBorrowRequest(item)}>
                              Request Here
                            </Button>
                            {group.labId ? (
                              <Button className='px-3 py-1 text-xs' onClick={() => navigate(`/labs/${group.labId}`)}>
                                Open Request Page
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='mt-5 rounded-xl border border-dashed border-[#cfd8bd] px-5 py-8 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
              No lab inventory matched your search.
            </div>
          )
        ) : null}
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {labs.map((lab) => (
          <Card key={lab._id || lab.id} className='cursor-pointer hover:-translate-y-1 hover:shadow-glow transition' title={lab.name} subtitle={lab.location}>
            <p className='mb-3 text-sm text-slate-600 dark:text-slate-300'>{lab.description || 'Lab equipment and specimen inventory.'}</p>
            <p className='mb-3 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Open the lab to view its inventory and experiments together.</p>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1 text-slate-500 dark:text-slate-400'><MapPin size={16} /> {lab.location}</div>
              <Button variant='primary' onClick={() => { setToast({ type: 'success', message: 'Open lab inventory' }); navigate(`/labs/${lab._id || lab.id}`); }}>Open</Button>
            </div>
          </Card>
        ))}
      </div>

      <Card title='My Borrowings' subtitle='All lab borrowing requests and current deadlines'>
        <Table
          headers={[
            { key: 'itemName', label: 'Item' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'status', label: 'Status' },
            { key: 'neededUntilDisplay', label: 'Return / Need by' },
            { key: 'purpose', label: 'Purpose' },
          ]}
          rows={borrowings.map((tx) => ({
            ...tx,
            quantityDisplay: tx.requestCategory === 'experiment' ? 'Complete experiment' : `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
            neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'Not specified',
          }))}
        />
      </Card>

      <Card title='My Experiment Requests' subtitle='These are now part of your borrow and transaction history'>
        <Table
          headers={[
            { key: 'experimentTitle', label: 'Experiment' },
            { key: 'labName', label: 'Lab' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'preferredDateDisplay', label: 'Preferred Date' },
            { key: 'status', label: 'Status' },
          ]}
          rows={myExperimentRequests.map((entry) => ({
            ...entry,
            experimentTitle: entry.experimentTitle || entry.itemName || 'Experiment',
            labName: labLookup[String(entry.labId)]?.name || 'Unknown lab',
            preferredDateDisplay: entry.neededUntil ? new Date(entry.neededUntil).toLocaleDateString() : 'Not specified',
          }))}
        />
      </Card>

      <Card title='Store Allotments To Me' subtitle='Items issued by the store admin that must be returned before the due date'>
        <Table
          headers={[
            { key: 'itemName', label: 'Item' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'dueDateDisplay', label: 'Return before' },
            {
              key: 'deadlineStatus',
              label: 'Deadline',
              render: (row) => (
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  row.deadlineStatus === 'Overdue'
                    ? 'bg-red-100 text-red-700'
                    : row.deadlineStatus === 'Due soon'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {row.deadlineStatus}
                </span>
              )
            },
            { key: 'purpose', label: 'Purpose' },
            { key: 'notes', label: 'Notes' },
          ]}
          rows={storeAllotments.map((entry) => {
            const daysLeft = entry.dueDate
              ? Math.ceil((new Date(entry.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
              : null;

            let deadlineStatus = 'No limit';
            if (daysLeft != null) {
              if (daysLeft < 0) deadlineStatus = 'Overdue';
              else if (daysLeft <= 3) deadlineStatus = 'Due soon';
              else deadlineStatus = 'On time';
            }

            return {
              ...entry,
              quantityDisplay: `${entry.quantity} ${entry.quantityUnit}`.trim(),
              dueDateDisplay: entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : 'No limit',
              deadlineStatus,
            };
          })}
        />
      </Card>

      <Modal open={borrowOpen} onClose={() => setBorrowOpen(false)} title={selectedItem ? `Request ${selectedItem.name}` : 'Request Chemical'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f5eb] p-3 text-sm text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
            Available quantity: {selectedItem?.quantity} {selectedItem?.quantityUnit || 'units'}
          </div>
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 text-xs text-[#71805a] dark:border-[#414a33] dark:bg-[#1f2419] dark:text-[#c5d0b5]'>
            You can request directly from this search result, or open the lab page if you want the full chemical detail view first.
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
          <div className='flex gap-3'>
            {selectedItem?.labId ? <Button variant='outline' className='w-full' onClick={() => navigate(`/labs/${selectedItem.labId}`)}>Open Request Page</Button> : null}
            <Button className='w-full' onClick={submitBorrowRequest} disabled={submittingBorrow}>
              {submittingBorrow ? 'Submitting...' : 'Send Borrow Request'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
