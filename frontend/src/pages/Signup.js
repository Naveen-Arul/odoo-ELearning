import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Signup = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(''); // For displaying persistent errors
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'learner',
  });
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Note: apiError (banner) remains visible until user manually closes it or resubmits form
    // This ensures users can see the error while correcting their input
    
    // Check password strength
    if (name === 'password') {
      setPasswordStrength({
        hasMinLength: value.length >= 8,
        hasUpperCase: /[A-Z]/.test(value),
        hasLowerCase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[@$!%*?&#]/.test(value),
      });
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Please enter your full name';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    } else if (formData.name.trim().length > 255) {
      newErrors.name = 'Name is too long (maximum 255 characters)';
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Name should only contain letters and spaces';
    }
    
    if (!formData.email) {
      newErrors.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
    } else if (formData.email.length > 255) {
      newErrors.email = 'Email address is too long';
    }
    
    if (!formData.password) {
      newErrors.password = 'Please create a password';
    } else if (!Object.values(passwordStrength).every(Boolean)) {
      newErrors.password = 'Please ensure your password meets all the requirements listed below';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    // Prevent all default behaviors
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent if already loading
    if (loading) {
      return false;
    }
    
    // Validate form first
    if (!validateForm()) {
      // Don't clear apiError here - let previous error stay visible
      return false;
    }

    // Only clear error and set loading when validation passes and we're making API call
    setApiError('');
    setLoading(true);

    try {
      const response = await register(formData);
      
      if (response.success) {
        toast.success('Account created successfully! Welcome to LearnSphere.', { 
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: false
        });
        
        // Redirect based on role
        const userRole = response.data.user.role;
        if (userRole === 'admin' || userRole === 'instructor') {
          navigate('/dashboard');
        } else {
          navigate('/courses');
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      
      let errorMessage = 'Unable to create account. Please try again.';
      
      if (error.response) {
        // Server responded with error
        switch (error.response.status) {
          case 400:
            if (error.response.data?.message?.includes('already registered')) {
              errorMessage = 'This email is already registered. Please use a different email or try logging in.';
            } else if (error.response.data?.errors) {
              // Validation errors from server
              const validationErrors = error.response.data.errors;
              if (Array.isArray(validationErrors) && validationErrors.length > 0) {
                errorMessage = validationErrors.map(err => err.msg).join('. ');
              } else {
                errorMessage = error.response.data.message || 'Please check your input and try again.';
              }
            } else {
              errorMessage = error.response.data?.message || 'Invalid registration data. Please check all fields.';
            }
            break;
          case 429:
            errorMessage = 'Too many registration attempts. Please wait a few minutes and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later or contact support if the issue persists.';
            break;
          default:
            errorMessage = error.response.data?.message || 'Registration failed. Please try again.';
        }
      } else if (error.request) {
        // Network error - no response received
        errorMessage = 'Cannot connect to server. Please check your internet connection and ensure the backend server is running.';
      } else {
        // Something else happened
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      // Set persistent error message
      setApiError(errorMessage);
      
      toast.error(errorMessage, { 
        toastId: 'signup-error',
        containerId: 'main-toast-container',
        autoClose: 30000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: false,
        closeButton: true,
        transition: undefined,
        position: 'top-right'
      });
    } finally {
      setLoading(false);
    }
    
    return false; // Extra safety to prevent form submission
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image/Illustration */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-secondary-700 to-secondary-900">
          <div className="h-full flex items-center justify-center p-12">
            <div className="max-w-md text-white space-y-8">
              <h1 className="text-5xl font-extrabold leading-tight">
                Start Your Learning Adventure Today
              </h1>
              <p className="text-xl text-secondary-100">
                Create an account and unlock access to world-class courses, expert instructors, and a global community of learners.
              </p>
              <div className="space-y-4 pt-8">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <div>
                    <div className="font-semibold">Expert-led Courses</div>
                    <div className="text-secondary-100 text-sm">Learn from industry professionals</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <div>
                    <div className="font-semibold">Interactive Learning</div>
                    <div className="text-secondary-100 text-sm">Engage with quizzes and assignments</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <div>
                    <div className="font-semibold">Earn Badges</div>
                    <div className="text-secondary-100 text-sm">Track progress and achievements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-gray-50">
        <div className="max-w-md w-full space-y-8 animate-fadeIn">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-secondary-600 to-secondary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">L</span>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
              Create Account
            </h2>
            <p className="text-gray-600">
              Join LearnSphere and start learning today
            </p>
          </div>

          {/* Form */}
          <form 
            className="mt-8 space-y-5" 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!loading) {
                handleSubmit(e);
              }
              return false;
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
                return false;
              }
            }}
            action="javascript:void(0);"
            method="post"
            noValidate
          >
            {/* API Error Alert - Persistent until manually closed */}
            {apiError && (
              <div 
                key="signup-error-banner"
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fadeIn mb-4"
                style={{ willChange: 'auto', position: 'relative', zIndex: 10 }}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Registration Error</h3>
                    <p className="text-sm text-red-700 whitespace-pre-line">{apiError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setApiError('');
                    }}
                    className="ml-3 flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
                    aria-label="Close error message"
                  >
                    <span className="text-2xl leading-none">&times;</span>
                  </button>
                </div>
              </div>
            )}
            
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`block w-full pl-12 pr-4 py-3 border ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all`}
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <FiAlertCircle className="mr-1" />
                  {errors.name}
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-12 pr-4 py-3 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <FiAlertCircle className="mr-1" />
                  {errors.email}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-12 pr-12 py-3 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-medium text-gray-700 mb-2">Password requirements:</div>
                  <div className="space-y-1">
                    <div className={`flex items-center text-xs ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                      <FiCheckCircle className="mr-2" />
                      At least 8 characters
                    </div>
                    <div className={`flex items-center text-xs ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                      <FiCheckCircle className="mr-2" />
                      One uppercase letter
                    </div>
                    <div className={`flex items-center text-xs ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                      <FiCheckCircle className="mr-2" />
                      One lowercase letter
                    </div>
                    <div className={`flex items-center text-xs ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                      <FiCheckCircle className="mr-2" />
                      One number
                    </div>
                    <div className={`flex items-center text-xs ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                      <FiCheckCircle className="mr-2" />
                      One special character (@$!%*?&#)
                    </div>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <div className="flex items-center mt-2 text-red-500 text-sm">
                  <FiAlertCircle className="mr-1" />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                I want to
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="block w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-secondary-500 focus:border-transparent outline-none transition-all"
              >
                <option value="learner">Learn - Take courses and earn badges</option>
                <option value="instructor">Teach - Create and manage courses</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Sign in link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-secondary-600 hover:text-secondary-500"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
