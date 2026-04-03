import { LayoutDashboard, MapPin, ClipboardList, Users, CheckCircle2, History, BarChart3, Store, Boxes, PackageSearch } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const linksMap = {
  'super-admin': [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/labs', label: 'Labs', icon: MapPin },
    { to: '/approval', label: 'Admin Requests', icon: Users },
    { to: '/activity', label: 'Activity', icon: History }
  ],
  'lab-admin': [
    { to: '/inventory', label: 'Inventory', icon: ClipboardList },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/transactions', label: 'Transactions', icon: CheckCircle2 }
  ],
  'store-admin': [
    { to: '/store-dashboard', label: 'Store Inventory', icon: Store }
  ],
  student: [
    { to: '/', label: 'Browse Labs', icon: MapPin },
    { to: '/store', label: 'Store', icon: Boxes },
    { to: '/my-borrowings', label: 'My Borrowings', icon: PackageSearch }
  ]
};

export default function Sidebar({ collapsed }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || 'student';

  return (
    <aside className={`fixed inset-y-0 left-0 z-20 overflow-y-auto border-r border-[#d9e1ca] bg-[#fdfdf7] pt-6 pb-6 transition-all duration-300 dark:border-[#3c452f] dark:bg-[#1c2117] ${collapsed ? '-translate-x-full md:translate-x-0 md:w-20 md:px-3' : 'translate-x-0 w-72 px-4'}`}>
      <div className={`mb-8 flex px-1 ${collapsed ? 'md:justify-center' : 'items-center gap-2'}`}>
        <div className='h-10 w-10 rounded-xl bg-gradient-to-br from-[#556b2f] to-[#7a8f4b]' />
        {!collapsed ? (
          <div>
            <p className='text-sm font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>PharmLab</p>
            <p className='text-xs text-[#71805a] dark:text-[#c5d0b5]'>{role.replace('-', ' ').toUpperCase()}</p>
          </div>
        ) : null}
      </div>

      <nav className='space-y-1'>
        {linksMap[role]?.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => `group flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${collapsed ? 'md:justify-center' : 'gap-2'} ${isActive ? 'bg-[#556b2f] text-[#f0f4e8]' : 'text-[#4e5d35] hover:bg-[#f4f6ee] dark:text-[#d5ddbf] dark:hover:bg-[#28301f]'}`}
            >
              <Icon size={16} className='shrink-0' />
              {!collapsed ? item.label : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
