import { useEffect, useMemo, useState } from 'react';
import { Boxes, Search, Send } from 'lucide-react';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

export default function StudentStorePage() {
  const { storeItems, fetchStoreItems, requestStoreItem, setToast } = useAppStore();
  const [search, setSearch] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    quantity: '',
    purpose: '',
    requestNotes: '',
    dueDate: ''
  });

  useEffect(() => {
    fetchStoreItems();
  }, [fetchStoreItems]);

  const groupedItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = normalizedSearch
      ? storeItems.filter((item) =>
          [item.itemName, item.itemCode, item.category, item.subCategory]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(normalizedSearch))
        )
      : storeItems;

    return Object.values(
      filtered.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { category: item.category, items: [] };
        }
        acc[item.category].items.push(item);
        return acc;
      }, {})
    ).map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.subCategory.localeCompare(b.subCategory) || a.itemName.localeCompare(b.itemName)),
    }));
  }, [search, storeItems]);

  const openRequestModal = (item) => {
    setSelectedItem(item);
    setRequestForm({
      quantity: '',
      purpose: '',
      requestNotes: '',
      dueDate: ''
    });
    setRequestOpen(true);
  };

  const submitStoreRequest = async () => {
    if (!selectedItem || !requestForm.quantity || !requestForm.purpose.trim()) return;

    setRequesting(true);
    try {
      await requestStoreItem({
        storeItemId: selectedItem.id,
        quantity: Number(requestForm.quantity),
        purpose: requestForm.purpose.trim(),
        requestNotes: requestForm.requestNotes.trim(),
        dueDate: requestForm.dueDate || null,
      });
      setToast({ type: 'success', message: 'Store request submitted for store admin approval.' });
      setRequestOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit store request.' });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold'>Central Store</h2>
          <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>Browse shared store items by category and sub category, including availability.</p>
        </div>
        <div className='w-full max-w-sm'>
          <Input label='Search store items' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Glass funnel, glassware, apparatus...' />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card title='Store Categories' subtitle='Main inventory groups'>
          <p className='text-3xl font-semibold'>{new Set(storeItems.map((item) => item.category)).size}</p>
        </Card>
        <Card title='Tracked Store Items' subtitle='Total centrally managed SKUs'>
          <p className='text-3xl font-semibold'>{storeItems.length}</p>
        </Card>
        <Card title='Need Refill Soon' subtitle='Items with 5 or fewer left'>
          <p className='text-3xl font-semibold'>{storeItems.filter((item) => item.quantity <= 5).length}</p>
        </Card>
      </div>

      {!groupedItems.length ? (
        <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-10 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
          No store items matched your search.
        </div>
      ) : (
        groupedItems.map((group) => (
          <Card key={group.category} title={group.category} subtitle={`${group.items.length} item${group.items.length > 1 ? 's' : ''} available`}>
            <div className='space-y-3'>
              {group.items.map((item) => (
                <div key={item.id} className='flex items-start justify-between gap-3 rounded-xl border border-[#d9e1ca] px-4 py-3 dark:border-[#414a33]'>
                  <div className='flex items-start gap-3'>
                    <div className='rounded-lg bg-[#edf1e3] p-2 text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
                      <Boxes size={16} />
                    </div>
                    <div>
                      <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{item.itemName}</p>
                      <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
                        {item.subCategory} • Code: {item.itemCode}
                      </p>
                      {item.description ? <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>{item.description}</p> : null}
                      <div className='mt-3'>
                        <Button variant='outline' className='px-3 py-1 text-xs' onClick={() => openRequestModal(item)}>
                          <Send size={14} /> Request From Store
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{item.quantity} {item.quantityUnit}</p>
                    <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{item.storageLocation || 'Store shelf not specified'}</p>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      item.quantity <= 5
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    }`}>
                      {item.quantity <= 5 ? 'Limited stock' : 'Available'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title={selectedItem ? `Request ${selectedItem.itemName}` : 'Request Store Item'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f5eb] p-3 text-sm text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
            Available quantity: {selectedItem?.quantity} {selectedItem?.category === 'Glassware' ? 'number' : selectedItem?.quantityUnit}
          </div>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Input label='Quantity requested' type='number' value={requestForm.quantity} onChange={(e) => setRequestForm((state) => ({ ...state, quantity: e.target.value }))} />
            <Input label='Unit' value={selectedItem ? (selectedItem.category === 'Glassware' ? 'number' : selectedItem.quantityUnit) : ''} readOnly className='bg-[#f4f5eb] dark:bg-[#28301f]' />
          </div>
          <Input label='Purpose' value={requestForm.purpose} onChange={(e) => setRequestForm((state) => ({ ...state, purpose: e.target.value }))} placeholder='Why do you need this item?' />
          <Input label='Need until / return by (optional)' type='date' value={requestForm.dueDate} onChange={(e) => setRequestForm((state) => ({ ...state, dueDate: e.target.value }))} />
          <Input label='Additional notes' value={requestForm.requestNotes} onChange={(e) => setRequestForm((state) => ({ ...state, requestNotes: e.target.value }))} placeholder='Class, faculty, urgency, safety note...' />
          <Button className='w-full' onClick={submitStoreRequest} disabled={requesting}>
            {requesting ? 'Submitting...' : 'Send Store Request'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
