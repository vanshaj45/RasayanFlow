/**
 * Performance Monitoring Utility
 * Tracks page load times and metrics
 */

export const reportWebVitals = (metric) => {
  if (import.meta.env.DEV) {
    console.log('Web Vital:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }

  // Send to analytics service
  // Example: sendToAnalytics(metric);
};

export const measurePerformance = (label, callback) => {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  const duration = end - start;

  if (import.meta.env.DEV) {
    console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
};

export const logPageView = () => {
  if (!import.meta.env.DEV) {
    // Send to analytics service
    // Example: ga('send', 'pageview', page);
  }
};

export const optimizeImages = () => {
  const images = document.querySelectorAll('img');
  images.forEach((img) => {
    // Lazy load images
    if ('loading' in HTMLImageElement.prototype) {
      img.loading = 'lazy';
    }
  });
};

/**
 * Clear unnecessary data from localStorage
 */
export const clearOldCache = () => {
  const keysToCheck = ['pharmlab-', 'localStorage-'];
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  keysToCheck.forEach((prefix) => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const item = localStorage.getItem(key);
        try {
          const data = JSON.parse(item);
          if (data.timestamp && Date.now() - data.timestamp > maxAge) {
            localStorage.removeItem(key);
          }
        } catch {
          // Ignore non-JSON items
        }
      }
    }
  });
};
