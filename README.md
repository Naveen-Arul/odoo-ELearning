# LearnSphere - eLearning Platform

A modern, full-stack eLearning platform built with React, Node.js, Express, and MySQL.

## 🚀 Features

### ✅ Phase 1 & 2 Complete - Authentication System
- **Secure User Authentication**
  - JWT token-based authentication
  - Password hashing with bcrypt (12 salt rounds)
  - HTTP-only cookies for refresh tokens
  - Role-based access control (Admin, Instructor, Learner)
  
- **Professional UI/UX**
  - Modern login and signup pages
  - Real-time password strength validation
  - Form validation with error handling
  - Responsive design with TailwindCSS
  - Toast notifications
  
- **Security Features**
  - Rate limiting on API endpoints
  - Input validation and sanitization
  - SQL injection prevention
  - Secure password requirements
  - Security headers with Helmet.js

## 📁 Project Structure

```
odoo-sns-feb7/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth)
│   │   ├── services/      # API services
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── backend/               # Express backend
│   ├── src/
│   │   ├── config/        # Database config
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth & validation
│   │   ├── models/        # Database models
│   │   ├── routes/        # API routes
│   │   └── server.js
│   └── package.json
│
├── database/              # MySQL schemas
│   └── schema.sql
│
└── docs/                  # Documentation
    ├── problemstatement.md
    └── development-phase.md
```

## 🛠️ Tech Stack

### Frontend
- React 18
- React Router v6
- TailwindCSS
- Axios
- React Icons
- React Toastify

### Backend
- Node.js
- Express.js
- MySQL2
- JWT (jsonwebtoken)
- Bcrypt
- Helmet.js
- Express Rate Limit
- Express Validator
- Cookie Parser
- Multer

### Database
- MySQL 8.0+

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
cd e:\PROJECT\odoo-sns-feb7
```

### 2. Database Setup

1. Start MySQL server
2. Open MySQL command line or MySQL Workbench
3. Run the schema file:
```sql
source e:\PROJECT\odoo-sns-feb7\database\schema.sql
```

Or manually:
```sql
CREATE DATABASE learnsphere;
USE learnsphere;
-- Then copy and paste the contents of schema.sql
```

### 3. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file from example
copy .env.example .env

# Edit .env file with your MySQL credentials
# Update: DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET
```

**Important**: Generate secure JWT secrets:
```bash
# In Node.js (or use online generator)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Start backend server:
```bash
# Development mode with auto-reload
npm run dev

# Or production mode
npm start
```

Backend will run on `http://localhost:5000`

### 4. Frontend Setup

```bash
# Navigate to frontend folder
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend will run on `http://localhost:3000`

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=learnsphere
DB_PORT=3306

JWT_SECRET=your_super_secret_jwt_key_256_bit_minimum
JWT_EXPIRE=1h
JWT_REFRESH_SECRET=your_refresh_secret_256_bit_minimum
JWT_REFRESH_EXPIRE=7d

FRONTEND_URL=http://localhost:3000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🎯 Default Users

After running the schema.sql, a default admin account is created:

```
Email: admin@learnsphere.com
Password: Admin@123
Role: admin
```

## 🧪 Testing the Application

### 1. Test Registration
1. Go to `http://localhost:3000/signup`
2. Fill in the form with valid data
3. Password must meet requirements:
   - At least 8 characters
   - One uppercase letter
   - One lowercase letter
   - One number
   - One special character (@$!%*?&#)
4. Select role (Learner or Instructor)
5. Click "Create Account"

### 2. Test Login
1. Go to `http://localhost:3000/login`
2. Use registered credentials or default admin
3. Click "Sign in"
4. You'll be redirected to dashboard

### 3. Test Protected Routes
- Try accessing `/dashboard` without logging in
- You should be redirected to login page

## 📡 API Endpoints

### Authentication
```
POST /api/auth/register  - Register new user
POST /api/auth/login     - Login user
POST /api/auth/logout    - Logout user
GET  /api/auth/me        - Get current user (protected)
```

### Example API Request (Register)
```javascript
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "learner"
}
```

## 🎨 UI Features

### Login Page
- Email and password fields with icons
- Show/hide password toggle
- Remember me checkbox
- Forgot password link
- Responsive design
- Gradient sidebar with stats

### Signup Page
- Name, email, password fields
- Real-time password strength indicator
- Role selection (Learner/Instructor)
- Visual feedback for password requirements
- Responsive design
- Feature highlights sidebar

### Dashboard
- Welcome message
- Stats cards (Points, Courses, Progress)
- Role-based view
- Logout functionality

## 🐛 Troubleshooting

### MySQL Connection Error
- Check if MySQL server is running
- Verify credentials in `.env` file
- Ensure database `learnsphere` exists

### Port Already in Use
```bash
# Backend (port 5000)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Frontend (port 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches frontend URL
- Check if both servers are running

## 🚧 What's Next?

### Phase 3: Frontend Authentication UI ✅ COMPLETE
- Modern login/signup pages
- Auth context and protected routes

### Phase 4: Database Schema - Courses & Content Tables
- Create courses, lessons, quizzes tables
- Set up relationships and indexes

### Phase 5-14: Feature Development
- Course management APIs
- Lessons and content management
- Quiz system
- Progress tracking and gamification
- Reporting and analytics
- Admin/Instructor dashboard
- Learner website
- Full-screen lesson player
- Reviews and ratings
- Integration and testing

## 📝 License

This project is for educational purposes.

## 👥 Roles

- **Admin**: Full system access, manage all courses and users
- **Instructor**: Create courses, manage lessons, view reports
- **Learner**: Enroll in courses, complete lessons, earn badges

## 🔒 Security Notes

- JWT tokens expire after 1 hour
- Refresh tokens stored in HTTP-only cookies
- Passwords hashed with bcrypt (12 rounds)
- Rate limiting prevents brute force attacks
- All inputs validated server-side
- SQL injection prevented with parameterized queries

## 📞 Support

For issues or questions, refer to the documentation in the `/docs` folder.
