/**
 * Centralized error handling utility
 * Converts various error types into user-friendly messages
 */

const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  INVALID_RESPONSE: 'Invalid server response. Please try again.',
  UNAUTHORIZED: 'Your session expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export const getErrorMessage = (error) => {
  // Network error (no response from server)
  if (!error.response) {
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      return ERROR_MESSAGES.NETWORK_ERROR;
    }
    return error.message || ERROR_MESSAGES.UNKNOWN_ERROR;
  }

  // Server responded with error status
  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 400:
      return data?.message || ERROR_MESSAGES.VALIDATION_ERROR;
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return data?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
  }
};

export const logError = (error, context = '') => {
  if (import.meta.env.DEV) {
    console.error(`[${context}]`, error);
  }
  // In production, you could send this to an error tracking service like Sentry
};

export const handleApiError = (error, context = '', setToast = null) => {
  const message = getErrorMessage(error);
  logError(error, context);
  
  if (setToast) {
    setToast({
      type: 'error',
      message: message,
    });
  }
  
  return message;
};
