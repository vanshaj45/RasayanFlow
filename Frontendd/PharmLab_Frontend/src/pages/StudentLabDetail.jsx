import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Package, Info, ExternalLink } from 'lucide-react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';

const CHEMICAL_HINTS = ['chemical', 'acid', 'base', 'solvent', 'reagent', 'drug', 'antibiotic', 'analgesic', 'sedative', 'iv fluid', 'emergency'];

const isChemicalLike = (item) => {
  const combined = `${item?.category || ''} ${item?.name || item?.itemName || ''}`.toLowerCase();
  return CHEMICAL_HINTS.some((hint) => combined.includes(hint));
};

const buildAiFallbackAbstract = (item) => {
  if (!isChemicalLike(item)) return '';

  const itemName = item?.name || item?.itemName || 'This chemical';
  const category = item?.category || 'chemical';
  const storage = item?.storageLocation || 'designated storage';
  const quantity = Number(item?.quantity || 0);
  const quantityUnit = item?.quantityUnit || 'units';
  const lowerName = itemName.toLowerCase();

  let useCase = 'used for supervised laboratory learning, demonstration, and controlled handling.';
  let precautions = 'Wear appropriate PPE, keep the container closed, and use only under supervision.';
  let avoid = 'Avoid direct contact, inhalation, and incompatible mixing unless a protocol allows it.';

  if (lowerName.includes('acid')) {
    useCase = 'used for pH adjustment, titration work, cleaning protocols, and controlled reaction studies.';
    precautions = 'Wear gloves, eye protection, and a lab coat; handle in a ventilated area and add acid to water, not the reverse.';
    avoid = 'Avoid skin and eye contact, incompatible bases, metals, and uncontrolled dilution.';
  } else if (lowerName.includes('solvent') || lowerName.includes('ethanol')) {
    useCase = 'used as a solvent for preparation, extraction, cleaning, and sample handling in laboratory work.';
    precautions = 'Keep away from heat and ignition sources and work in a well-ventilated area.';
    avoid = 'Avoid open flames, sparks, and strong oxidizers unless a protocol explicitly permits it.';
  } else if (lowerName.includes('antibiotic')) {
    useCase = 'used in laboratory and teaching settings to study antimicrobial handling, dosage, and formulation concepts.';
    precautions = 'Handle carefully, follow the approved protocol, and use sterile technique where required.';
    avoid = 'Avoid unauthorized use, contamination, and application outside approved instruction or clinical protocol.';
  } else if (lowerName.includes('sedative') || lowerName.includes('diazepam')) {
    useCase = 'used in pharmacology teaching to demonstrate controlled drug handling, dosing concepts, and safety procedures.';
    precautions = 'Treat as a controlled medicine, keep access restricted, and document every use.';
    avoid = 'Avoid unauthorized handling, sharing, or use outside approved supervision and recordkeeping.';
  }

  return [
    `AI-generated summary: ${itemName} is a ${category} item used in educational laboratory workflows.`,
    `It is ${useCase}`,
    `Current recorded stock is ${quantity} ${quantityUnit}, stored at ${storage}.`,
    `Precautions: ${precautions}`,
    `Avoid: ${avoid}`,
    'This summary is generated automatically because no admin or PubMed abstract is available; verify with official references before critical use.',
  ].join(' ');
};

