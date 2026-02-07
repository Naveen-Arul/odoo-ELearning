# Quick Setup Guide - LearnSphere

## Step-by-Step Setup Instructions

### Step 1: Install MySQL (if not installed)
1. Download MySQL from: https://dev.mysql.com/downloads/mysql/
2. Install and remember your root password
3. Start MySQL service

### Step 2: Create Database
Open MySQL Workbench or command line and run:
```sql
source e:\PROJECT\odoo-sns-feb7\database\schema.sql
```

Or manually:
```sql
CREATE DATABASE learnsphere;
USE learnsphere;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'instructor', 'learner') DEFAULT 'learner',
    avatar VARCHAR(255),
    total_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);
```

### Step 3: Setup Backend

```powershell
# Navigate to backend
cd e:\PROJECT\odoo-sns-feb7\backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env

# Edit .env file
notepad .env
```

**Update these values in .env:**
- `DB_PASSWORD` = your MySQL password
- `JWT_SECRET` = generate a random 64-character string
- `JWT_REFRESH_SECRET` = generate another random 64-character string

**Generate secrets in PowerShell:**
```powershell
# Run this in PowerShell to generate secrets
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Start backend:**
```powershell
npm run dev
```

You should see:
```
✅ MySQL Database connected successfully
🚀 Server running on port 5000
📝 Environment: development
```

### Step 4: Setup Frontend (Open NEW Terminal)

```powershell
# Navigate to frontend
cd e:\PROJECT\odoo-sns-feb7\frontend

# Install dependencies
npm install

# Start React app
npm start
```

Browser will automatically open to `http://localhost:3000`

### Step 5: Test the Application

1. **Register a New User:**
   - Go to: http://localhost:3000/signup
   - Fill in:
     - Name: Your Name
     - Email: test@example.com
     - Password: Test@123456 (meets all requirements)
     - Role: Learner or Instructor
   - Click "Create Account"

2. **Login:**
   - Go to: http://localhost:3000/login
   - Email: test@example.com
   - Password: Test@123456
   - Click "Sign in"

3. **Or use default admin:**
   - Email: admin@learnsphere.com
   - Password: Admin@123
   - Role: Admin

### Troubleshooting

#### Backend won't start
- **Error: "connect ECONNREFUSED"**
  - MySQL is not running. Start MySQL service.
  - Check DB credentials in `.env`

- **Error: "ER_BAD_DB_ERROR"**
  - Database doesn't exist. Run schema.sql again.

- **Error: "Port 5000 already in use"**
  ```powershell
  netstat -ano | findstr :5000
  # Note the PID, then:
  taskkill /PID <PID> /F
  ```

#### Frontend won't start
- **Error: "Port 3000 already in use"**
  ```powershell
  netstat -ano | findstr :3000
  # Note the PID, then:
  taskkill /PID <PID> /F
  ```

#### Login/Signup not working
- Check if backend is running (http://localhost:5000)
- Open browser console (F12) and check for errors
- Verify `.env` files are configured correctly

### File Checklist

✅ Backend files created:
- `backend/package.json`
- `backend/src/server.js`
- `backend/src/config/database.js`
- `backend/src/models/User.js`
- `backend/src/controllers/authController.js`
- `backend/src/middleware/authMiddleware.js`
- `backend/src/routes/authRoutes.js`
- `backend/.env` (copy from .env.example)

✅ Frontend files created:
- `frontend/package.json`
- `frontend/src/App.js`
- `frontend/src/index.js`
- `frontend/src/pages/Login.js`
- `frontend/src/pages/Signup.js`
- `frontend/src/pages/Dashboard.js`
- `frontend/src/context/AuthContext.js`
- `frontend/src/services/api.js`
- `frontend/.env`

✅ Database files:
- `database/schema.sql`

### What's Working Now

✅ User Registration with validation
✅ Secure password hashing
✅ User Login with JWT tokens
✅ Protected routes
✅ Role-based access
✅ Professional UI with TailwindCSS
✅ Real-time form validation
✅ Toast notifications
✅ Responsive design

### Next Steps

Phase 4-14 will add:
- Course creation and management
- Lesson content (video, documents, images)
- Quiz system with points
- Progress tracking
- Badges and gamification
- Reviews and ratings
- Admin dashboard
- Reporting and analytics

---

**Need Help?**
Check `README.md` for detailed documentation.
