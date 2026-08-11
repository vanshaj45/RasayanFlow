import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Users,
  CheckCircle2,
  History,
  BarChart3,
  Store,
  Boxes,
  PackageSearch,
  Info,
  Activity,
  AlertTriangle,
  KeyRound,
  FileText,
  Bell,
  FlaskConical,
  BookOpen,
  FileSpreadsheet,
  Megaphone,
  UsersRound,
  Radio
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import useStoreManagerMock from "../../store/storeManagerMock";
import { parsePackSize, safeRound, totalStock } from "../../utils/storeHelpers";

const linksMap = {
  "super-admin": [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/labs", label: "Labs Hub", icon: MapPin },
    { to: "/approval", label: "Users & Approvals", icon: Users },
    { to: "/master-chemicals", label: "Chemical Master", icon: FlaskConical },
    { to: "/curriculum", label: "Curriculum & Practicals", icon: BookOpen },
    { to: "/store-oversight", label: "Store Oversight", icon: Store },
    { to: "/activity", label: "Audit Logs", icon: History },
    { to: "/settings", label: "Security & Settings", icon: KeyRound },
    { to: "/about", label: "About Us", icon: Info },
  ],
  "lab-admin": [
    { to: "/inventory", label: "Inventory", icon: ClipboardList },
    { to: "/lab/experiments", label: "Experiments", icon: FileText },
    { to: "/lab/student-requests", label: "Student Requests", icon: Users },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/transactions", label: "Transactions", icon: CheckCircle2 },
    { to: "/lab/groups", label: "Student Groups", icon: UsersRound },
    { to: "/lab/live", label: "Live Monitor", icon: Radio },
    { to: "/lab/store-requests", label: "Store Requests", icon: Store },
    { to: "/lab/history", label: "History", icon: History },
    { to: "/lab/notifications", label: "Notifications", icon: Bell },
    { to: "/about", label: "About Us", icon: Info },
  ],
  "store_admin": [
    { to: "/store/dashboard", label: "Dashboard", icon: Store },
    { to: "/store/inventory", label: "Inventory", icon: Boxes },
    { to: "/store/tracking", label: "Tracking", icon: Activity },
    { to: "/store/lowstock", label: "Low Stock", icon: AlertTriangle },
    { to: "/store/overview", label: "Overview", icon: BarChart3 },
    { to: "/store/requests", label: "Requests", icon: ClipboardList },
    { to: "/store/history", label: "History", icon: History },
    { to: "/store/reports", label: "Reports", icon: FileText },
    { to: "/about", label: "About Us", icon: Info },
  ],
  student: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/my-borrowings", label: "My Activity", icon: PackageSearch },
    { to: "/about", label: "About Us", icon: Info },
  ],
};

export default function Sidebar({ collapsed }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || "student";
  const navRole = (role === "store-admin" || role === "store_admin" || role === "storeAdmin") 
    ? "store_admin" 
    : (role === "lab-admin" || role === "labAdmin" || role === "lab_admin") 
    ? "lab-admin" 
    : (role === "super-admin" || role === "superAdmin") 
    ? "super-admin" 
    : role;
  
  const [storeInventory, setStoreInventory] = useState([]);
  const alertThreshold = 15;

  useEffect(() => {
    if (role === 'store-admin' || role === 'store_admin' || role === 'storeAdmin') {
      import('../../services/api').then(({ default: api }) => {
        import('../../utils/storeMapper').then(({ toFrontendChemical }) => {
          api.get('/store/inventory')
            .then(res => setStoreInventory((res.data || []).map(toFrontendChemical)))
            .catch(() => {});
        });
      });
    }
  }, [role]);

  let lowStockCount = 0;
  if (role === 'store-admin' || role === 'store_admin' || role === 'storeAdmin') {
    storeInventory.forEach(chem => {
      const receivedStock = totalStock(chem['Received Quantity'], chem['Pack Size']);
      const availableStock = totalStock(chem['Available Quantity'], chem['Pack Size']);
      const totalBase = receivedStock.total;
      const availableBase = availableStock.total;
      
      if (totalBase > 0) {
        const percentage = safeRound((availableBase / totalBase) * 100);
        if (percentage < alertThreshold) {
          lowStockCount++;
        }
      }
    });
  }

  let storeRequestsCount = 0;
  if (role === 'lab-admin' || role === 'labAdmin' || role === 'lab_admin') {
    const studentRequests = useAppStore.getState()?.studentRequests || [];
    storeRequestsCount = studentRequests.filter(r => r.overallStatus === 'Pending').length;
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 overflow-y-auto border-r border-[#d9e1ca] bg-[#fdfdf7] pt-5 pb-6 transition-all duration-300 dark:border-[#3c452f] dark:bg-[#1c2117] ${
        collapsed ? "-translate-x-full md:translate-x-0 md:w-20 md:px-2.5" : "translate-x-0 w-72 px-3.5"
      }`}
    >
      <div className={`mb-6 flex ${collapsed ? "md:justify-center" : "items-center gap-3 px-2 pb-5 border-b border-[#e8efd9] dark:border-[#2e3d19]"}`}>
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#cfd8bd] bg-[#f4f5eb] shadow-sm dark:border-[#414a33] dark:bg-[#28301f]">
          <img
            src="/RasayanFlow_logo.png"
            alt="RasayanFlow Logo"
            className="h-full w-full object-cover"
          />
        </div>
        {!collapsed ? (
          <div className="flex flex-col min-w-0">
            <p className="text-base font-bold leading-tight tracking-tight text-[#2e3d19] dark:text-[#eef4e8] truncate">
              RasayanFlow
            </p>
            <span className="mt-1 inline-flex w-fit items-center rounded-md bg-[#eef4e4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]">
              {role.replace(/-/g, " ")}
            </span>
          </div>
        ) : null}
      </div>

      <nav className="space-y-1.5 w-full">
        {linksMap[navRole]?.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-[14.5px] font-medium transition-all duration-200 ${
                  collapsed ? "md:justify-center md:px-2" : "gap-3"
                } ${
                  isActive
                    ? "bg-[#556b2f] text-white shadow-md font-bold dark:bg-[#556b2f] dark:text-[#f4f7ee]"
                    : "text-[#3c4e23] hover:bg-[#ebf1e1] hover:text-[#1f2b10] dark:text-[#c5d0b5] dark:hover:bg-[#27311f] dark:hover:text-[#f4f7ee]"
                }`
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={19} className="shrink-0 transition-transform duration-200 group-hover:scale-110" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </div>
              {!collapsed && item.to === "/store/lowstock" && lowStockCount > 0 ? (
                <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{lowStockCount}</span>
              ) : null}
              {!collapsed && item.to === "/lab/store-requests" && storeRequestsCount > 0 ? (
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{storeRequestsCount}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
