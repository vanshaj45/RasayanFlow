import { 
  AlertTriangle, 
  Boxes, 
  ClipboardList, 
  FileSpreadsheet, 
  PackageX, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  History,
  Activity,
  Award,
  BarChart3
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import StoreImportModal from './StoreImportModal';
import StoreLayout from './StoreLayout';
import { UpdateTypeBadge } from './StoreTracking';
import { formatQuantity } from './storeManagerMock';
import { safeRound, totalStock } from '../utils/storeHelpers';
import api from '../services/api';
import { toFrontendChemical, toFrontendHistory } from '../utils/storeMapper';

export default function StoreDashboard() {
  const [chemicals, setChemicals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [trackingLogs, setTrackingLogs] = useState([]);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [invRes, reqRes, histRes, trackRes] = await Promise.all([
          api.get('/store/inventory'),
          api.get('/store/requests'),
          api.get('/store/history'),
          api.get('/store/tracking')
        ]);
        setChemicals((invRes.data || []).map(toFrontendChemical));
        setRequests(reqRes.data || []);
        setHistory((histRes.data || []).map(toFrontendHistory));
        setTrackingLogs(trackRes.data || []);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === 'Pending').length, [requests]);
  const lowStockCount = useMemo(() => chemicals.filter((c) => c.status === 'Low Stock').length, [chemicals]);
  const outOfStockCount = useMemo(() => chemicals.filter((c) => c.status === 'Out of Stock').length, [chemicals]);

  // Financial Metrics
  const financialMetrics = useMemo(() => {
    const totalInventoryValue = safeRound(chemicals.reduce((acc, chem) => acc + (chem['Total Current Value (INR)'] || 0), 0));
    
    const valueReleasedToLabs = safeRound(
      history
        .filter(h => h.status === 'Approved' || h.status === 'Approved')
        .reduce((acc, h) => acc + (h.valueReleased || (h.totalValueBefore - h.totalValueAfter) || 0), 0)
    );

    const outOfStockLoss = safeRound(chemicals
      .filter(chem => chem.status === 'Out of Stock')
      .reduce((acc, chem) => acc + ((chem['Unit Price (INR)'] || 0) * (chem['Received Quantity'] || 1)), 0));

    const avgChemValue = chemicals.length > 0 ? safeRound(totalInventoryValue / chemicals.length) : 0;

    const mostExpensiveChem = chemicals.reduce(
      (max, chem) => ((chem['Unit Price (INR)'] || 0) > (max['Unit Price (INR)'] || 0) ? chem : max),
      chemicals[0] || {}
    );

    const inStockChems = chemicals.filter(chem => (chem['Total Current Value (INR)'] || 0) > 0);
    const lowestStockChem = inStockChems.reduce(
      (min, chem) => ((chem['Total Current Value (INR)'] || 0) < (min['Total Current Value (INR)'] || Infinity) ? chem : min),
      inStockChems[0] || {}
    );

    return {
      totalInventoryValue,
      valueReleasedToLabs,
      outOfStockLoss,
      avgChemValue,
      mostExpensiveChem,
      lowestStockChem
    };
  }, [chemicals, history]);

  // Low stock alerts percentage
  const alertThreshold = 15;
  const lowStockAlerts = useMemo(() => {
    return [...chemicals].reduce((acc, chem) => {
      const receivedStock = totalStock(chem['Received Quantity'], chem['Pack Size']);
      const availableStock = totalStock(chem['Available Quantity'], chem['Pack Size']);
      const totalBase = receivedStock.total;
      const availableBase = availableStock.total;
      if (totalBase > 0) {
        const percentage = safeRound((availableBase / totalBase) * 100);
        if (percentage < alertThreshold || chem.status === 'Low Stock' || chem.status === 'Out of Stock') {
          acc.push({ chem, percentage, availableBase, unit: availableStock.unit });
        }
      }
      return acc;
    }, []).sort((a, b) => a.percentage - b.percentage);
  }, [chemicals]);

  const topStats = [
    { title: 'Total Chemicals', subtitle: 'Registered in store inventory', value: chemicals.length, icon: Boxes, gradient: 'from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/20', iconColor: 'text-blue-600 dark:text-blue-400', badge: 'Active Inventory' },
    { title: 'Pending Requisitions', subtitle: 'Lab requisitions awaiting action', value: pendingRequests, icon: ClipboardList, gradient: 'from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/20', iconColor: 'text-emerald-600 dark:text-emerald-400', badge: pendingRequests > 0 ? 'Requires Action' : 'Up to Date' },
    { title: 'Low Stock Items', subtitle: 'Refill should be planned', value: lowStockCount, icon: AlertTriangle, gradient: 'from-amber-50 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-950/20', iconColor: 'text-amber-600 dark:text-amber-400', badge: 'Reorder Warning' },
    { title: 'Out of Stock Items', subtitle: 'Currently zero balance', value: outOfStockCount, icon: PackageX, gradient: 'from-rose-50 to-red-100 dark:from-rose-950/40 dark:to-red-950/20', iconColor: 'text-rose-600 dark:text-rose-400', badge: outOfStockCount > 0 ? 'Stockout Alert' : 'No Outages' },
  ];

  return (
    <StoreLayout 
      title='Store Central Dashboard' 
      subtitle='Executive overview of central chemical inventory, financial valuation, and transfer logs.'
      actions={
        <Button 
          onClick={() => setImportOpen(true)}
          className="bg-[#556b2f] hover:bg-[#455724] text-white font-semibold text-xs py-2 px-4 shadow-sm"
        >
          <FileSpreadsheet size={16} className="mr-2" /> Bulk Import / Google Sheets
        </Button>
      }
    >
      {/* TOP METRICS GRID */}
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {topStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} title={stat.title} subtitle={stat.subtitle}>
              <div className={`-m-4 mt-2 rounded-b-xl bg-gradient-to-br p-4 ${stat.gradient}`}>
                <div className='flex items-end justify-between gap-3'>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/70 dark:bg-black/40 text-slate-700 dark:text-slate-300">
                      {stat.badge}
                    </span>
                    <p className={`mt-2 text-3xl font-bold ${stat.iconColor}`}>{loading ? '...' : stat.value}</p>
                  </div>
                  <span className={`rounded-xl bg-white/70 p-3 shadow-sm dark:bg-black/30 ${stat.iconColor}`}>
                    <Icon size={22} />
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* FINANCIAL & VALUATION COMMAND CENTER */}
      <div className="rounded-2xl border border-[#d9e1ca] bg-gradient-to-br from-[#f9faef] via-white to-[#f4f6ee] p-6 shadow-sm dark:border-[#3c452f] dark:from-[#1a1e15] dark:via-[#1c2117] dark:to-[#171a12]">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#e3e9d8] dark:border-[#2e3d19] pb-3">
          <div>
            <h3 className="text-lg font-bold text-[#2e3d19] dark:text-[#eef4e8] flex items-center gap-2">
              <IndianRupee className="text-[#556b2f] dark:text-[#a8be8a]" size={20} />
              Central Store Financial Valuation & Price Breakdown
            </h3>
            <p className="text-xs text-[#71805a] dark:text-[#c5d0b5]">
              Real-time audit of total inventory capitalization, released lab value, and chemical unit pricing.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#eef4e4] text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5]">
            Live Database Connected
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Valuation */}
          <div className="rounded-xl bg-emerald-500/10 p-4 border border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-800/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                Total Inventory Value
              </span>
              <IndianRupee size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-100">
              ₹ {financialMetrics.totalInventoryValue.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
              Total stock capitalization across {chemicals.length} chemicals
            </p>
          </div>

          {/* Value Released to Labs */}
          <div className="rounded-xl bg-blue-500/10 p-4 border border-blue-500/20 dark:bg-blue-950/20 dark:border-blue-800/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400">
                Value Released to Labs
              </span>
              <ArrowUpRight size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-blue-900 dark:text-blue-100">
              ₹ {financialMetrics.valueReleasedToLabs.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300">
              Approved transfers to academic labs
            </p>
          </div>

          {/* Average Chemical Valuation */}
          <div className="rounded-xl bg-[#f4f6ee] p-4 border border-[#cfd8bd] dark:bg-[#20261a] dark:border-[#4e5d35]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#4e5d35] dark:text-[#c5d0b5]">
                Avg Valuation / Chemical
              </span>
              <BarChart3 size={16} className="text-[#556b2f] dark:text-[#a8be8a]" />
            </div>
            <p className="mt-2 text-2xl font-black text-[#2e3d19] dark:text-[#eef4e8]">
              ₹ {financialMetrics.avgChemValue.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] text-[#71805a] dark:text-[#c5d0b5]">
              Average cost per catalog chemical
            </p>
          </div>

          {/* Out of Stock Opportunity Loss */}
          <div className="rounded-xl bg-rose-500/10 p-4 border border-rose-500/20 dark:bg-rose-950/20 dark:border-rose-800/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400">
                Stockout Deficit Value
              </span>
              <PackageX size={16} className="text-rose-600 dark:text-rose-400" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-900 dark:text-rose-100">
              ₹ {financialMetrics.outOfStockLoss.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
              Estimated value of zero-balance stock
            </p>
          </div>
        </div>

        {/* Pricing Highlights Row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-white p-3.5 border border-[#e3e9d8] dark:bg-[#141710] dark:border-[#2e3d19] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#c5d0b5]">
                Highest Price Chemical
              </p>
              <p className="text-sm font-semibold text-[#2e3d19] dark:text-[#eef4e8] truncate max-w-[220px]" title={financialMetrics.mostExpensiveChem['Chemical Name']}>
                {financialMetrics.mostExpensiveChem['Chemical Name'] || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#556b2f] dark:text-[#a8be8a]">
                ₹ {(financialMetrics.mostExpensiveChem['Unit Price (INR)'] || 0).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-[#87996c]">per {financialMetrics.mostExpensiveChem['Standard Unit'] || 'Unit'}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3.5 border border-[#e3e9d8] dark:bg-[#141710] dark:border-[#2e3d19] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#71805a] dark:text-[#c5d0b5]">
                Lowest In-Stock Valuation
              </p>
              <p className="text-sm font-semibold text-[#2e3d19] dark:text-[#eef4e8] truncate max-w-[220px]" title={financialMetrics.lowestStockChem['Chemical Name']}>
                {financialMetrics.lowestStockChem['Chemical Name'] || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                ₹ {(financialMetrics.lowestStockChem['Total Current Value (INR)'] || 0).toLocaleString('en-IN')}
              </span>
              <p className="text-[10px] text-[#87996c]">remaining stock value</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER 2-COLUMN SECTION: ALERTS/HEALTH & RECENT REQUISITIONS */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* LEFT COLUMN: STOCK HEALTH & DEPLETION RISK MONITOR */}
        <div className="flex flex-col h-full">
          <Card title="🛡️ Inventory Health & Depletion Risk Monitor" subtitle="Live stock availability ratio & depletion tracking">
            <div className="flex flex-col justify-between h-full space-y-4">
              {/* STOCK HEALTH PROGRESS BAR */}
              <div className="bg-[#fafbf5] dark:bg-[#1a1d16] p-4 rounded-xl border border-[#e3e9d8] dark:border-[#2e3d19] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#4e5d35] dark:text-[#c5d0b5]">
                  <span>Catalog Stock Health Ratio</span>
                  <span>{chemicals.length} Total Items</span>
                </div>

                {/* Multi-color Segmented Progress Bar */}
                <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div 
                    style={{ width: `${stockHealthStats.inStockPct}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-500" 
                    title={`In Stock: ${stockHealthStats.inStock} (${stockHealthStats.inStockPct}%)`}
                  />
                  <div 
                    style={{ width: `${stockHealthStats.lowStockPct}%` }} 
                    className="bg-amber-500 h-full transition-all duration-500" 
                    title={`Low Stock: ${stockHealthStats.lowStock} (${stockHealthStats.lowStockPct}%)`}
                  />
                  <div 
                    style={{ width: `${stockHealthStats.outOfStockPct}%` }} 
                    className="bg-rose-500 h-full transition-all duration-500" 
                    title={`Out of Stock: ${stockHealthStats.outOfStock} (${stockHealthStats.outOfStockPct}%)`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 border border-emerald-200 dark:border-emerald-800/40">
                    <span className="block font-bold text-emerald-700 dark:text-emerald-400">{stockHealthStats.inStock}</span>
                    <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300">In Stock ({stockHealthStats.inStockPct}%)</span>
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 border border-amber-200 dark:border-amber-800/40">
                    <span className="block font-bold text-amber-700 dark:text-amber-400">{stockHealthStats.lowStock}</span>
                    <span className="text-[10px] text-amber-800/80 dark:text-amber-300">Low Stock ({stockHealthStats.lowStockPct}%)</span>
                  </div>
                  <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 p-2 border border-rose-200 dark:border-rose-800/40">
                    <span className="block font-bold text-rose-700 dark:text-rose-400">{stockHealthStats.outOfStock}</span>
                    <span className="text-[10px] text-rose-800/80 dark:text-rose-300">Depleted ({stockHealthStats.outOfStockPct}%)</span>
                  </div>
                </div>
              </div>

              {/* CRITICAL ITEMS LIST OR HEALTH STATUS */}
              {lowStockAlerts.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    Chemicals Requiring Attention ({lowStockAlerts.length})
                  </p>
                  {lowStockAlerts.slice(0, 3).map((item) => (
                    <div 
                      key={item.chem.id} 
                      className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {item.chem['Chemical Name']}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Stock: {item.availableBase.toLocaleString()} {item.unit} (Grade: {item.chem['Grade'] || 'LR'})
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        item.percentage === 0 ? 'bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200' : 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200'
                      }`}>
                        {item.percentage === 0 ? 'Out of Stock' : `${item.percentage.toFixed(0)}% Left`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20 my-auto">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">100% Operational Stock Health</h4>
                  <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                    All catalog chemicals are currently above safety threshold levels.
                  </p>
                </div>
              )}

              <div className="pt-2 text-right border-t border-[#e3e9d8] dark:border-[#2e3d19]">
                <Link 
                  to="/store/inventory" 
                  className="text-xs font-semibold text-[#556b2f] hover:underline dark:text-[#a8be8a]"
                >
                  Manage inventory catalog &rarr;
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: RECENT REQUISITIONS & TRANSFERS */}
        <div className="flex flex-col h-full">
          <Card title="📜 Recent Requisition Movement" subtitle="Latest store-to-lab chemical transfers & status">
            <div className="flex flex-col justify-between h-full space-y-3">
              <div className="space-y-2.5">
                {history.slice(0, 5).map((entry) => {
                  const isApproved = entry.status === 'Approved';
                  return (
                    <div 
                      key={entry.id} 
                      className={`flex items-center justify-between p-3.5 rounded-xl border bg-white dark:bg-[#1a1d16] ${
                        isApproved 
                          ? 'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800' 
                          : 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-[#2e3d19] dark:text-[#eef4e8]">
                            {entry.chemicalName}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eef4e4] text-[#556b2f] dark:bg-[#28301f] dark:text-[#c5d0b5]">
                            {entry.lab}
                          </span>
                        </div>
                        <p className="text-xs text-[#71805a] dark:text-[#c5d0b5]">
                          Transfer Qty: {entry.qtyRequested || entry.qtyRequestedBase} {entry.baseUnit || 'mL'} • {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isApproved 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <div className="py-12 text-center text-xs text-[#87996c]">
                    No recent transfer history recorded yet.
                  </div>
                )}
              </div>
              <div className="pt-2 text-right border-t border-[#e3e9d8] dark:border-[#2e3d19]">
                <Link 
                  to="/store/history" 
                  className="text-xs font-semibold text-[#556b2f] hover:underline dark:text-[#a8be8a]"
                >
                  View complete transfer audit history &rarr;
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <StoreImportModal 
        open={importOpen} 
        onClose={() => setImportOpen(false)} 
      />
    </StoreLayout>
  );
}
