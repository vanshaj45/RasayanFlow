export default function Card({ title, subtitle, className, children }) {
  return (
    <div className={`rounded-2xl border border-[#d9e1ca] bg-white p-5 shadow-soft dark:border-[#414a33] dark:bg-[#20251a] ${className}`}>
      {(title || subtitle) && (
        <div className='mb-4'>
          {title && <h3 className='text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]'>{title}</h3>}
          {subtitle && <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
