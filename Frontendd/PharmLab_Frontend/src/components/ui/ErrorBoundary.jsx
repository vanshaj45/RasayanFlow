/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    this.setState((prevState) => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Send to error tracking service in production (e.g., Sentry)
    // if (!import.meta.env.DEV) {
    //   reportErrorToService(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen bg-[#fdfdf7] dark:bg-[#1a1d16] flex items-center justify-center p-4'>
          <div className='max-w-md w-full bg-white dark:bg-[#2a2d28] rounded-lg shadow-lg border border-[#d9e1ca] dark:border-[#414a33] p-6'>
            {/* Error Icon */}
            <div className='flex justify-center mb-4'>
              <div className='p-3 bg-red-100 dark:bg-red-900/20 rounded-full'>
                <AlertTriangle size={24} className='text-red-600 dark:text-red-400' />
              </div>
            </div>

            {/* Error Title */}
            <h1 className='text-xl font-bold text-[#3c4e23] dark:text-[#eef4e8] text-center mb-2'>
              Oops! Something went wrong
            </h1>

            {/* Error Message */}
            <p className='text-sm text-[#71805a] dark:text-[#c5d0b5] text-center mb-4'>
              We're sorry for the inconvenience. An unexpected error occurred and we're working to fix it.
            </p>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <details className='mb-4'>
                <summary className='text-xs font-mono text-[#999999] dark:text-[#666666] cursor-pointer mb-2'>
                  Error Details (Dev Only)
                </summary>
                <div className='bg-[#f0f3e8] dark:bg-[#1a1d16] p-2 rounded text-xs font-mono text-[#666666] dark:text-[#999999] overflow-auto max-h-40'>
                  <p className='font-bold mb-1'>Message:</p>
                  <p className='break-words'>{this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <>
                      <p className='font-bold mt-2 mb-1'>Component Stack:</p>
                      <p className='break-words'>{this.state.errorInfo.componentStack}</p>
                    </>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className='flex gap-3'>
              <Button
                variant='primary'
                onClick={this.handleReset}
                className='flex-1'
              >
                Try Again
              </Button>
              <Button
                variant='outline'
                onClick={() => (window.location.href = '/')}
                className='flex-1'
              >
                Go Home
              </Button>
            </div>

            {/* Support Message */}
            <p className='text-xs text-[#999999] dark:text-[#666666] text-center mt-4'>
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
