import { useEffect, useMemo, useState } from 'react';
import { Plus, CheckCircle2, Users, Warehouse, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import useAppStore from '../store/appStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function SuperAdminDashboard() {
  const location = useLocation();
  const {
    labs,
    users,
    fetchLabs,
    fetchUsers,
    createLab,
    deleteLab,
    createLabAdmin,
    createStoreAdmin,
    assignAdminToLab,
    removeAdminFromLab,
    approveUserAccount,
    activityLogs,
    fetchActivityLogs,
    setToast,
    setHighlight
  } = useAppStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [deletingLab, setDeletingLab] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState('');
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [newLab, setNewLab] = useState({ name: '', code: '' });
  const currentView = location.pathname === '/labs' ? 'labs' : location.pathname === '/approval' ? 'approval' : location.pathname === '/activity' ? 'activity' : 'overview';
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [newStoreAdmin, setNewStoreAdmin] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchLabs();
    fetchUsers();
    fetchActivityLogs({ limit: 100 });
  }, [fetchActivityLogs, fetchLabs, fetchUsers]);

  const pendingApprovals = useMemo(
    () => users.filter((user) => user.role !== 'super-admin' && !user.isApproved),
    [users]
  );

  const admins = useMemo(
    () => users.filter((user) => user.role === 'lab-admin'),
    [users]
  );

  const storeAdmins = useMemo(
    () => users.filter((user) => user.role === 'store-admin'),
    [users]
  );

  const recentActivity = useMemo(() => activityLogs.slice(0, 6), [activityLogs]);

  const openManageModal = (lab) => {
    setSelectedLab(lab);
    setSelectedAdminId('');
    setNewAdmin({ name: '', email: '', password: '' });
    setManageOpen(true);
  };

  const cards = useMemo(() => (
    [
      { label: 'Total Labs', value: labs.length, icon: Warehouse, color: 'from-[#556b2f]' },
      { label: 'Pending Approvals', value: pendingApprovals.length, icon: Users, color: 'from-amber-500' },
      { label: 'Admins', value: admins.length + storeAdmins.length, icon: CheckCircle2, color: 'from-green-500' }
    ]
  ), [admins.length, labs.length, pendingApprovals.length, storeAdmins.length]);

  const headers = [
    { key: 'name', label: 'Lab Name' },
    { key: 'location', label: 'Lab Code' },
    { key: 'admin', label: 'Admin' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant='outline' onClick={() => openManageModal(row)} className='text-xs px-3 py-1'>
          Manage
        </Button>
      )
    }
  ];

  const approvalHeaders = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    {
      key: 'status',
      label: 'Status',
      render: () => <span className='rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700'>Pending</span>
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button
          variant='outline'
          onClick={() => handleApproveUser(row.id)}
          className='text-xs px-3 py-1'
          disabled={approvingUserId === row.id}
        >
          {approvingUserId === row.id ? 'Approving...' : 'Approve'}
        </Button>
      )
    }
  ];

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);

  const filteredRows = labs
    .filter((lab) => lab.name.toLowerCase().includes(debouncedSearch.toLowerCase())
      || lab.location.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .map((lab) => ({ ...lab, id: lab._id || lab.id, admin: lab.admin || 'Unassigned' }));

  const eligibleAdmins = useMemo(
    () =>
      users.filter((user) => {
        if (user.role === 'super-admin') return false;
        if (!selectedLab) return true;
        return !user.labId || user.labId === selectedLab.id || user.labId === selectedLab._id;
      }),
    [selectedLab, users]
  );

  const handleCreateLab = async () => {
    if (!newLab.name.trim() || !newLab.code.trim()) return;

    setCreating(true);
    try {
      const createdLab = await createLab({
        name: newLab.name.trim(),
        code: newLab.code.trim().toUpperCase()
      });
      await fetchActivityLogs({ limit: 100 });
      setToast({ type: 'success', message: `Created ${createdLab.name}.` });
      setCreateOpen(false);
      setHighlight(createdLab.id);
      setNewLab({ name: '', code: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create lab.' });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedLab || !selectedAdminId) return;

    setSavingAdmin(true);
    try {
      await assignAdminToLab({ labId: selectedLab.id, adminId: selectedAdminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin assigned successfully.' });
      setManageOpen(false);
      setSelectedAdminId('');
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to assign admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!selectedLab || !adminId) return;

    setSavingAdmin(true);
    try {
      await removeAdminFromLab({ labId: selectedLab.id, adminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin removed from lab.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to remove admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCreateAdminForLab = async () => {
    if (!selectedLab || !newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) return;

    setSavingAdmin(true);
    try {
      const createdAdmin = await createLabAdmin({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        password: newAdmin.password
      });
      await assignAdminToLab({ labId: selectedLab.id, adminId: createdAdmin.id });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Lab admin account created and assigned.' });
      setManageOpen(false);
      setNewAdmin({ name: '', email: '', password: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteLab = async () => {
    if (!selectedLab?.id) return;

    setDeletingLab(true);
    try {
      await deleteLab(selectedLab.id);
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: `${selectedLab.name} deleted.` });
      setManageOpen(false);
      setSelectedLab(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete lab.' });
    } finally {
      setDeletingLab(false);
    }
  };

  async function handleApproveUser(userId) {
    setApprovingUserId(userId);
    try {
      await approveUserAccount(userId);
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Account approved.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve account.' });
    } finally {
      setApprovingUserId('');
    }
  }

  const handleCreateStoreAdmin = async () => {
    if (!newStoreAdmin.name.trim() || !newStoreAdmin.email.trim() || !newStoreAdmin.password.trim()) return;

    setSavingAdmin(true);
    try {
      await createStoreAdmin({
        name: newStoreAdmin.name.trim(),
        email: newStoreAdmin.email.trim(),
        password: newStoreAdmin.password,
      });
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Store admin account created.' });
      setNewStoreAdmin({ name: '', email: '', password: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create store admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  return (
    <div className='space-y-5 pb-10'>
      {currentView === 'overview' ? (
        <>
          <div className='grid gap-4 md:grid-cols-3'>
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className='bg-gradient-to-r from-[#556b2f] to-[#7a8f4b] text-[#f0f4e8] shadow-glow'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-xs uppercase tracking-wider text-[#e4ecd8]'>{card.label}</p>
                      <p className='text-2xl font-bold'>{card.value}</p>
                    </div>
                    <div className='rounded-lg bg-[#f0f4e8]/15 p-2'>
                      <Icon size={20} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className='grid gap-5 lg:grid-cols-2'>
            <Card title='Platform Snapshot' subtitle='High-level operational view'>
              <div className='space-y-3'>
                <div className='flex items-center justify-between rounded-xl bg-[#f4f5eb] px-4 py-3 dark:bg-[#28301f]'>
                  <span className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Labs onboarded</span>
                  <span className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{labs.length}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl bg-[#f4f5eb] px-4 py-3 dark:bg-[#28301f]'>
                  <span className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Lab admins</span>
                  <span className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{admins.length}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl bg-[#f4f5eb] px-4 py-3 dark:bg-[#28301f]'>
                  <span className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Store admins</span>
                  <span className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{storeAdmins.length}</span>
                </div>
                <div className='flex items-center justify-between rounded-xl bg-[#f4f5eb] px-4 py-3 dark:bg-[#28301f]'>
                  <span className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>Accounts waiting approval</span>
                  <span className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{pendingApprovals.length}</span>
                </div>
              </div>
            </Card>
            <Card title='Quick Actions' subtitle='Most-used admin actions'>
              <div className='space-y-3'>
                <Button className='w-full justify-center' onClick={() => setCreateOpen(true)}>
                  <Plus size={16} className='mr-2' /> Create New Lab
                </Button>
                <div className='rounded-xl border border-dashed border-[#cfd8bd] px-4 py-3 text-sm text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
                  Use the `Labs` tab to manage assignments, the `Admin Requests` tab to approve new accounts, and the `Activity` tab to review audit history.
                </div>
              </div>
            </Card>
          </div>
          <Card title='Recent Activity' subtitle='Latest platform audit events'>
            <div className='space-y-3'>
              {recentActivity.length === 0 ? (
                <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No audit activity recorded yet.</p>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className='rounded-xl border border-[#d9e1ca] px-4 py-3 dark:border-[#414a33]'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{log.details}</p>
                        <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{log.actorName} {log.actorEmail ? `(${log.actorEmail})` : ''}</p>
                      </div>
                      <span className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Unknown time'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
          <div className='grid gap-5 lg:grid-cols-2'>
            <Card title='Store Admins' subtitle='Users managing the central store'>
              <div className='space-y-3'>
                {storeAdmins.length === 0 ? (
                  <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No store admins created yet.</p>
                ) : (
                  storeAdmins.map((admin) => (
                    <div key={admin.id} className='rounded-xl border border-[#d9e1ca] px-4 py-3 dark:border-[#414a33]'>
                      <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{admin.name}</p>
                      <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{admin.email}</p>
                      <p className='mt-2 text-xs text-[#71805a] dark:text-[#c5d0b5]'>{admin.isApproved ? 'Approved' : 'Pending approval'}</p>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card title='Create Store Admin' subtitle='Grant central store management access'>
              <div className='space-y-3'>
                <Input label='Admin name' value={newStoreAdmin.name} onChange={(e) => setNewStoreAdmin((state) => ({ ...state, name: e.target.value }))} />
                <Input label='Admin email' type='email' value={newStoreAdmin.email} onChange={(e) => setNewStoreAdmin((state) => ({ ...state, email: e.target.value }))} />
                <Input label='Temporary password' type='password' value={newStoreAdmin.password} onChange={(e) => setNewStoreAdmin((state) => ({ ...state, password: e.target.value }))} minLength={6} />
                <Button onClick={handleCreateStoreAdmin} className='w-full' disabled={savingAdmin}>
                  {savingAdmin ? 'Saving...' : 'Create Store Admin'}
                </Button>
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {currentView === 'labs' ? (
        <>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h2 className='text-xl font-semibold'>Labs</h2>
            <div className='flex items-center gap-2'>
              <div className='flex items-center rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 dark:border-[#4e5d35] dark:bg-[#20251a]'>
                <Search size={16} className='text-[#8b9874]' />
                <input type='text' value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search labs' className='ml-2 w-48 bg-transparent text-sm text-[#3c4e23] outline-none placeholder:text-[#95a381] dark:text-[#eef4e8]' />
              </div>
              <Button variant='outline' onClick={() => setCreateOpen(true)}><Plus size={16} className='mr-2' /> New Lab</Button>
            </div>
          </div>
          <Table headers={headers} rows={filteredRows} />
          <Card title='Lab Admins' subtitle='Approved and unapproved admin accounts linked to labs'>
            <Table
              headers={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'status', label: 'Status' }
              ]}
              rows={admins.map((admin) => ({
                ...admin,
                status: admin.isApproved ? 'Approved' : 'Pending'
              }))}
              className='bg-[#fffef8] dark:bg-[#20251a]'
            />
          </Card>
        </>
      ) : null}

      {currentView === 'approval' ? (
        <>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-xl font-semibold'>Admin Requests</h2>
            <span className='rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700'>
              {pendingApprovals.length} pending
            </span>
          </div>
          <Card title='Pending Approvals' subtitle='Accounts waiting for super admin approval'>
            <Table headers={approvalHeaders} rows={pendingApprovals} className='bg-[#fffef8] dark:bg-[#20251a]' />
          </Card>
        </>
      ) : null}

      {currentView === 'activity' ? (
        <>
          <div className='flex items-center justify-between gap-3'>
            <h2 className='text-xl font-semibold'>Activity History</h2>
            <span className='rounded-full bg-[#edf1e3] px-3 py-1 text-xs font-medium text-[#556b2f] dark:bg-[#28301f] dark:text-[#d5ddbf]'>
              {activityLogs.length} records
            </span>
          </div>
          <Card title='Audit Trail' subtitle='Super admin visibility into platform actions'>
            <Table
              headers={[
                { key: 'timestamp', label: 'When', render: (row) => row.timestamp ? new Date(row.timestamp).toLocaleString() : 'Unknown' },
                { key: 'actorName', label: 'User', render: (row) => `${row.actorName}${row.actorEmail ? ` (${row.actorEmail})` : ''}` },
                { key: 'actorRole', label: 'Role', render: (row) => row.actorRole?.replace('-', ' ') || 'unknown' },
                { key: 'action', label: 'Action' },
                { key: 'details', label: 'Details' }
              ]}
              rows={activityLogs}
              className='bg-[#fffef8] dark:bg-[#20251a]'
            />
          </Card>
        </>
      ) : null}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Create Lab'>
        <div className='space-y-4'>
          <Input label='Lab name' value={newLab.name} onChange={(e) => setNewLab({ ...newLab, name: e.target.value })} />
          <Input label='Lab code' value={newLab.code} onChange={(e) => setNewLab({ ...newLab, code: e.target.value })} />
          <Button onClick={handleCreateLab} className='w-full' disabled={creating}>
            {creating ? 'Creating...' : 'Create Lab'}
          </Button>
        </div>
      </Modal>
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={selectedLab ? `Manage ${selectedLab.name}` : 'Manage Lab'}>
        <div className='space-y-5'>
          <div>
            <p className='text-sm font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>Current admins</p>
            <div className='mt-3 space-y-2'>
              {selectedLab?.admins?.length ? (
                selectedLab.admins.map((admin) => (
                  <div key={admin._id || admin.id} className='flex flex-col gap-3 rounded-xl border border-[#d9e1ca] px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#414a33]'>
                    <div className='min-w-0'>
                      <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{admin.name}</p>
                      <p className='break-words text-xs text-[#71805a] dark:text-[#c5d0b5]'>{admin.email}</p>
                    </div>
                    <Button
                      variant='outline'
                      onClick={() => handleRemoveAdmin(admin._id || admin.id)}
                      className='w-full text-xs px-3 py-1 sm:w-auto'
                      disabled={savingAdmin}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className='rounded-xl border border-dashed border-[#cfd8bd] px-4 py-3 text-sm text-[#71805a] dark:border-[#4e5d35] dark:text-[#c5d0b5]'>
                  No admin assigned yet.
                </p>
              )}
            </div>
          </div>
          <div className='space-y-3'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Assign admin</span>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className='w-full rounded-lg border border-[#cfd8bd] bg-[#fffef8] px-3 py-2 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value=''>Select a user</option>
                {eligibleAdmins.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={handleAssignAdmin} className='w-full' disabled={savingAdmin || !selectedAdminId}>
              {savingAdmin ? 'Saving...' : 'Assign Admin'}
            </Button>
          </div>
          <div className='rounded-2xl border border-[#d9e1ca] p-4 dark:border-[#414a33]'>
            <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>Create new lab admin</p>
            <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>Enter the admin's name, email, and password here. The account will be created and assigned to this lab.</p>
            <div className='mt-4 space-y-3'>
              <Input label='Admin name' value={newAdmin.name} onChange={(e) => setNewAdmin((state) => ({ ...state, name: e.target.value }))} />
              <Input label='Admin email' type='email' value={newAdmin.email} onChange={(e) => setNewAdmin((state) => ({ ...state, email: e.target.value }))} />
              <Input label='Temporary password' type='password' value={newAdmin.password} onChange={(e) => setNewAdmin((state) => ({ ...state, password: e.target.value }))} minLength={6} />
              <Button onClick={handleCreateAdminForLab} className='w-full' disabled={savingAdmin}>
                {savingAdmin ? 'Saving...' : 'Create Admin For Lab'}
              </Button>
            </div>
          </div>
          <div className='rounded-2xl border border-red-200 p-4 dark:border-red-900/50'>
            <p className='text-sm font-medium text-red-700 dark:text-red-300'>Delete lab</p>
            <p className='mt-1 text-xs text-[#71805a] dark:text-[#c5d0b5]'>
              This permanently removes the lab, its inventory, and its linked transaction history. Lab admins assigned to it will be converted back to students.
            </p>
            <Button
              variant='outline'
              onClick={handleDeleteLab}
              className='mt-4 w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/20'
              disabled={deletingLab}
            >
              {deletingLab ? 'Deleting...' : 'Delete Lab'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
