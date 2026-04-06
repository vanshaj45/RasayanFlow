/**
 * Lazy Loading Wrapper for Pages
 * Provides smooth loading state while components load
 */

import { Suspense } from 'react';
import { LoadingSpinner } from '../components/ui/Loading';

export const LazyPageLoader = ({ children }) => (
  <Suspense
    fallback={
      <div className='min-h-screen flex items-center justify-center bg-[#fdfdf7] dark:bg-[#1a1d16]'>
        <LoadingSpinner size='lg' message='Loading page...' />
      </div>
    }
  >
    {children}
  </Suspense>
);
