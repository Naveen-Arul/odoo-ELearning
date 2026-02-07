import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(''); // For displaying persistent errors
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear field-specific errors when user starts typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    // Note: apiError (banner) remains visible until user manually closes it or resubmits form
    // This ensures users can see the error while correcting their input
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Please enter your email address';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., user@example.com)';
    }
    
    if (!formData.password) {
      newErrors.password = 'Please enter your password';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validate form first
    if (!validateForm()) {
      // Don't clear apiError here - let previous error stay visible
      return false;
    }

    // Only clear error and set loading when validation passes and we're making API call
    setApiError('');
    setLoading(true);

    try {
      const response = await login(formData);
      
      if (response.success) {
        toast.success('Login successful! Welcome back.', { 
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
      console.error('Login error:', error);
      
      let errorMessage = 'Unable to login. Please try again.';
      
      if (error.response) {
        // Server responded with error
        switch (error.response.status) {
          case 401:
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 400:
            errorMessage = error.response.data?.message || 'Please check your input and try again.';
            break;
          case 429:
            errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = error.response.data?.message || 'Login failed. Please try again.';
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
        toastId: 'login-error',
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
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="max-w-md w-full space-y-8 animate-fadeIn">
          {/* Logo */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl font-bold text-white">L</span>
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-gray-600">
              Sign in to continue your learning journey
            </p>
          </div>

          {/* Form */}
          <form 
            className="mt-8 space-y-6" 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(e);
              return false;
            }}
            action="javascript:void(0);"
          >
            {/* API Error Alert - Persistent until manually closed */}
            {apiError && (
              <div 
                key="login-error-banner"
                className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fadeIn mb-4"
                style={{ willChange: 'auto', position: 'relative', zIndex: 10 }}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <FiAlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-semibold text-red-800 mb-1">Login Error</h3>
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
                  } rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all`}
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
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-12 pr-12 py-3 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all`}
                  placeholder="Enter your password"
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
              {errors.password && (
                <div className="flex items-center mt-1 text-red-500 text-sm">
                  <FiAlertCircle className="mr-1" />
                  {errors.password}
                </div>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => toast.info('Forgot password feature coming soon!')}
                  className="font-medium text-primary-600 hover:text-primary-500 underline hover:no-underline"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onClick={(e) => {
                e.stopPropagation();
                // Form submit handler will take care of the rest
              }}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Sign up link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-primary-600 hover:text-primary-500"
                >
                  Sign up now
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Image/Illustration */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          <div className="h-full flex items-center justify-center p-12">
            <div className="max-w-md text-white space-y-8">
              <h1 className="text-5xl font-extrabold leading-tight">
                Master New Skills with LearnSphere
              </h1>
              <p className="text-xl text-primary-100">
                Join thousands of learners achieving their goals through our comprehensive courses and expert instructors.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-3xl font-bold mb-2">10k+</div>
                  <div className="text-primary-100">Active Learners</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                  <div className="text-3xl font-bold mb-2">500+</div>
                  <div className="text-primary-100">Courses</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
