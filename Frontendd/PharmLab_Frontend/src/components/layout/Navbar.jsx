import { useMemo, useState } from 'react';
import { Moon, Sun, LogOut, Bell } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useAppStore from '../../store/appStore';
import { getUserAvatarUrl } from '../../utils/avatar';

export default function Navbar({ onToggleSidebar, isDark, toggleTheme }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const inventory = useAppStore((state) => state.inventory);
  const transactions = useAppStore((state) => state.transactions);
  const userName = user?.name || 'PharmLab User';
  const avatarUrl = getUserAvatarUrl(user);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const notifications = useMemo(() => {
    const lowStockItems = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.minThreshold || 5));
    const pendingTransactions = transactions.filter((tx) => tx.status === 'pending');
    const recentTransactions = transactions.slice(0, 3);
    const canSeeInventoryAlerts = user?.role === 'lab-admin' || user?.role === 'super-admin';

    const items = [];

    if (canSeeInventoryAlerts && lowStockItems.length) {
      items.push({
        id: 'low-stock',
        title: 'Low stock alert',
        detail: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's are' : ' is'} below threshold.`
      });
    }

    if (pendingTransactions.length) {
      items.push({
        id: 'pending',
        title: 'Pending requests',
        detail: `${pendingTransactions.length} transaction${pendingTransactions.length > 1 ? 's need' : ' needs'} attention.`
      });
    }

    recentTransactions.forEach((tx) => {
      items.push({
        id: tx.id,
        title: tx.itemName || 'Inventory update',
        detail: `${tx.type || 'transaction'} • ${tx.status || 'updated'}`
      });
    });

    return items.slice(0, 5);
  }, [inventory, transactions, user?.role]);

  return (
    <header className='sticky top-0 z-30 border-b border-[#d9e1ca] bg-[#fffef8]/92 backdrop-blur-md dark:border-[#3c452f] dark:bg-[#1c2117]/92'>
      <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-3'>
          <button className='rounded-lg p-2 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]' onClick={onToggleSidebar}>
            <span className='sr-only'>Toggle sidebar</span>
            <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path d='M4 6h16M4 12h16M4 18h16' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' /></svg>
          </button>
          <img
            src={avatarUrl}
            alt={`${userName} avatar`}
            className='h-10 w-10 rounded-full border border-[#d9e1ca] bg-[#f4f5eb] object-cover dark:border-[#4e5d35] dark:bg-[#28301f]'
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'https://api.dicebear.com/9.x/initials/svg?seed=PharmLab';
            }}
          />
          <div>
            <p className='text-xs font-medium text-[#8b9874]'>Welcome back</p>
            <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{userName}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <div className='relative'>
            <button
              className='rounded-lg p-2 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]'
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label='Toggle notifications'
            >
              <Bell size={18} />
            </button>
            {notificationsOpen ? (
              <div className='fixed left-4 right-4 top-20 z-40 max-h-[70vh] overflow-y-auto rounded-xl border border-[#d9e1ca] bg-[#fffef8] p-3 shadow-soft md:absolute md:left-auto md:right-0 md:top-12 md:w-72 dark:border-[#414a33] dark:bg-[#20251a]'>
                <p className='mb-2 text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>Notifications</p>
                {notifications.length ? (
                  <div className='space-y-2'>
                    {notifications.map((item) => (
                      <div key={item.id} className='rounded-lg bg-[#f4f5eb] px-3 py-2 dark:bg-[#28301f]'>
                        <p className='text-sm font-medium text-[#3c4e23] dark:text-[#eef4e8]'>{item.title}</p>
                        <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{item.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>No new notifications.</p>
                )}
              </div>
            ) : null}
          </div>
          <button className='rounded-lg p-2 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#28301f]' onClick={toggleTheme}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className='flex min-h-[2.5rem] items-center gap-2 rounded-lg border border-[#cfd8bd] bg-[#f4f5eb] px-3 py-1.5 text-sm font-medium text-[#3c4e23] hover:bg-[#f4f6ee] dark:border-[#4e5d35] dark:bg-[#28301f] dark:text-[#eef4e8] dark:hover:bg-[#313a26]' onClick={logout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