export default function StudentLabDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { labs, inventory, transactions, experiments, fetchLabs, fetchInventory, fetchTransactions, fetchExperiments, createBorrowRequest, createExperimentRequest, setToast } = useAppStore();
  const user = useAuthStore((state) => state.user);
  const [borrowOpen, setBorrowOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [experimentSearch, setExperimentSearch] = useState('');
  const [expandedAbstract, setExpandedAbstract] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [requestingExperiment, setRequestingExperiment] = useState(false);
  const [experimentRequestForm, setExperimentRequestForm] = useState({ purpose: '', preferredDate: '', notes: '' });
  const [borrowForm, setBorrowForm] = useState({
    quantity: '',
    purpose: '',
    neededUntil: '',
    notes: '',
  });

  useEffect(() => {
    fetchLabs();
    fetchTransactions();
    if (id) {
      fetchInventory(id);
      fetchExperiments({ labId: id });
    }
  }, [fetchExperiments, fetchLabs, fetchTransactions, fetchInventory, id]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTransactions();
      if (id) {
        fetchInventory(id);
        fetchExperiments({ labId: id });
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [fetchExperiments, fetchTransactions, fetchInventory, id]);

  const lab = useMemo(() => labs.find((entry) => String(entry.id || entry._id) === String(id)), [id, labs]);

  const rows = useMemo(() => {
    const query = inventorySearch.trim().toLowerCase();
    const filtered = query
      ? inventory.filter((item) => [item.name, item.itemCode, item.category, item.storageLocation].filter(Boolean).some((value) => value.toLowerCase().includes(query)))
      : inventory;

    return filtered.map((item) => {
      const fallbackAbstract = buildAiFallbackAbstract(item);
      return {
        ...item,
        id: item.id || item._id,
        manufacturingCompanyDisplay: item.manufacturingCompany || 'Not specified',
        quantityDisplay: `${item.quantity} ${item.quantityUnit || 'units'}`,
        expiryDisplay: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A',
        storageDisplay: item.storageLocation || 'Not specified',
        displayAbstract: item.displayAbstract || item.abstract || fallbackAbstract,
        isAiGenerated: Boolean(item.isAiGenerated || (!item.displayAbstract && !item.abstract && fallbackAbstract)),
      };
    });
  }, [inventory, inventorySearch]);

  const myRequests = useMemo(
    () => transactions.filter((tx) => String(tx.labId) === String(id) || String(tx.labId?._id) === String(id)),
    [id, transactions]
  );

  const experimentRows = useMemo(() => {
    const query = experimentSearch.trim().toLowerCase();
    const labExperiments = experiments.filter((experiment) => String(experiment.labId) === String(id));

    if (!query) return labExperiments;

    return labExperiments.filter((experiment) =>
      [experiment.title, experiment.experimentObject, experiment.description, ...(experiment.requiredInventory || []).map((entry) => entry.chemicalName)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [experimentSearch, experiments, id]);

  const openBorrowModal = (item) => {
    setSelectedItem(item);
    setBorrowForm({ quantity: '', purpose: '', neededUntil: '', notes: '' });
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
        notes: borrowForm.notes.trim(),
      });
      setToast({ type: 'success', message: 'Borrow request submitted for admin approval.' });
      setBorrowOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit borrow request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openExperimentRequest = (experiment) => {
    setSelectedExperiment(experiment);
    setExperimentRequestForm({ purpose: '', preferredDate: '', notes: '' });
    setRequestOpen(true);
  };

  const submitExperimentRequest = async () => {
    if (!selectedExperiment) return;

    setRequestingExperiment(true);
    try {
      await createExperimentRequest({
        experimentId: selectedExperiment.id,
        purpose: experimentRequestForm.purpose.trim(),
        preferredDate: experimentRequestForm.preferredDate || null,
        notes: experimentRequestForm.notes.trim(),
      });
      setToast({ type: 'success', message: 'Experiment request submitted for lab admin approval.' });
      setRequestOpen(false);
      await fetchTransactions();
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to submit experiment request.' });
    } finally {
      setRequestingExperiment(false);
    }
  };

  return (
    <div className='space-y-6 pb-10'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <Button variant='outline' onClick={() => navigate('/')} className='mb-3 px-3 py-1 text-xs'>
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
            <h3 className='text-lg font-semibold'>Experiments In This Lab</h3>
            <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Only experiments configured for this lab are shown here.</p>
          </div>
          <div className='w-full sm:max-w-sm'>
            <Input
              label='Search lab experiments'
              value={experimentSearch}
              onChange={(e) => setExperimentSearch(e.target.value)}
              placeholder='Titration, chromatography...'
            />
          </div>
        </div>

        {experimentRows.length ? (
          <div className='space-y-4'>
            {experimentRows.map((experiment) => (
              <div key={experiment.id} className='rounded-xl border border-[#d9e1ca] px-4 py-4 dark:border-[#414a33]'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <p className='text-base font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{experiment.title}</p>
                    <p className='mt-2 text-sm text-slate-700 dark:text-slate-200'>Object: {experiment.experimentObject}</p>
                    {experiment.description ? <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>{experiment.description}</p> : null}
                    <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>
                      Required chemicals: {experiment.requiredInventory.map((entry) => `${entry.chemicalName} (${entry.quantity} ${entry.quantityUnit})`).join(', ') || 'N/A'}
                    </p>
                  </div>
                  <div className='text-left lg:text-right'>
                    <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Rs. {Number(experiment.totalEstimatedExpense || 0).toFixed(2)}</p>
                    <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Estimated experiment expense</p>
                    <Button className='mt-3' onClick={() => openExperimentRequest(experiment)}>
                      Request Complete Experiment
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='rounded-xl border border-dashed border-[#cfd8bd] px-5 py-8 text-center text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
            No experiments are configured for this lab yet.
          </div>
        )}
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
            { key: 'manufacturingCompanyDisplay', label: 'Company' },
            { key: 'quantityDisplay', label: 'Quantity' },
            { key: 'storageDisplay', label: 'Storage' },
            { key: 'expiryDisplay', label: 'Expiry' },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className='flex items-center gap-2'>
                  <Button variant='outline' onClick={() => openBorrowModal(row)} className='px-3 py-1 text-xs'>
                    Request Borrow
                  </Button>
                  {row.displayAbstract && (
                    <button
                      onClick={() => setExpandedAbstract(expandedAbstract === row.id ? null : row.id)}
                      className='inline-flex items-center justify-center rounded-lg p-1.5 transition hover:bg-[#edf1e3] dark:hover:bg-[#28301f]'
                      title='View chemical information'
                    >
                      <Info size={18} className='text-[#556b2f] dark:text-[#b8c5a0]' />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          rows={rows}
          expandedRowId={expandedAbstract}
          renderExpandedRow={(row) => (
            <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-4 dark:border-[#414a33] dark:bg-[#1f2419]'>
              <div className='mb-3 flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{row.name}</p>
                  <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{row.isAiGenerated ? 'AI-generated chemical summary' : 'Chemical information'}</p>
                </div>
                <button onClick={() => setExpandedAbstract(null)} className='text-[#71805a] hover:text-[#3c4e23] dark:text-[#a8b8a0] dark:hover:text-[#eef4e8]'>
                  ✕
                </button>
              </div>
              <div className='border-t border-[#d9e1ca] pt-3 dark:border-[#414a33]'>
                <p className='mb-2 text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>Abstract</p>
                <p className='text-sm leading-relaxed text-[#3c4e23] dark:text-[#d5ddbf]'>{row.displayAbstract}</p>
                {row.isAiGenerated && <p className='mt-2 text-xs font-medium text-amber-700 dark:text-amber-300'>Source: AI-generated fallback (admin abstract not provided)</p>}
                {row.pubmedId && (
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/${row.pubmedId}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-3 inline-flex items-center gap-1 text-xs text-[#556b2f] transition hover:text-[#3c4e23] dark:text-[#b8c5a0] dark:hover:text-[#eef4e8]'
                  >
                    <ExternalLink size={14} /> Read full article on PubMed
                  </a>
                )}
              </div>
            </div>
          )}
        />
      </div>

      <Modal open={borrowOpen} onClose={() => setBorrowOpen(false)} title={selectedItem ? `Borrow Request: ${selectedItem.name}` : 'Borrow Request'}>
        <div className='space-y-4'>
          <div className='rounded-xl bg-[#f4f5eb] p-3 text-sm text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
            Available quantity: {selectedItem?.quantity} {selectedItem?.quantityUnit || 'units'}
          </div>
          {selectedItem?.displayAbstract && (
            <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
              <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>About this chemical</p>
              <p className='mt-2 text-xs leading-relaxed text-[#3c4e23] dark:text-[#d5ddbf]'>
                {selectedItem.displayAbstract.length > 400 ? `${selectedItem.displayAbstract.substring(0, 400)}...` : selectedItem.displayAbstract}
              </p>
              {selectedItem.isAiGenerated && <p className='mt-2 text-xs font-medium text-amber-700 dark:text-amber-300'>Source: AI-generated fallback (admin abstract not provided)</p>}
              {selectedItem.pubmedId && (
                <p className='mt-2 text-xs text-[#71805a] dark:text-[#a8b8a0]'>
                  <a href={`https://pubmed.ncbi.nlm.nih.gov/${selectedItem.pubmedId}`} target='_blank' rel='noopener noreferrer' className='hover:underline'>
                    View full research on PubMed →
                  </a>
                </p>
              )}
            </div>
          )}
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

      <Modal open={requestOpen} onClose={() => setRequestOpen(false)} title={selectedExperiment ? `Request ${selectedExperiment.title}` : 'Request Experiment'}>
        <div className='space-y-4'>
          <div className='rounded-lg border border-[#d9e1ca] bg-[#f9faef] p-3 dark:border-[#414a33] dark:bg-[#1f2419]'>
            <p className='text-xs font-semibold uppercase text-[#556b2f] dark:text-[#b8c5a0]'>Experiment object</p>
            <p className='mt-2 text-sm text-[#3c4e23] dark:text-[#eef4e8]'>{selectedExperiment?.experimentObject || 'N/A'}</p>
            <p className='mt-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
              Required chemicals: {selectedExperiment?.requiredInventory?.map((entry) => `${entry.chemicalName} (${entry.quantity} ${entry.quantityUnit})`).join(', ') || 'N/A'}
            </p>
          </div>
          <Input label='Purpose' value={experimentRequestForm.purpose} onChange={(e) => setExperimentRequestForm((state) => ({ ...state, purpose: e.target.value }))} placeholder='Why do you need this experiment?' />
          <Input label='Preferred date' type='date' value={experimentRequestForm.preferredDate} onChange={(e) => setExperimentRequestForm((state) => ({ ...state, preferredDate: e.target.value }))} />
          <Input label='Additional notes' value={experimentRequestForm.notes} onChange={(e) => setExperimentRequestForm((state) => ({ ...state, notes: e.target.value }))} placeholder='Faculty, batch, safety notes...' />
          <Button className='w-full' onClick={submitExperimentRequest} disabled={requestingExperiment}>
            {requestingExperiment ? 'Submitting...' : 'Send Experiment Request'}
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
              ),
            },
          ]}
          rows={myRequests.map((tx) => ({
            ...tx,
            quantityDisplay: `${tx.quantity} ${tx.itemId?.quantityUnit || ''}`.trim(),
            neededUntilDisplay: tx.neededUntil ? new Date(tx.neededUntil).toLocaleDateString() : 'N/A',
          }))}
        />
      </div>
    </div>
  );
}
