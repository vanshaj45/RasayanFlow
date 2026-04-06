import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  const location = useLocation();

  return (
    <div className='grid min-h-screen place-items-center bg-[#fdfdf7] dark:bg-[#1a1d16] px-4'>
      <div className='text-center max-w-md'>
        {/* Large 404 display */}
        <div className='container mb-6'>
          <div className='text-9xl font-bold text-transparent bg-gradient-to-r from-[#556b2f] to-[#a8c545] dark:from-[#a8c545] dark:to-[#eef4e8] bg-clip-text'>
            404
          </div>
        </div>

        {/* Main message */}
        <h1 className='text-3xl font-bold text-[#3c4e23] dark:text-[#eef4e8] mb-2'>
          Page Not Found
        </h1>

        {/* Description */}
        <p className='text-[#71805a] dark:text-[#c5d0b5] mb-2'>
          Sorry, the page you're looking for doesn't exist.
        </p>

        {/* Show the problematic path */}
        <p className='text-sm text-[#999999] dark:text-[#666666] mb-6 font-mono bg-[#f0f3e8] dark:bg-[#2a2d28] p-3 rounded'>
          {location.pathname}
        </p>

        {/* Action buttons */}
        <div className='flex flex-col sm:flex-row gap-3 justify-center items-center'>
          <Link to='/' className='w-full'>
            <Button variant='primary' className='w-full flex items-center justify-center gap-2'>
              <Home size={18} />
              Go Home
            </Button>
          </Link>
          <button
            onClick={() => window.history.back()}
            className='w-full px-4 py-2 rounded-lg font-medium transition-colors text-[#556b2f] hover:text-[#3c4e23] dark:text-[#a8c545] dark:hover:text-[#c5d0b5] border border-[#d9e1ca] dark:border-[#414a33] hover:border-[#556b2f] dark:hover:border-[#a8c545]'
          >
            Go Back
          </button>
        </div>

        {/* Help text */}
        <p className='text-xs text-[#999999] dark:text-[#666666] mt-6'>
          If you think this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
