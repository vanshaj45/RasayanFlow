/**
 * Session Management Utility
 * Handles session timeout and auto-logout
 */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes - warn before logout

let sessionTimer = null;
let warningTimer = null;
let lastActivityTime = Date.now();

export const initializeSessionManager = (setToast, logout) => {
  // Reset activity on user interaction
  const activityHandler = () => {
    lastActivityTime = Date.now();
    resetSessionTimers(setToast, logout);
  };

  // Listen for user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach((event) => {
    window.addEventListener(event, activityHandler, true);
  });

  // Set initial timers
  resetSessionTimers(setToast, logout);

  // Return cleanup function
  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, activityHandler, true);
    });
    clearTimeout(sessionTimer);
    clearTimeout(warningTimer);
  };
};

export const resetSessionTimers = (setToast, logout) => {
  // Clear existing timers
  clearTimeout(sessionTimer);
  clearTimeout(warningTimer);

  // Set warning timer
  warningTimer = setTimeout(() => {
    if (setToast) {
      setToast({
        type: 'warning',
        message: 'Your session will expire in 5 minutes due to inactivity.',
      });
    }
  }, WARNING_TIMEOUT_MS);

  // Set logout timer
  sessionTimer = setTimeout(() => {
    if (setToast) {
      setToast({
        type: 'warning',
        message: 'Your session has expired. Please log in again.',
      });
    }
    if (logout) {
      logout();
    }
  }, SESSION_TIMEOUT_MS);
};

export const getSessionTimeRemaining = () => {
  const elapsed = Date.now() - lastActivityTime;
  const remaining = Math.max(0, SESSION_TIMEOUT_MS - elapsed);
  return {
    minutes: Math.floor(remaining / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
    percentage: (remaining / SESSION_TIMEOUT_MS) * 100,
  };
};

export const extendSession = (setToast, logout) => {
  resetSessionTimers(setToast, logout);
};
