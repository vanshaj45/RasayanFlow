import { useEffect, useMemo } from 'react';
import { Clock3, PackageCheck, TestTube2 } from 'lucide-react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

export default function StudentBorrowingsPage() {
  const { transactions, storeAllotments, fetchTransactions, fetchStoreAllotments } = useAppStore();

  useEffect(() => {
    fetchTransactions();
    fetchStoreAllotments();
  }, [fetchStoreAllotments, fetchTransactions]);

  const borrowings = useMemo(
    () => transactions.filter((tx) => tx.type === 'borrow'),
    [transactions]
  );

  const activeBorrowings = useMemo(
    () => borrowings.filter((tx) => tx.status === 'approved' || tx.status === 'pending'),
    [borrowings]
  );

  const approvedStoreAllotments = useMemo(
    () => storeAllotments.filter((entry) => entry.status === 'approved'),
    [storeAllotments]
  );

  const pendingStoreRequests = useMemo(
    () => storeAllotments.filter((entry) => entry.status === 'pending'),
    [storeAllotments]
  );

  const overdueStoreItems = useMemo(
    () =>
      approvedStoreAllotments.filter((entry) => {
        if (!entry.dueDate) return false;
        return new Date(entry.dueDate) < new Date();
      }),
    [approvedStoreAllotments]
  );

  return (
    <div className='space-y-6 pb-10'>
      <div>
        <h2 className='text-xl font-semibold'>My Borrowings</h2>
        <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>Track your lab borrow requests and store equipment issued to you, including return deadlines.</p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card title='Lab Borrowings' subtitle='Pending and approved lab requests'>
          <div className='flex items-center gap-3'>
            <PackageCheck size={18} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{activeBorrowings.length}</p>
          </div>
        </Card>
        <Card title='Store Issues' subtitle='Approved store allotments'>
          <div className='flex items-center gap-3'>
            <TestTube2 size={18} className='text-[#556b2f]' />
            <p className='text-3xl font-semibold'>{approvedStoreAllotments.length}</p>
          </div>
        </Card>
        <Card title='Pending Store Requests' subtitle='Waiting for store admin'>
          <div className='flex items-center gap-3'>
            <Clock3 size={18} className='text-amber-600' />
            <p className='text-3xl font-semibold'>{pendingStoreRequests.length}</p>
          </div>
        </Card>
        <Card title='Overdue Returns' subtitle='Past the return deadline'>
          <div className='flex items-center gap-3'>
            <Clock3 size={18} className='text-rose-600' />
            <p className='text-3xl font-semibold'>{overdueStoreItems.length}</p>
          </div>
        </Card>
      </div>

      <Card title='Lab Borrow Requests' subtitle='Requests made to lab admins'>
        <Table
          headers={[
            { key: 'itemName', label: 'Item' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'status', label: 'Status' },
            { key: 'neededUntilDisplay', label: 'Need by' },
            { key: 'purpose', label: 'Purpose' },
          ]}
          rows={borrowings.map((tx) => ({
            ...tx,
            quantityDisplay: `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
            neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'Not specified',
          }))}
        />
      </Card>

      <Card title='Store Requests And Allotments' subtitle='Requests to the central store and items approved for you'>
        <Table
          headers={[
            { key: 'itemName', label: 'Item' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'status', label: 'Status' },
            { key: 'dueDateDisplay', label: 'Return before' },
            { key: 'purpose', label: 'Purpose' },
            { key: 'requestNotes', label: 'Notes' },
          ]}
          rows={storeAllotments.map((entry) => ({
            ...entry,
            quantityDisplay: `${entry.quantity} ${entry.quantityUnit}`.trim(),
            dueDateDisplay: entry.dueDate ? new Date(entry.dueDate).toLocaleDateString() : 'No limit',
            requestNotes: entry.requestNotes || entry.notes || 'N/A',
          }))}
        />
      </Card>
    </div>
  );
}
