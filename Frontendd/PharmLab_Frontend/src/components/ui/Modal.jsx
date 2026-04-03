import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-[#23281d]/35 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-xl rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-5 shadow-soft dark:border-[#414a33] dark:bg-[#20251a] transform transition-all duration-300'>
        <div className='mb-4 flex items-center justify-between gap-4'>
          <h3 className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{title}</h3>
          <button className='rounded-md p-1 text-[#71805a] hover:bg-[#f4f6ee] dark:text-[#c5d0b5] dark:hover:bg-[#2a3121]' onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
