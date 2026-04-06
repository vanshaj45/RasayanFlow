/**
 * Loading and skeleton components for UX
 */

export const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }[size] || 'h-8 w-8';

  return (
    <div className='flex flex-col items-center justify-center gap-2'>
      <div className={`${sizeClass} animate-spin rounded-full border-4 border-[#d9e1ca] border-t-[#556b2f] dark:border-[#414a33] dark:border-t-[#a8c545]`} />
      {message && <p className='text-sm text-[#71805a] dark:text-[#c5d0b5]'>{message}</p>}
    </div>
  );
};

export const SkeletonLoader = ({ rows = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='h-12 animate-pulse rounded-lg bg-[#f0f3e8] dark:bg-[#2a2d28]' />
      ))}
    </div>
  );
};

export const PageLoadingOverlay = ({ isLoading = false }) => {
  if (!isLoading) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm'>
      <LoadingSpinner size='lg' message='Loading...' />
    </div>
  );
};

export const TableSkeletonLoader = ({ rows = 5 }) => {
  return (
    <div className='space-y-2'>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='flex gap-2'>
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className='h-10 flex-1 animate-pulse rounded bg-[#f0f3e8] dark:bg-[#2a2d28]' />
          ))}
        </div>
      ))}
    </div>
  );
};
