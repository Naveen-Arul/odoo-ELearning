# LearnSphere Development Phases

## **Tech Stack Summary**
- **Frontend**: React + TailwindCSS + HTML/CSS/JavaScript
- **Backend**: Node.js + Express + JavaScript
- **Database**: MySQL

---

## **Development Phases**

### **Phase 1: Project Foundation & Basic Setup** 
**What we'll do:**
- Create project folder structure (frontend, backend, database separation)
- Initialize MySQL database
- Create Users table only (other tables later)
- Initialize Express server with basic configuration
- Initialize React app with TailwindCSS
- Set up environment variables and configuration files

**Deliverables:**
- Project structure: `frontend/`, `backend/`, `database/`
- MySQL database created
- Users table with proper schema
- Express server running on port 5000
- React app running on port 3000
- `.env` files for configuration
- Basic CORS and middleware setup

---

### **Phase 2: Security & Authentication Foundation (PRIORITY)**
**What we'll do:**
- **Implement secure password hashing with bcrypt (10+ salt rounds)**
- **Set up JWT token-based authentication with secure secrets**
- **Create secure password validation (min 8 chars, special chars, etc.)**
- **Implement secure token storage strategy**
- Build authentication APIs (register, login, logout)
- Create user roles (Admin, Instructor, Learner)
- Add input validation and sanitization
- Implement rate limiting for auth endpoints
- Add security headers (helmet.js)

**Security Checklist:**
- ✅ Password hashing with bcrypt (never store plain text)
- ✅ Strong JWT secret (256-bit minimum)
- ✅ Token expiration (1 hour for access, 7 days for refresh)
- ✅ HTTP-only cookies for token storage (prevent XSS)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting on login/register endpoints
- ✅ CORS configured properly
- ✅ Environment variables for all secrets

**Deliverables:**
- `POST /api/auth/register` - Secure user registration
- `POST /api/auth/login` - Secure user login
- `POST /api/auth/logout` - Secure logout
- `POST /api/auth/refresh` - Refresh token endpoint
- JWT middleware for protected routes
- Password hashing utility
- Input validation middleware
- Rate limiting middleware
- Security headers middleware

---

### **Phase 3: Frontend Authentication UI**
**What we'll do:**
- Build secure login page with validation
- Build secure signup page with role selection
- Implement client-side form validation
- Create auth context for state management
- Set up protected routes
- Implement secure token handling
- Add error handling and user feedback

**Security Features:**
- Password strength indicator
- Client-side validation (email format, password strength)
- Secure password input (show/hide toggle)
- HTTPS enforcement messages
- Session timeout handling
- Automatic logout on token expiry

**Deliverables:**
- Login page component with TailwindCSS
- Signup page component with TailwindCSS
- Auth context/provider
- Protected route wrapper component
- API service for auth calls
- Token management utilities
- Form validation helpers
- Error handling components

---

### **Phase 4: Database Schema - Courses & Content Tables**
**What we'll do:**
- Design and create remaining database tables
- Create courses, lessons, quizzes, questions tables
- Create progress tracking tables
- Create reviews and ratings tables
- Set up foreign key relationships
- Create indexes for performance

**Deliverables:**
- Courses table
- Lessons table
- Quizzes and questions tables
- Course_enrollments table
- Lesson_progress table
- Quiz_attempts table
- Reviews and ratings tables
- Database relationships and constraints
- Database migration scripts

---

### **Phase 5: Backend - Course Management APIs**
**What we'll do:**
- Create REST APIs for:
  - Courses CRUD (create, read, update, delete)
  - Course publishing/unpublishing
  - Course visibility and access rules
  - Tags management
  - Course search and filtering
- Implement file upload for course images

**Deliverables:**
- `POST /api/courses` - Create course
- `GET /api/courses` - List all courses (with filters)
- `GET /api/courses/:id` - Get single course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course
- `PUT /api/courses/:id/publish` - Publish/unpublish
- `POST /api/courses/:id/image` - Upload course image
- Search and filter functionality

---

### **Phase 6: Backend - Lessons & Content APIs**
**What we'll do:**
- Create APIs for:
  - Lessons CRUD (video, document, image types)
  - Lesson attachments (files & links)
  - File uploads for documents/images
  - Lesson ordering within courses

**Deliverables:**
- `POST /api/courses/:courseId/lessons` - Create lesson
- `GET /api/courses/:courseId/lessons` - List lessons
- `GET /api/lessons/:id` - Get lesson details
- `PUT /api/lessons/:id` - Update lesson
- `DELETE /api/lessons/:id` - Delete lesson
- `POST /api/lessons/:id/attachments` - Add attachment
- `POST /api/lessons/:id/upload` - Upload file
- Lesson reordering functionality

---

### **Phase 7: Backend - Quiz System APIs**
**What we'll do:**
- Create APIs for:
  - Quiz CRUD
  - Questions and options management
  - Rewards/points configuration
  - Quiz attempts tracking
  - Points calculation based on attempts

