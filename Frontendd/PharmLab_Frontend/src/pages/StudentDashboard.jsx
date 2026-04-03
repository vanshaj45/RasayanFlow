import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, MapPin, PackageCheck, TestTube2 } from 'lucide-react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';

export default function StudentDashboard() {
  const { labs, transactions, storeAllotments, fetchLabs, fetchTransactions, fetchStoreAllotments, setToast } = useAppStore();
  const navigate = useNavigate();

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

  const dueSoonStoreItems = useMemo(
    () =>
      storeAllotments.filter((entry) => {
        if (!entry.dueDate) return false;
        const daysLeft = Math.ceil((new Date(entry.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 3;
      }),
    [storeAllotments]
  );

  const overdueStoreItems = useMemo(
    () =>
      storeAllotments.filter((entry) => {
        if (!entry.dueDate) return false;
        return new Date(entry.dueDate) < new Date();
      }),
    [storeAllotments]
  );

  if (!labs.length) {
    return <div className='p-6 text-center text-slate-500'>No labs available currently.</div>;
  }

  return (
    <div className='space-y-5 pb-10'>
      <h2 className='text-xl font-semibold'>Find a lab and borrow equipment</h2>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
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
        <Card title='Due Soon' subtitle='Return deadlines in next 3 days'>
          <div className='flex items-center gap-3'>
            <Clock3 size={18} className='text-amber-600' />
            <p className='text-3xl font-semibold'>{dueSoonStoreItems.length}</p>
          </div>
        </Card>
        <Card title='Overdue' subtitle='Store items past return date'>
          <div className='flex items-center gap-3'>
            <Clock3 size={18} className='text-rose-600' />
            <p className='text-3xl font-semibold'>{overdueStoreItems.length}</p>
          </div>
        </Card>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {labs.map((lab) => (
          <Card key={lab._id || lab.id} className='cursor-pointer hover:-translate-y-1 hover:shadow-glow transition' title={lab.name} subtitle={lab.location}>
            <p className='mb-3 text-sm text-slate-600 dark:text-slate-300'>{lab.description || 'Lab equipment and specimen inventory.'}</p>
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
            quantityDisplay: `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
            neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'Not specified',
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
    </div>
  );
}
