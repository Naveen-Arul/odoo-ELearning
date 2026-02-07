# Error Handling & Validation Guide

## Overview

LearnSphere implements comprehensive error handling and validation across both frontend and backend to provide users with clear, actionable feedback.

## Frontend Error Handling

### 1. Form Validation

#### Login Page
- **Email validation**:
  - Required field check
  - Email format validation
  - Clear error messages: "Please enter a valid email address (e.g., user@example.com)"

- **Password validation**:
  - Required field check
  - Minimum length check
  - Shows specific error for each validation rule

#### Signup Page
- **Name validation**:
  - Required field
  - Minimum 2 characters
  - Maximum 255 characters
  - Only letters and spaces allowed
  - Error: "Name should only contain letters and spaces"

- **Email validation**:
  - Same as login + length check

- **Password validation with real-time feedback**:
  - Visual indicators for each requirement:
    - ✓ At least 8 characters
    - ✓ One uppercase letter
    - ✓ One lowercase letter
    - ✓ One number
    - ✓ One special character (@$!%*?&#)

### 2. API Error Handling

The frontend gracefully handles different types of errors:

#### HTTP Status Codes
- **400 (Bad Request)**: "Please check your input and try again"
- **401 (Unauthorized)**: "Invalid email or password. Please check your credentials"
- **403 (Forbidden)**: "Access denied. You do not have permission"
- **429 (Rate Limit)**: "Too many attempts. Please wait a few minutes"
- **500 (Server Error)**: "Server error. Please try again later"

#### Network Errors
- **Connection Failed**: "Cannot connect to server. Please check your internet connection"
- **Timeout**: Clear messaging about network issues

### 3. Toast Notifications

Custom styled toast notifications with:
- **Success**: Green gradient background
- **Error**: Red gradient background
- **Info**: Blue gradient background
- **Warning**: Orange gradient background
- Auto-close after 4-6 seconds
- Draggable
- Pause on hover

## Backend Error Handling

### 1. Input Validation

Using `express-validator` with detailed error messages:

#### Registration
```javascript
- Name: 2-255 characters, letters and spaces only
- Email: Valid email format, max 255 characters
- Password: Min 8 chars, uppercase, lowercase, number, special char
- Role: Must be 'admin', 'instructor', or 'learner'
```

#### Login
```javascript
- Email: Required, valid format
- Password: Required, non-empty
```

### 2. Error Response Format

All errors follow consistent structure:
```json
{
  "success": false,
  "message": "User-friendly error message",
  "errors": [] // Optional array of specific validation errors
}
```

### 3. Specific Error Handling

#### Authentication Errors
- **Duplicate Email**: "This email is already registered. Please use a different email or try logging in."
- **Invalid Credentials**: "Invalid email or password. Please check your credentials and try again."
- **Token Expired**: "Your session has expired. Please login again."
- **Invalid Token**: "Invalid authentication token. Please login again."

#### Database Errors
- **Connection Error**: "Database connection failed. Please contact support."
- **Duplicate Entry**: Handled with specific message about which field is duplicate

#### Authorization Errors
- **Insufficient Permissions**: "You do not have permission to perform this action. This feature is restricted to [roles] only."

### 4. Security Features

- Passwords hashed with bcrypt (12 salt rounds)
- JWT tokens with expiration
- Rate limiting on authentication endpoints
- Input sanitization to prevent XSS
- SQL injection prevention with parameterized queries

## Utility Functions

### Validation Utils (`/frontend/src/utils/validation.js`)

```javascript
- validateEmail(email)
- validatePassword(password)
- validateName(name)
- getPasswordStrength(password)
- isPasswordStrong(password)
- sanitizeInput(input)
- formatApiError(error)
```

### Message Constants (`/frontend/src/utils/messages.js`)

Centralized error and success messages:
```javascript
- ERROR_MESSAGES.AUTH.*
- ERROR_MESSAGES.VALIDATION.*
- ERROR_MESSAGES.NETWORK.*
- SUCCESS_MESSAGES.AUTH.*
- INFO_MESSAGES.*
```

## Best Practices Implemented

1. **Clear, Actionable Messages**: Every error tells the user exactly what went wrong and how to fix it

2. **Consistent Formatting**: All errors follow the same structure across frontend and backend

3. **Security-First**: Never expose sensitive information in error messages

4. **User-Friendly**: Technical jargon replaced with plain language

5. **Contextual Help**: Error messages provide context (e.g., "Password must be at least 8 characters" instead of just "Invalid password")

6. **Visual Feedback**:
   - Red text for errors
   - Icons for better visibility
   - Green checkmarks for validation success
   - Toast notifications for async operations

7. **Accessibility**: Error messages are properly associated with form fields using ARIA attributes

## Testing Error Scenarios

### Test Cases

1. **Empty Form Submission**
   - Try submitting login/signup with empty fields
   - Should show: "Please enter your email address", etc.

2. **Invalid Email Format**
   - Enter: "invalidemail"
   - Should show: "Please enter a valid email address (e.g., user@example.com)"

3. **Weak Password**
   - Enter: "12345678"
   - Should show real-time feedback of missing requirements

4. **Duplicate Email**
   - Try registering with existing email
   - Should show: "This email is already registered..."

5. **Wrong Credentials**
   - Login with incorrect password
   - Should show: "Invalid email or password..."

6. **Network Error**
   - Stop backend server and try to login
   - Should show: "Cannot connect to server..."

7. **Session Expiry**
   - Wait for token to expire (1 hour)
   - Should show: "Your session has expired. Please login again."

## Future Improvements

- [ ] Add password strength meter visualization
- [ ] Implement forgot password flow with email verification
- [ ] Add CAPTCHA for rate limiting bypass prevention
- [ ] Log errors to monitoring service (Sentry, LogRocket)
- [ ] Add retry mechanism for failed requests
- [ ] Implement offline detection and queuing
- [ ] Add form auto-save with local storage
- [ ] Multi-language error messages

## Debugging

### Frontend
```javascript
// Errors are logged to console
console.error('Login error:', error);

// Check browser DevTools:
// 1. Console tab for errors
// 2. Network tab for API responses
```

### Backend
```javascript
// All errors logged to console
console.error('Register error:', error);

// Check terminal output for detailed error stack traces
```

## Support

If you encounter an error not covered here, please:
1. Check browser console (F12)
2. Check backend terminal output
3. Verify environment variables are set correctly
4. Ensure database is running and accessible
