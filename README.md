# SkillForge AI 🚀

An AI-powered Edu-Tech and Career Growth platform with adaptive learning, role-based roadmaps, AI tutoring, video-based testing, and personalized study scheduling.

![SkillForge AI](https://img.shields.io/badge/SkillForge-AI-red?style=for-the-badge)
![MERN Stack](https://img.shields.io/badge/MERN-Stack-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

## ✨ Features

### 🎯 Role-Based Learning
- Career role selection with smart typo correction
- Role-specific roadmaps (max 3 active enrollments)
- Adaptive difficulty based on skill level
- Progress tracking with visual indicators

### 📚 Learning Experience
- Multi-language YouTube video integration (English, Tamil, Hindi)
- Markdown documentation with syntax highlighting
- Video-based AI-generated tests
- Configurable passing percentage per roadmap

### 🤖 AI-Powered Modules
- **AI Teacher**: Concept explanations on demand
- **AI Tutor**: Generate practice quizzes
- **AI Mentor**: Career guidance and advice
- **AI Interviewer**: Mock interviews with feedback

### 📅 Smart Scheduling
- Adaptive daily study plans
- node-cron powered email reminders
- GitHub-style activity heatmap
- Session time tracking

### 💼 Career Tools
- LeetCode profile analysis
- GitHub contribution insights
- Resume ATS scoring
- Personalized recommendations

### 🛡️ Admin Panel
- Role & roadmap management
- Topic CRUD with video links
- User management
- Platform analytics

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + Passport.js (Google/GitHub OAuth)
- **Email**: Nodemailer
- **Scheduling**: node-cron

### Frontend
- **Library**: React 18
- **Routing**: React Router 6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Charts**: Chart.js
- **Video Player**: react-player
- **Markdown**: react-markdown

## 📁 Project Structure

```
skillforge-ai/
├── backend/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   └── passport.js       # OAuth strategies
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication
│   │   ├── validation.js     # Request validation
│   │   └── errorHandler.js   # Global error handling
│   ├── models/
│   │   ├── User.js
│   │   ├── Role.js
│   │   ├── Roadmap.js
│   │   ├── Topic.js
│   │   ├── ProgrammingLanguage.js
│   │   ├── LanguageTopic.js
│   │   ├── DailyStudyPlan.js
│   │   ├── TestAttempt.js
│   │   ├── TimeTrackingSession.js
│   │   ├── CareerAnalysis.js
│   │   └── AIChatSession.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── roadmaps.js
│   │   ├── topics.js
│   │   ├── roles.js
│   │   ├── languages.js
│   │   ├── studyPlan.js
│   │   ├── tests.js
│   │   ├── ai.js
│   │   ├── career.js
│   │   └── admin.js
│   ├── services/
│   │   ├── aiService.js      # LLM integration
│   │   ├── emailService.js   # Email templates
│   │   └── schedulerService.js # Cron jobs
│   ├── seed/
│   │   └── seedData.js       # Database seeding
│   └── server.js             # Entry point
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   └── common/
│   │   │       ├── ProtectedRoute.js
│   │   │       ├── AdminRoute.js
│   │   │       └── LoadingScreen.js
│   │   ├── layouts/
│   │   │   ├── MainLayout.js
│   │   │   ├── AuthLayout.js
│   │   │   └── AdminLayout.js
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.js
│   │   │   │   ├── RegisterPage.js
│   │   │   │   ├── OAuthCallback.js
│   │   │   │   └── ForgotPassword.js
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   ├── AdminRoles.js
│   │   │   │   ├── AdminRoadmaps.js
│   │   │   │   ├── AdminTopics.js
│   │   │   │   └── AdminUsers.js
│   │   │   ├── ai/
│   │   │   │   ├── AITeacher.js
│   │   │   │   ├── AITutor.js
│   │   │   │   ├── AIMentor.js
│   │   │   │   └── AIInterviewer.js
│   │   │   ├── Dashboard.js
│   │   │   ├── OnboardingPage.js
│   │   │   ├── RoadmapsPage.js
│   │   │   ├── RoadmapDetail.js
│   │   │   ├── TopicPage.js
│   │   │   ├── LanguagesPage.js
│   │   │   ├── LanguageDetail.js
│   │   │   ├── StudyPlanPage.js
│   │   │   ├── ProfilePage.js
│   │   │   ├── SettingsPage.js
│   │   │   └── CareerPage.js
│   │   ├── services/
│   │   │   └── api.js        # Axios API client
│   │   ├── store/
│   │   │   ├── authStore.js  # Authentication state
│   │   │   └── appStore.js   # Application state
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
├── ENVIRONMENT.md        # Detailed env setup guide
├── package.json          # Root package scripts
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/skillforge-ai.git
cd skillforge-ai
```

2. **Setup Backend**
```bash
cd backend
npm install
```

3. **Configure Environment Variables**

See [ENVIRONMENT.md](ENVIRONMENT.md) for detailed setup instructions.

Quick setup - create `backend/.env`:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/skillforge

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# AI Providers (Optional - mock responses used if not set)
# Use comma-separated values to allow fallback between keys
GEMINI_API_KEYS=your-gemini-api-key-1,your-gemini-api-key-2
GROQ_API_KEYS=your-groq-api-key-1,your-groq-api-key-2
PERPLEXITY_API_KEYS=your-perplexity-api-key-1,your-perplexity-api-key-2

# Optional overrides
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_MODEL=gemini-1.5-flash
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-70b-versatile
PERPLEXITY_API_URL=https://api.perplexity.ai/chat/completions
PERPLEXITY_MODEL=sonar-pro

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

4. **Seed the Database**
```bash
cd backend/seed
node seedData.js
```

5. **Setup Frontend**
```bash
cd ../frontend
npm install
```

6. **Run the Application**

Backend (Terminal 1):
```bash
cd backend
npm run dev
```

Frontend (Terminal 2):
```bash
cd frontend
npm start
```

7. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Admin Login: admin@skillforge.com / admin123

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/google` | Google OAuth |
| GET | `/api/auth/github` | GitHub OAuth |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user |
| PUT | `/api/users/me` | Update profile |
| POST | `/api/users/onboarding` | Complete onboarding |

### Roadmaps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/roadmaps` | Get all roadmaps |
| GET | `/api/roadmaps/:id` | Get roadmap details |
| POST | `/api/roadmaps/:id/enroll` | Enroll in roadmap |
| PUT | `/api/roadmaps/:id/progress` | Update progress |

### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics/:id` | Get topic details |
| POST | `/api/topics/:id/complete` | Mark as complete |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/teacher` | Ask AI teacher |
| POST | `/api/ai/tutor/generate` | Generate quiz |
| POST | `/api/ai/mentor` | Get career advice |
| POST | `/api/ai/interviewer/start` | Start mock interview |
| POST | `/api/ai/interviewer/answer` | Submit answer |

### Career
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/career/leetcode` | Analyze LeetCode |
| POST | `/api/career/github` | Analyze GitHub |
| POST | `/api/career/resume` | Analyze resume |

### Study Plan
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/study-plan/today` | Get today's plan |
| GET | `/api/study-plan/week` | Get week's plan |
| POST | `/api/study-plan/generate` | Generate new plan |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Dashboard statistics |
| CRUD | `/api/admin/roles` | Manage roles |
| CRUD | `/api/admin/roadmaps` | Manage roadmaps |
| CRUD | `/api/admin/topics` | Manage topics |
| GET | `/api/admin/users` | List users |

## 🎨 UI Components

### Color Scheme (Dark Theme)
- **Background**: `#0f0f0f` - `#1a1a1a`
- **Primary**: `#6366f1` (Indigo)
- **Secondary**: `#8b5cf6` (Purple)
- **Accent**: `#10b981` (Emerald)
- **Danger**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Amber)

### Tailwind Custom Classes
```css
.btn-primary    /* Primary button */
.btn-secondary  /* Secondary button */
.btn-ghost      /* Ghost button */
.card           /* Card container */
.input          /* Form inputs */
.badge          /* Status badges */
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Helmet security headers
- CORS configuration
- Input validation with express-validator
- XSS protection

## 📧 Email Templates

- Welcome email
- Password reset
- Daily study reminders
- Weekly progress report
- Achievement notifications

## 🗓️ Scheduled Jobs (node-cron)

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Reminders | 8:00 AM | Send study reminders |
| Weekly Report | Sunday 9:00 AM | Generate progress reports |
| Plan Generation | 12:00 AM | Generate daily study plans |

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Docker
```bash
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Set production environment variables
3. Use PM2 for Node.js process management
4. Configure Nginx as reverse proxy

## 🐛 Troubleshooting

### GitHub Analysis Returns 500 Error

**Issue**: Getting "Failed to analyze GitHub profile" error when trying to analyze a GitHub profile.

**Root Cause**: GitHub API rate limiting (60 requests/hour without authentication).

**Solution**:
1. Create a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Select `public_repo` scope
   - Copy the generated token

2. Add to your `.env` file in the backend directory:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   ```

3. Restart the backend server:
   ```bash
   npm run dev
   ```

### LeetCode Analysis Not Working

**Issue**: LeetCode analysis returns empty data or fails.

**Root Cause**: LeetCode username doesn't exist or profile is private.

**Solution**:
- Verify the username is spelled correctly
- Ensure the LeetCode profile is public (not private)
- Try analyzing again after verifying the username in your profile

### MongoDB Connection Error

**Issue**: "MongoDB connection error" on startup.

**Solution**:
1. Ensure MongoDB is running:
   ```bash
   # For local MongoDB
   mongod

   # Or if using MongoDB Atlas
   # Verify MONGODB_URI in .env is correct
   ```

2. Check your MONGODB_URI in `.env`:
   - Local: `mongodb://localhost:27017/skillforge-ai`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/skillforge-ai`

### CORS Error When Calling Backend APIs

**Issue**: "Access to XMLHttpRequest blocked by CORS policy"

**Solution**:
1. Ensure `CLIENT_URL` and `CORS_ORIGIN` in backend `.env` match your frontend URL:
   ```env
   CLIENT_URL=http://localhost:3000
   CORS_ORIGIN=http://localhost:3000
   ```

2. Restart both frontend and backend servers

### OAuth Login Not Working

**Issue**: "Google/GitHub OAuth callback fails"

**Solution**:
1. Verify OAuth credentials are set in `.env`
2. Check redirect URIs match your application:
   - Google: `http://localhost:5000/api/auth/google/callback`
   - GitHub: `http://localhost:5000/api/auth/github/callback`
3. Ensure backend is running on the correct port (default: 5001)

### Port Already in Use

**Issue**: "Error: listen EADDRINUSE :::5000"

**Solution**:
```bash
# Kill process using the port
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5002 npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Gemini, Groq, and Perplexity for AI capabilities
- MongoDB for database
- React team for the frontend framework
- Tailwind CSS for styling
- All open-source contributors

---

<p align="center">
  Built with ❤️ by the SkillForge Team
</p>
