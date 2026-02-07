// Validation utility functions

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return 'Please enter your email address';
  }
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address (e.g., user@example.com)';
  }
  if (email.length > 255) {
    return 'Email address is too long';
  }
  return null;
};

export const validatePassword = (password) => {
  if (!password) {
    return 'Please enter a password';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[@$!%*?&#]/.test(password)) {
    return 'Password must contain at least one special character (@$!%*?&#)';
  }
  return null;
};

export const validateName = (name) => {
  if (!name || !name.trim()) {
    return 'Please enter your name';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters long';
  }
  if (name.trim().length > 255) {
    return 'Name is too long (maximum 255 characters)';
  }
  if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
    return 'Name should only contain letters and spaces';
  }
  return null;
};

export const getPasswordStrength = (password) => {
  return {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&#]/.test(password),
  };
};

export const isPasswordStrong = (password) => {
  const strength = getPasswordStrength(password);
  return Object.values(strength).every(Boolean);
};

// Sanitize input to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Format error messages from API
export const formatApiError = (error) => {
  if (!error) return 'An unexpected error occurred';
  
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const data = error.response.data;
    
    if (data?.message) {
      return data.message;
    }
    
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map(err => err.msg || err.message).join('. ');
    }
    
    // Default messages based on status
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication failed. Please login again.';
      case 403:
        return 'Access denied. You do not have permission.';
      case 404:
        return 'Resource not found.';
      case 429:
        return 'Too many requests. Please wait and try again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
  
  if (error.request) {
    // Network error
    return 'Cannot connect to server. Please check your internet connection.';
  }
  
  return error.message || 'An unexpected error occurred';
};
