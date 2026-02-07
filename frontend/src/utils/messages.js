// Common error messages

export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    LOGIN_FAILED: 'Unable to login. Please check your credentials and try again.',
    SIGNUP_FAILED: 'Unable to create account. Please try again.',
    INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials.',
    EMAIL_EXISTS: 'This email is already registered. Please use a different email or try logging in.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    UNAUTHORIZED: 'Please login to continue.',
    FORBIDDEN: 'You do not have permission to access this resource.',
  },
  
  // Validation errors
  VALIDATION: {
    EMAIL_REQUIRED: 'Please enter your email address',
    EMAIL_INVALID: 'Please enter a valid email address',
    PASSWORD_REQUIRED: 'Please enter a password',
    PASSWORD_WEAK: 'Password does not meet security requirements',
    NAME_REQUIRED: 'Please enter your name',
    NAME_TOO_SHORT: 'Name must be at least 2 characters',
    NAME_INVALID: 'Name should only contain letters and spaces',
  },
  
  // Network errors
  NETWORK: {
    CONNECTION_FAILED: 'Cannot connect to server. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
  },
  
  // General errors
  GENERAL: {
    UNEXPECTED: 'An unexpected error occurred. Please try again.',
    TRY_AGAIN: 'Something went wrong. Please try again.',
    CONTACT_SUPPORT: 'Unable to complete your request. Please contact support if the issue persists.',
  },
  
  // Rate limiting
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: 'Too many requests. Please wait a few minutes and try again.',
    SLOW_DOWN: 'Please slow down and try again in a moment.',
  },
};

export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN: 'Login successful! Welcome back.',
    SIGNUP: 'Account created successfully! Welcome to LearnSphere.',
    LOGOUT: 'You have been logged out successfully.',
    PASSWORD_RESET: 'Password reset link sent to your email.',
  },
  
  GENERAL: {
    SAVED: 'Changes saved successfully!',
    DELETED: 'Deleted successfully!',
    UPDATED: 'Updated successfully!',
    CREATED: 'Created successfully!',
  },
};

export const INFO_MESSAGES = {
  COMING_SOON: 'This feature is coming soon!',
  UNDER_DEVELOPMENT: 'This feature is currently under development.',
  CONTACT_ADMIN: 'Please contact your administrator for more information.',
};
