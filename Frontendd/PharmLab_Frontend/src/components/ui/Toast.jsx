import { useEffect } from 'react';
import { XCircle, CheckCircle, AlertTriangle } from 'lucide-react';

const iconMap = { success: CheckCircle, error: XCircle, warning: AlertTriangle };

export default function Toast({ type = 'success', message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const Icon = iconMap[type] || CheckCircle;

  return (
    <div className='fixed right-4 top-4 z-50 rounded-xl border border-slate-300 bg-white p-3 shadow-soft dark:border-slate-700 dark:bg-slate-900 animate-fade-in'>
      <div className='flex items-start gap-2'>
        <Icon size={20} className='mt-0.5 text-green-500' />
        <div>
          <div className='text-sm font-medium text-slate-900 dark:text-slate-100'>{message}</div>
          <button onClick={onClose} className='text-xs text-slate-400 hover:text-slate-600'>Dismiss</button>
        </div>
      </div>
    </div>
  );
}