**Deliverables:**
- `POST /api/courses/:courseId/quizzes` - Create quiz
- `GET /api/quizzes/:id` - Get quiz with questions
- `PUT /api/quizzes/:id` - Update quiz
- `DELETE /api/quizzes/:id` - Delete quiz
- `POST /api/quizzes/:id/questions` - Add question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/quizzes/:id/attempts` - Submit quiz attempt
- Points calculation logic

---

### **Phase 8: Backend - Progress & Gamification**
**What we'll do:**
- Create APIs for:
  - Course enrollment/attendees
  - Lesson completion tracking
  - Course progress calculation
  - Points and badges system
  - Reviews and ratings

**Deliverables:**
- `POST /api/courses/:id/enroll` - Enroll in course
- `POST /api/courses/:id/attendees` - Add attendees (instructor)
- `POST /api/lessons/:id/complete` - Mark lesson complete
- `GET /api/users/:id/progress` - Get user progress
- `GET /api/courses/:id/progress` - Get course progress
- `POST /api/courses/:id/reviews` - Add review/rating
- `GET /api/courses/:id/reviews` - Get reviews
- `GET /api/users/:id/badges` - Get user badges
- Badge calculation logic

---

### **Phase 9: Backend - Reporting & Analytics**
**What we'll do:**
- Create APIs for:
  - Course-wise learner progress
  - Completion statistics
  - Time spent tracking
  - Reporting dashboard data

**Deliverables:**
- `GET /api/reports/overview` - Get overview stats
- `GET /api/reports/course-progress` - Course-wise progress
- `GET /api/reports/learners` - Learner progress table
- `GET /api/courses/:id/analytics` - Course analytics
- Time tracking functionality
- Export functionality (optional)

---

### **Phase 10: Frontend - Admin/Instructor Dashboard**
**What we'll do:**
- Build courses dashboard (Kanban + List views)
- Create course form with tabs (Content, Description, Options, Quiz)
- Build lesson editor/manager
- Create quiz builder interface
- Build reporting dashboard with filters

**Deliverables:**
- Courses Dashboard component (Kanban view)
- Courses Dashboard component (List view)
- Course Form component with tabs
- Lesson Manager component
- Lesson Editor popup/modal
- Quiz Builder component
- Quiz Question Editor
- Reporting Dashboard component
- Filter and search components
- Course share functionality

---

### **Phase 11: Frontend - Learner Website**
**What we'll do:**
- Build navbar and routing
- Create "My Courses" page with course cards
- Build course detail page with tabs
- Create profile panel with badges
- Add search and filtering

**Deliverables:**
- Navigation bar component
- My Courses page
- Course Card component
- Course Detail page
- Course Overview tab
- My Profile panel with badges
- Search and filter UI
- Course enrollment flow

---

### **Phase 12: Frontend - Lesson Player & Quiz Interface**
**What we'll do:**
- Build full-screen lesson player
- Create video/document/image viewers
- Build quiz interface (one question per page)
- Implement progress tracking UI
- Add points popup and completion flow

**Deliverables:**
- Full-screen Player layout
- Player sidebar with lesson list
- Video Player component
- Document Viewer component
- Image Viewer component
- Quiz Intro screen
- Quiz Question component (one per page)
- Quiz navigation
- Points earned popup
- Course completion flow

---

### **Phase 13: Frontend - Reviews & Gamification UI**
**What we'll do:**
- Build ratings and reviews interface
- Create badge display system
- Add points progress indicators
- Build course completion celebrations

**Deliverables:**
- Reviews & Ratings tab
- Add Review form
- Star rating component
- Badge display component
- Points progress bar
- Badge unlock animations
- Completion celebration modal
- Progress indicators throughout app

---

### **Phase 14: Integration, Testing & Polish**
**What we'll do:**
- Connect all frontend components to backend APIs
- Test all user flows (instructor and learner)
- Fix bugs and edge cases
- Add loading states and error handling
- Polish UI/UX with TailwindCSS
- Add responsive design touches

**Deliverables:**
- Fully integrated application
- Loading spinners and skeletons
- Error handling and user feedback
- Form validation
- Responsive design for mobile/tablet
- Toast notifications
- Confirmation dialogs
- Final bug fixes
- Performance optimizations

---

## **Getting Started**

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn
- Git

### Installation Steps (Phase 1-3)
1. Create project repository structure
2. Set up MySQL database with secure root password
3. Initialize backend with Express + security packages
4. Initialize frontend with Create React App + TailwindCSS
5. **Configure environment variables (NEVER commit .env files)**
6. Set up strong JWT secret (use crypto.randomBytes)
7. Implement password hashing with bcrypt
8. Test authentication flow thoroughly
9. Start development servers with HTTPS (local SSL certificates)

---

## **Security Best Practices**

### **Must-Have Security Measures**
1. **Password Storage**
   - Use bcrypt with 10+ salt rounds
   - Never store plain text passwords
   - Validate password strength (min 8 chars, special chars, numbers)

2. **JWT Tokens**
   - Use strong secret (256-bit minimum)
   - Set reasonable expiration times (1 hour access, 7 days refresh)
   - Store in HTTP-only cookies (not localStorage)
   - Implement token refresh mechanism

3. **Input Validation**
   - Validate all inputs on both frontend and backend
   - Sanitize inputs to prevent XSS
   - Use parameterized queries to prevent SQL injection
   - Validate file uploads (type, size, content)

4. **API Security**
   - Implement rate limiting (prevent brute force)
   - Use CORS properly (whitelist only allowed origins)
   - Add security headers (helmet.js)
   - Implement request size limits

5. **Environment Security**
   - Store all secrets in .env files
   - Add .env to .gitignore
   - Use different secrets for dev/production
   - Never hardcode credentials

6. **Error Handling**
   - Don't expose system details in errors
   - Log errors server-side only
   - Return generic error messages to clients
   - Implement proper logging mechanism

---

## **Notes**

- **Security First**: Phases 1-3 establish secure authentication foundation before any features
- Password encryption and secure storage is MANDATORY - never compromise on security
- JWT tokens must be properly secured with HTTP-only cookies
- All user inputs must be validated and sanitized
- Each phase builds upon the previous one
- Testing should be done continuously, not just in Phase 14
- Consider using Git branches for each phase
- Regular commits and documentation are essential
- Backend phases (5-9) can partially overlap after auth is complete
- Frontend phases (10-13) should come after core backend is ready
- Prioritize security, then core features, then enhancements
- Use environment variables for ALL sensitive data
- Implement proper error handling without exposing system details
