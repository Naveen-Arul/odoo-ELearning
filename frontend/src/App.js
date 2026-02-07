import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ManageCourses from './pages/ManageCourses';
import CourseForm from './pages/CourseForm';
import BrowseCourses from './pages/BrowseCourses';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            
            {/* Course Management - Admin/Instructor */}
            <Route
              path="/manage-courses"
              element={
                <PrivateRoute>
                  <ManageCourses />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-courses/new"
              element={
                <PrivateRoute>
                  <CourseForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/manage-courses/:id/edit"
              element={
                <PrivateRoute>
                  <CourseForm />
                </PrivateRoute>
              }
            />
            
            {/* Browse Courses - Learners */}
            <Route
              path="/courses"
              element={
                <PrivateRoute>
                  <BrowseCourses />
                </PrivateRoute>
              }
            />
            
            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 Route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          
          {/* Toast Notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick={true}
            rtl={false}
            pauseOnFocusLoss={false}
            draggable={true}
            pauseOnHover={true}
            theme="light"
            limit={3}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
