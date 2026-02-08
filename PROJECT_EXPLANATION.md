# SkillForge AI — Project Explanation

> **AI-Powered Edu-Tech & Career Growth Platform**
> A MERN-stack monorepo combining learning roadmaps, AI tutoring, career analytics, job placement, community features, and gamification into one unified platform.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Backend Deep Dive](#4-backend-deep-dive)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
6. [DSA Visualizer](#6-dsa-visualizer)
7. [Database Schema (MongoDB)](#7-database-schema-mongodb)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [AI Integration](#9-ai-integration)
10. [Real-Time Features](#10-real-time-features)
11. [Gamification System](#11-gamification-system)
12. [Career Module](#12-career-module)
13. [Recruiter & Job Board](#13-recruiter--job-board)
14. [Monitoring & Observability](#14-monitoring--observability)
15. [Environment Variables](#15-environment-variables)
16. [Scripts & Dev Workflow](#16-scripts--dev-workflow)

---

## 1. Overview

**SkillForge AI** is an all-in-one educational platform designed for aspiring developers. Key capabilities include:

| Feature Area | Description |
|---|---|
| **Learning Roadmaps** | Role-based roadmaps (Frontend, Backend, Data Science, etc.) with ordered topics, video lessons (multi-language), documentation, and tests. |
| **AI Tutoring Suite** | AI Teacher (explains docs), AI Tutor (generates tests, Socratic feedback, code critique), AI Mentor (doubt-clearing chat), AI Interviewer (mock interviews), AI Helper (reads uploaded PDFs/images). |
| **Career Analytics** | LeetCode profile analysis, GitHub profile scoring, resume ATS analysis, skill-gap analysis, career readiness scoring. |
| **Programming Languages** | Separate learning tracks for individual programming languages with leveled topics. |
| **Study Planning** | Auto-generated daily study plans, time tracking, study rooms, weekly goals. |
| **Gamification** | XP system, leveling, badges, points, leaderboards, daily/weekly challenges, certificates. |
| **Community** | Discussion posts, upvotes/downvotes, comments, peer reviews, mentoring. |
| **Job Board & Recruiting** | Companies, job postings with multi-round hiring, recruiter dashboards, skill matching, applications. |
| **Social** | Follow/friend connections, direct messages, study rooms with whiteboard, chat via Socket.io. |
| **Admin Panel** | Full admin dashboard for managing roles, roadmaps, topics, users, languages, badges, cohorts, mentors, companies, audit logs, monitoring. |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  React 18 SPA    │  │  Next.js 15      │  │  Socket.io   │  │
│  │  (port 3000)     │  │  DSA Visualizer  │  │  Client      │  │
│  │  Zustand State   │  │  (port 3001)     │  │              │  │
│  └────────┬─────────┘  └──────────────────┘  └──────┬───────┘  │
└───────────┼──────────────────────────────────────────┼──────────┘
            │ REST (axios)                  WebSocket  │
┌───────────┼──────────────────────────────────────────┼──────────┐
│           ▼          SERVER LAYER                    ▼          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                Express.js (port 5000)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │  Routes  │ │Middleware│ │ Services │ │ Socket.io  │  │   │
│  │  │  31 files│ │ auth/err │ │ 7 files  │ │  Server    │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    DATA & EXTERNAL LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  MongoDB      │  │  AI Providers │  │  External APIs     │    │
│  │  Atlas        │  │  Perplexity   │  │  YouTube, GitHub   │    │
│  │  (32 models)  │  │  Groq, Gemini │  │  LeetCode, OAuth   │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Sentry       │  │  Datadog     │  │  LogRocket         │    │
│  │  (errors)     │  │  (traces)    │  │  (session replay)  │    │
│  └──────────────┘  └──────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**Tech Stack Summary:**

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Zustand, Tailwind CSS 3, Framer Motion, Chart.js, Recharts, Socket.io-client, i18next |
| Backend | Node.js, Express.js, Mongoose ODM, Passport.js, Socket.io, node-cron, multer, pdf-parse, tesseract.js |
| Database | MongoDB Atlas |
| AI | Perplexity API, Groq API, Google Gemini API (with fallback chain + mock mode) |
| Auth | JWT (access + refresh tokens), Google OAuth 2.0, GitHub OAuth |
| Monitoring | Sentry, Datadog APM/RUM, LogRocket |
| Dev Tools | concurrently, cross-env, nodemon |

---

## 3. Folder Structure

```
skillforge-ai/
├── package.json                 # Root: orchestrates all 3 services
├── ENVIRONMENT.md               # Environment setup docs
├── README.md                    # Project readme
│
├── backend/                     # Express.js API server
│   ├── server.js                # Entry point — DB connect, seed, mount routes, Socket.io
│   ├── package.json             # Backend dependencies (355 packages)
│   ├── vercel.json              # Vercel serverless deployment config
│   ├── .env                     # Environment variables (not committed)
│   │
│   ├── config/
│   │   ├── database.js          # MongoDB connection (mongoose.connect)
│   │   ├── passport.js          # Google + GitHub OAuth strategies
│   │   └── socket.js            # Socket.io initialization & event handlers
│   │
│   ├── middleware/
│   │   ├── auth.js              # JWT protect, authorize, isAdmin, generateToken
│   │   ├── errorHandler.js      # ApiError class, asyncHandler, global error handler
│   │   ├── upload.js            # Multer file upload config
│   │   └── validation.js        # express-validator rules (register, login, roadmap, etc.)
│   │
│   ├── models/                  # Mongoose schemas (32 files)
│   │   ├── index.js             # Re-exports all models
│   │   ├── User.js              # Core user model (auth, prefs, gamification, career)
│   │   ├── Role.js              # Career roles (Frontend Dev, Data Scientist, etc.)
│   │   ├── Roadmap.js           # Learning roadmaps with topics
│   │   ├── Topic.js             # Individual learning topics with videos/docs
│   │   ├── TestAttempt.js       # Quiz/test records
│   │   ├── AIChatSession.js     # AI conversation sessions
│   │   ├── DailyStudyPlan.js    # Auto-generated daily study plans
│   │   ├── CareerAnalysis.js    # LeetCode/GitHub/Resume analyses
│   │   ├── Certificate.js       # Completion certificates
│   │   ├── ProgrammingLanguage.js  # Language learning tracks
│   │   ├── LanguageTopic.js     # Language-specific topics
│   │   ├── Company.js           # Company profiles
│   │   ├── JobPosting.js        # Job listings with multi-round hiring
│   │   ├── JobApplication.js    # Job applications with skill matching
│   │   ├── Recruiter.js         # Recruiter profiles
│   │   ├── MentorProfile.js     # Mentor applications
│   │   ├── MentoringSession.js  # Mentoring bookings
│   │   ├── CommunityPost.js     # Discussion forum posts
│   │   ├── Connection.js        # Follow/friend relationships
│   │   ├── Message.js           # Direct messages
│   │   ├── StudyRoom.js         # Group study rooms
│   │   ├── Cohort.js            # Learning cohorts
│   │   ├── Hackathon.js         # Hackathon events
│   │   ├── Challenge.js         # Daily/weekly challenges
│   │   ├── Leaderboard.js       # Leaderboard entries
│   │   ├── LeetCodeSubmission.js # LeetCode problem tracking
│   │   ├── SkillBadge.js        # Badge definitions
│   │   ├── ProjectSubmission.js # Project submissions for review
│   │   ├── PeerReview.js        # Peer review of submissions
│   │   ├── TimeTrackingSession.js  # Study time tracking
│   │   └── AuditLog.js          # Admin audit logs
│   │
│   ├── routes/                  # API route handlers (31 files)
│   │   ├── auth.js              # /api/v1/auth — register, login, OAuth, refresh
│   │   ├── users.js             # /api/v1/users — profile, preferences, study time
│   │   ├── roadmaps.js          # /api/v1/roadmaps — CRUD, enroll, progress
│   │   ├── topics.js            # /api/v1/topics — video, sessions, complete
│   │   ├── roles.js             # /api/v1/roles — role catalog
│   │   ├── languages.js         # /api/v1/languages — programming language tracks
│   │   ├── studyPlan.js         # /api/v1/study-plan — daily plans
│   │   ├── tests.js             # /api/v1/tests — test attempts
│   │   ├── ai.js                # /api/v1/ai — AI teacher/tutor/mentor/interviewer/helper
│   │   ├── career.js            # /api/v1/career — LeetCode, GitHub, resume analysis
│   │   ├── admin.js             # /api/v1/admin — admin CRUD operations
│   │   ├── scheduler.js         # /api/v1/scheduler — manual scheduler control
│   │   ├── assessments.js       # /api/v1/assessments — project submissions, badges
│   │   ├── cohorts.js           # /api/v1/cohorts — cohort management
│   │   ├── mentors.js           # /api/v1/mentors — mentor applications, booking
│   │   ├── community.js         # /api/v1/community — posts, comments, votes
│   │   ├── recruiters.js        # /api/v1/recruiters — recruiter operations
│   │   ├── companies.js         # /api/v1/companies — company listings
│   │   ├── company.js           # /api/v1/company — company admin routes
│   │   ├── jobs.js              # /api/v1/jobs — job postings & applications
│   │   ├── social.js            # /api/v1/social — connections, chat
│   │   ├── analytics.js         # /api/v1/analytics — skill radar, predictions
│   │   ├── hackathons.js        # /api/v1/hackathons — hackathon events
│   │   ├── certificates.js      # /api/v1/certificates — certificate generation
│   │   ├── gamification.js      # /api/v1/gamification — challenges, rewards
│   │   ├── referrals.js         # /api/v1/referrals — referral system
│   │   ├── xp.js                # /api/v1/xp — XP queries
│   │   ├── badges.js            # /api/v1/badges — badge queries
│   │   └── leaderboard.js       # /api/v1/leaderboard — rankings
│   │
│   ├── services/                # Business logic services
│   │   ├── aiService.js         # Multi-provider AI (Perplexity→Groq→Gemini→Mock)
│   │   ├── badgeService.js      # Badge awarding logic
│   │   ├── emailService.js      # Nodemailer email sending
│   │   ├── schedulerService.js  # Cron jobs (daily plan generation)
│   │   ├── skillMatcher.js      # Skill matching for jobs
│   │   ├── xpService.js         # XP calculation & leveling
│   │   └── youtubeService.js    # YouTube video metadata
│   │
│   ├── seed/
│   │   ├── seedData.js          # Database seeding (runs on every startup)
│   │   └── recruiterTestData.js # Test data for recruiter features
│   │
│   ├── scripts/                 # Utility scripts
│   │   ├── killPort.js          # Kill processes on specific ports
│   │   ├── generateRoadmaps.js  # Roadmap generation script
│   │   ├── seedNewFeatures.js   # Seed new feature data
│   │   └── test-*.js            # Test scripts
│   │
│   └── uploads/                 # File uploads directory
│       └── ai-helper/           # AI Helper uploaded files
│
├── frontend/                    # React 18 SPA
│   ├── package.json             # Frontend dependencies (1738 packages)
│   ├── tailwind.config.js       # Tailwind CSS configuration
│   ├── postcss.config.js        # PostCSS configuration
│   ├── vercel.json              # Vercel SPA deployment config
│   │
│   ├── public/
│   │   ├── index.html           # HTML template
│   │   ├── manifest.json        # PWA manifest
│   │   └── logo/                # Logo assets
│   │
│   └── src/
│       ├── App.js               # Root component — all routes defined here
│       │
│       ├── store/               # Zustand state management
│       │   ├── authStore.js     # Auth state (user, token, login/register/logout)
│       │   └── appStore.js      # App state (theme, roadmaps, study plan, sessions)
│       │
│       ├── services/
│       │   └── api.js           # Axios instance + all API wrappers (13 API groups)
│       │
│       ├── pages/               # Page-level components
│       │   ├── Dashboard.js     # Main dashboard
│       │   ├── RoadmapsPage.js  # Browse/enroll roadmaps
│       │   ├── RoadmapDetail.js # Individual roadmap view
│       │   ├── TopicPage.js     # Topic learning view (video + docs)
│       │   ├── LanguagesPage.js # Programming language browser
│       │   ├── LanguageDetail.js# Language learning view
│       │   ├── StudyPlanPage.js # Daily study plan
│       │   ├── ProfilePage.js   # User profile
│       │   ├── SettingsPage.js  # User settings
│       │   ├── CareerPage.js    # Career analytics hub
│       │   ├── CareerDashboard.js # Career readiness dashboard
│       │   ├── CommunityPage.js # Discussion forum
│       │   ├── AssessmentsPage.js # Project submissions
│       │   ├── OutcomesPage.js  # Job outcomes tracking
│       │   ├── ChatPage.js      # Direct messaging
│       │   ├── StudyRoomsPage.js# Study room browser
│       │   ├── StudyRoomDetail.js # Individual study room
│       │   ├── LeaderboardPage.js # Leaderboard
│       │   ├── CertificatesPage.js # User certificates
│       │   ├── JobBoardPage.js  # Job listings
│       │   ├── JobDetailPage.js # Job detail + apply
│       │   ├── RecruiterDashboard.js # Recruiter panel
│       │   ├── RecruiterJobDetail.js # Recruiter job management
│       │   ├── MentorInbox.js   # Mentor request inbox
│       │   ├── OnboardingPage.js# New user onboarding
│       │   │
│       │   ├── auth/            # Authentication pages
│       │   │   ├── LoginPage.js
│       │   │   ├── RegisterPage.js
│       │   │   ├── OAuthCallback.js
│       │   │   ├── ForgotPassword.js
│       │   │   └── ResetPassword.js
│       │   │
│       │   ├── ai/              # AI feature pages
│       │   │   ├── AITeacher.js # Explain topics using docs
│       │   │   ├── AITutor.js   # Test generation, Socratic feedback
│       │   │   ├── AIMentor.js  # Doubt-clearing chat
│       │   │   ├── AIInterviewer.js # Mock interviews
│       │   │   └── AIHelper.js  # Upload & analyze files
│       │   │
│       │   ├── admin/           # Admin panel pages
│       │   │   ├── AdminDashboard.js
│       │   │   ├── AdminRoles.js
│       │   │   ├── AdminRoadmaps.js
│       │   │   ├── AdminTopics.js
│       │   │   ├── AdminUsers.js
│       │   │   ├── AdminLanguages.js
│       │   │   ├── AdminAssessments.js
│       │   │   ├── AdminBadges.js
│       │   │   ├── AdminCohorts.js
│       │   │   ├── AdminMentors.js
│       │   │   ├── AdminOutcomes.js
│       │   │   ├── AdminMonitoring.js
│       │   │   ├── AdminAuditLogs.js
│       │   │   └── CompanyManagement.js
│       │   │
│       │   └── company/
│       │       └── CompanyDashboard.js
│       │
│       └── components/          # Reusable UI components
│           ├── common/          # ProtectedRoute, AdminRoute, LoadingScreen, etc.
│           ├── layouts/         # MainLayout, AuthLayout, AdminLayout
│           ├── dashboard/       # Dashboard widgets
│           ├── profile/         # Profile components
│           ├── recruiter/       # Recruiter UI components
│           ├── SessionTracker.js
│           ├── XPWidget.js
│           ├── WeeklyGoalSetter.js
│           ├── GitHubCalendar.js
│           ├── LeetCodeCalendar.js
│           ├── HeatmapCalendar.js
│           ├── UnifiedActivityDashboard.js
│           └── ...
│
└── dsa/
    └── dsa-visualizer/          # Next.js 15 DSA Visualization App
        ├── package.json
        ├── next.config.ts
        ├── tailwind.config.ts
        ├── tsconfig.json
        ├── app/                 # Next.js app router pages
        ├── components/          # Visualization components
        ├── content/             # DSA content/data
        ├── hooks/               # Custom React hooks
        ├── lib/                 # Utility libraries
        └── public/              # Static assets
```

---

## 4. Backend Deep Dive

### 4.1 Entry Point (`server.js`)

The server follows this startup sequence:

1. **Load environment** — `dotenv.config()`
2. **Initialize Datadog tracing** — `dd-trace.init()` (if `DD_TRACE_ENABLED` ≠ `false`)
3. **Initialize Sentry** — error tracking (if `SENTRY_DSN` set)
4. **Configure Express** — CORS, Helmet (CSP), rate limiting, body parsing, Morgan logging
5. **Connect MongoDB** — via `config/database.js`
6. **Seed database** — runs `seedData.js` on every startup
7. **Create HTTP server** — for Socket.io attachment
8. **Initialize Socket.io** — via `config/socket.js`
9. **Mount 31 route files** under `/api/v1/`
10. **Start scheduler** — cron jobs via `schedulerService`
11. **Graceful shutdown** — handles SIGTERM, SIGINT, uncaught exceptions

### 4.2 Middleware Stack

| Middleware | Purpose |
|---|---|
| `cors` | Allows `http://localhost:3000` with credentials |
| `helmet` | Security headers with custom CSP (allows AI API domains) |
| `express-rate-limit` | Global: 100 req/15min; AI routes: 20 req/min |
| `express.json` | Body parsing (10mb limit) |
| `morgan` | Request logging (dev/combined) |
| `passport` | OAuth initialization |
| `protect` | JWT verification → attaches `req.user` |
| `authorize(...roles)` | Role-based access (student/admin/recruiter/company_admin) |
| `isAdmin` | Admin-only shortcut |
| `validation` | express-validator rules per route |
| `errorHandler` | Global error formatting (ApiError, Mongoose errors, JWT errors) |

### 4.3 API Routes (31 Endpoints)

| Route Prefix | File | Key Endpoints |
|---|---|---|
| `/api/v1/auth` | auth.js | POST register, login, logout, refresh-token; GET me; GET google, github (OAuth) |
| `/api/v1/users` | users.js | GET/PUT profile, preferences; GET study-time, analytics, career-data; POST heartbeat |
| `/api/v1/roadmaps` | roadmaps.js | GET all, by ID, enrolled/my, recommended; POST enroll; DELETE unenroll; PUT set-current |
| `/api/v1/topics` | topics.js | GET by ID, video; POST start/pause/resume/end-session, complete |
| `/api/v1/roles` | roles.js | GET all, by ID, suggestions, validate, categories |
| `/api/v1/languages` | languages.js | GET all, by ID, topics; POST start; POST complete topic |
| `/api/v1/study-plan` | studyPlan.js | GET today, history, stats; POST generate; PUT topic status |
| `/api/v1/tests` | tests.js | POST start, submit; GET attempts, stats |
| `/api/v1/ai` | ai.js | POST teacher/explain, tutor/generate-test, tutor/evaluate, tutor/socratic, tutor/code-critique, mentor/chat, helper/analyze, interviewer/start, interviewer/respond, interviewer/end, scheduler/generate-plan, skill-gap/analyze, roadmap/generate, voice/text-to-speech, resume/generate, projects/generate-ideas, jobs/match, fix-text; GET sessions |
| `/api/v1/career` | career.js | POST leetcode/analyze, github/analyze, resume/analyze; GET latest, heatmap, readiness-score |
| `/api/v1/admin` | admin.js | Full CRUD for roles, roadmaps, topics, users, languages, badges, cohorts, mentors; GET dashboard, audit-logs, monitoring |
| `/api/v1/assessments` | assessments.js | GET submissions, badges; POST submissions, reviews |
| `/api/v1/cohorts` | cohorts.js | GET all, my; POST join, leave |
| `/api/v1/mentors` | mentors.js | GET all, me, requests; POST apply, book; PUT request status |
| `/api/v1/community` | community.js | GET posts; POST post, comment; POST upvote/downvote |
| `/api/v1/companies` | companies.js | Company listings |
| `/api/v1/company` | company.js | Company admin operations |
| `/api/v1/recruiters` | recruiters.js | Recruiter operations |
| `/api/v1/jobs` | jobs.js | Job postings & applications |
| `/api/v1/social` | social.js | Follow/friend connections, chat |
| `/api/v1/analytics` | analytics.js | Skill radar, learning style, predictive completion, drop-off risk |
| `/api/v1/hackathons` | hackathons.js | Hackathon events |
| `/api/v1/certificates` | certificates.js | Certificate generation & verification |
| `/api/v1/gamification` | gamification.js | Challenges & rewards |
| `/api/v1/referrals` | referrals.js | Referral system |
| `/api/v1/xp` | xp.js | XP queries |
| `/api/v1/badges` | badges.js | Badge queries |
| `/api/v1/leaderboard` | leaderboard.js | Top rankings, user rank |
| `/api/v1/scheduler` | scheduler.js | Manual scheduler control |

### 4.4 Services

| Service | Purpose |
|---|---|
| **aiService.js** | Multi-provider AI with fallback chain: Perplexity → Groq → Gemini → Mock. Handles chat, test generation, evaluation, LeetCode/GitHub/resume analysis. Supports comma-separated API key pools per provider. |
| **badgeService.js** | Badge awarding based on criteria completion. |
| **emailService.js** | Nodemailer-based email sending (welcome, password reset, notifications). |
| **schedulerService.js** | node-cron jobs — generates daily study plans at midnight UTC. |
| **skillMatcher.js** | Matches user skills against job requirements for scoring. |
| **xpService.js** | XP calculation, leveling logic, XP event types (TOPIC_COMPLETE, TEST_PASS, INTERVIEW_SESSION, etc.). |
| **youtubeService.js** | YouTube Data API integration for video metadata. |

---

## 5. Frontend Deep Dive

### 5.1 State Management (Zustand)

**`authStore.js`** — Authentication state:
- `user`, `token`, `refreshToken`, `isAuthenticated`, `isInitialized`
- Actions: `initialize()`, `register()`, `login()`, `handleOAuthCallback()`, `logout()`, `updateProfile()`, `updatePreferences()`, `refreshUser()`
- Helpers: `needsOnboarding()`, `isAdmin()`
- Persists: `token`, `refreshToken`

**`appStore.js`** — Application state:
- Sidebar, dark mode, enrolled roadmaps, today's study plan, study time stats
- Active session tracking (timer, duration)
- Notifications, modals, global search
- Persists: `darkMode`, `sidebarOpen`

### 5.2 API Service Layer (`api.js`)

13 API groups centralized with axios interceptors:
- `authAPI` — auth operations
- `userAPI` — profile, preferences, study time, heartbeat
- `roadmapsAPI` — roadmap CRUD & enrollment
- `topicsAPI` — topic learning sessions
- `rolesAPI` — role catalog
- `languagesAPI` — language tracks
- `studyPlanAPI` — daily plans
- `testsAPI` — test attempts
- `aiAPI` — all AI features
- `careerAPI` — LeetCode, GitHub, resume analysis
- `adminAPI` — admin panel operations
- `assessmentsAPI`, `cohortsAPI`, `mentorsAPI`, `analyticsAPI`, `communityAPI`, `leaderboardAPI`, `badgesAPI`

**Interceptors:**
- Request: attaches JWT from localStorage
- Response: 401 → attempts token refresh → on failure, logs out and redirects to `/login`

### 5.3 Routing (React Router 6)

| Layout | Routes |
|---|---|
| **AuthLayout** | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` |
| **MainLayout** (protected) | `/dashboard`, `/roadmaps`, `/topics/:id`, `/languages`, `/study-plan`, `/profile`, `/settings`, `/career`, `/community`, `/assessments`, `/chat`, `/study-rooms`, `/leaderboard`, `/certificates`, `/jobs`, `/ai/*`, `/recruiter-dashboard`, `/company-dashboard` |
| **AdminLayout** (admin-only) | `/admin`, `/admin/roles`, `/admin/roadmaps`, `/admin/topics`, `/admin/users`, `/admin/languages`, `/admin/badges`, `/admin/mentors`, `/admin/companies`, etc. |

Route guards: `ProtectedRoute` (requires auth) and `AdminRoute` (requires admin role).
Onboarding redirect: if `needsOnboarding()` is true, user is redirected to `/onboarding`.

---

## 6. DSA Visualizer

A separate **Next.js 15** application in `dsa/dsa-visualizer/`:

- **Purpose:** Interactive visualization of Data Structures & Algorithms
- **Port:** 3001 (in dev mode)
- **Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui components
- **Structure:** Uses App Router (`app/`), custom hooks, component library, DSA content data

---

## 7. Database Schema (MongoDB)

### 7.1 Entity Relationship Overview

```
User ──────────── Role (preferences.targetRole)
  │                 │
  ├── Roadmap ──── Role (roadmap.role)
  │     │
  │     └── Topic (roadmap.topics[])
  │           │
  │           ├── TestAttempt (topic, user)
  │           ├── AIChatSession (context.topic)
  │           └── TimeTrackingSession (topic)
  │
  ├── DailyStudyPlan (user, roadmap)
  ├── CareerAnalysis (user)
  ├── Certificate (user, roadmap)
  ├── LeetCodeSubmission (user)
  │
  ├── ProgrammingLanguage
  │     └── LanguageTopic (language)
  │
  ├── Company
  │     ├── Recruiter (company, user)
  │     └── JobPosting (recruiter)
  │           └── JobApplication (job, applicant)
  │
  ├── CommunityPost (author)
  │     └── Comments (embedded)
  │
  ├── Connection (user, follower)
  ├── Message (sender, recipient)
  ├── StudyRoom (creator, members)
  │
  ├── MentorProfile (user)
  │     └── MentoringSession (mentor, mentee)
  │
  ├── ProjectSubmission (user)
  │     └── PeerReview (submission, reviewer)
  │
  ├── Cohort (mentor, members)
  ├── Hackathon (organizer, participants)
  ├── Challenge (activeUsers)
  ├── Leaderboard (userId)
  ├── SkillBadge
  └── AuditLog (actor)
```

### 7.2 All 32 Models (31 schemas + index.js)

| # | Model | Key Fields | Relations |
|---|---|---|---|
| 1 | **User** | name, email, password, role, avatar, preferences, enrolledRoadmaps[], languageLearning[], studyTime, careerData, gamification (xp/level/points/badges), weeklyGoal, referral | → Role, Roadmap, Topic, SkillBadge |
| 2 | **Role** | name, slug, description, category, aliases[], keywords[], salaryRange, demandLevel | → relatedRoles[] |
| 3 | **Roadmap** | title, slug, description, skillLevel, estimatedDuration, topics[], testConfig, reviews[], isPublished | → Role, Topic[] |
| 4 | **Topic** | title, slug, order, videoLinks (en/ta/hi), documentation, estimatedDuration, difficulty, aiCache | → Roadmap |
| 5 | **TestAttempt** | attemptNumber, questions[], score, timing, feedback | → User, Topic, Roadmap |
| 6 | **AIChatSession** | type, context, messages[], interviewData, stats, status | → User, Topic, Roadmap, Role |
| 7 | **DailyStudyPlan** | date, assignedTopics[], languageTopics[], plannedTime, summary | → User, Roadmap, Topic, LanguageTopic |
| 8 | **CareerAnalysis** | type (leetcode/github/resume), stats, aiInsights | → User |
| 9 | **Certificate** | certificateId, issueDate, verificationUrl, metadata | → User, Roadmap |
| 10 | **ProgrammingLanguage** | name, slug, logo, color, levels, useCases, stats | → LanguageTopic[] |
| 11 | **LanguageTopic** | title, slug, level, order, videoLinks, documentation, codeExamples | → ProgrammingLanguage |
| 12 | **Company** | name, slug, logo, industry, size, location, admin, status, plan | → User (admin) |
| 13 | **Recruiter** | contactInfo, verified, status, subscription, stats | → User, Company |
| 14 | **JobPosting** | title, company, requirements, location, salary, type, rounds[], emailConfig | → Recruiter |
| 15 | **JobApplication** | resume, status, timeline[], matchScore, skillAnalysis, currentRound, roundHistory | → JobPosting, User |
| 16 | **Connection** | status, type | → User (user, follower) |
| 17 | **Message** | content, type, read | → User (sender, recipient) |
| 18 | **StudyRoom** | name, roomId, members[], isPublic, maxMembers, whiteboardData, messages[] | → User (creator), Topic, Roadmap |
| 19 | **CommunityPost** | title, content, category, tags[], upvotes[], downvotes[], comments[], isPinned | → User (author) |
| 20 | **MentorProfile** | bio, skills[], ratePerHour, status | → User |
| 21 | **MentoringSession** | status, scheduledAt, duration, meetingLink | → MentorProfile, User |
| 22 | **Cohort** | name, capacity, startDate, endDate | → User (mentor, members[]) |
| 23 | **Hackathon** | title, theme, prizes[], participants[], submissions[], status | → User (organizer) |
| 24 | **Challenge** | type, criteria, rewards, activeUsers[] | — |
| 25 | **Leaderboard** | overallScore, xp, level, badges[] | → User |
| 26 | **LeetCodeSubmission** | problemId, difficulty, status, language, runtime | → User |
| 27 | **SkillBadge** | name, description, icon, criteria | — |
| 28 | **ProjectSubmission** | title, description, repoUrl, demoUrl, status | → User, Roadmap, SkillBadge |
| 29 | **PeerReview** | rating, feedback | → ProjectSubmission, User |
| 30 | **TimeTrackingSession** | contentType, startTime, endTime, duration, pauses[], status, activityType | → User, Topic/LanguageTopic, Roadmap |
| 31 | **AuditLog** | action, entityType, entityId, metadata, ip, userAgent | → User (actor) |
| — | **index.js** | Re-exports 17 core models (not all 32 are exported) | — |

---

## 8. Authentication & Authorization

### Flow
1. **Registration:** POST `/auth/register` → validate → hash password → create User → return JWT + refreshToken
2. **Login:** POST `/auth/login` → find user → compare password → return JWT + refreshToken
3. **OAuth:** GET `/auth/google` or `/auth/github` → Passport.js strategy → callback → create/link User → redirect with tokens
4. **Token Refresh:** POST `/auth/refresh-token` → verify refreshToken → issue new JWT
5. **Protected Routes:** `protect` middleware → extract Bearer token → `jwt.verify` → attach `req.user`
6. **Admin Routes:** `protect` + `isAdmin` → checks `user.role === 'admin'`

### JWT Configuration
- Secret: `JWT_SECRET` env var
- Expiry: `JWT_EXPIRES_IN` (default 7 days)
- Storage: localStorage (frontend), httpOnly cookie (optional)

---

## 9. AI Integration

### Provider Fallback Chain
```
Request → Perplexity API → (fail) → Groq API → (fail) → Gemini API → (fail) → Mock Response
```

Each provider supports multiple API keys (comma-separated in env vars) for round-robin/failover.

### AI Features

| Feature | Endpoint | Description |
|---|---|---|
| AI Teacher | `/ai/teacher/explain` | Explains topics using documentation context |
| AI Tutor — Test Gen | `/ai/tutor/generate-test` | Generates MCQ questions from topic title |
| AI Tutor — Evaluate | `/ai/tutor/evaluate` | Evaluates test answers |
| AI Tutor — Socratic | `/ai/tutor/socratic` | Socratic questioning for learning |
| AI Tutor — Code Critique | `/ai/tutor/code-critique` | Reviews code and suggests improvements |
| AI Mentor | `/ai/mentor/chat` | Conversational doubt clearing |
| AI Helper | `/ai/helper/analyze` | Reads uploaded PDFs/images (OCR via tesseract.js) |
| AI Interviewer | `/ai/interviewer/start,respond,end` | Full mock interview with feedback |
| Skill-Gap Analysis | `/ai/skill-gap/analyze` | Identifies skill gaps for target role |
| Roadmap Generator | `/ai/roadmap/generate` | Creates custom learning roadmaps |
| Resume Builder | `/ai/resume/generate` | Generates ATS-friendly resumes |
| Project Ideas | `/ai/projects/generate-ideas` | Suggests portfolio projects |
| Job Match | `/ai/jobs/match` | Analyzes job fit + application tips |
| Text Fix | `/ai/fix-text` | Grammar/spelling correction |

---

## 10. Real-Time Features

**Socket.io** (`config/socket.js`) enables:
- Direct messaging between users
- Study room live collaboration
- Whiteboard data sharing
- Online presence indicators
- Real-time notifications

---

## 11. Gamification System

| Component | Details |
|---|---|
| **XP** | Earned via topic completion, test passing, interview sessions, etc. Stored in `user.gamification.xp` |
| **Levels** | Calculated from XP thresholds in `xpService.js` |
| **Points** | Separate point system for certain actions |
| **Badges** | Defined in `SkillBadge` model, awarded via `badgeService.js`, stored in user gamification data |
| **Leaderboard** | Global ranking by XP/score in `Leaderboard` model |
| **Challenges** | Daily/weekly/special challenges in `Challenge` model with progress tracking |
| **Certificates** | Auto-generated on roadmap completion, stored in `Certificate` model with unique ID |
| **Referrals** | User referral system with reward tracking |

---

## 12. Career Module

| Feature | Data Source | Model |
|---|---|---|
| **LeetCode Analysis** | User's LeetCode stats (fetched externally) | `CareerAnalysis` (type: leetcode), `LeetCodeSubmission` |
| **GitHub Analysis** | User's GitHub stats (fetched via GitHub API) | `CareerAnalysis` (type: github) |
| **Resume ATS Analysis** | Uploaded resume (PDF parse + AI) | `CareerAnalysis` (type: resume) |
| **Career Readiness Score** | Composite of all analyses | Calculated in career route |
| **Unified Activity Heatmap** | LeetCode + GitHub + platform activity | Aggregated from multiple sources |

---

## 13. Recruiter & Job Board

### Entities
- **Company** — Company profiles with admin, industry, size, location
- **Recruiter** — Linked to User + Company with subscription plans
- **JobPosting** — Multi-round hiring process (screening → test → technical → HR)
- **JobApplication** — Tracks application through rounds with skill analysis

### Flow
1. Company admin creates company profile
2. Recruiter links to company and posts jobs
3. Students browse jobs and apply
4. AI skill matcher scores applications
5. Recruiter manages applications through rounds

---

## 14. Monitoring & Observability

| Tool | Backend | Frontend |
|---|---|---|
| **Sentry** | `@sentry/node` — error tracking, request handler | `@sentry/react` — error boundaries |
| **Datadog** | `dd-trace` — APM traces, log injection | `@datadog/browser-rum` — real user monitoring |
| **LogRocket** | — | `logrocket` — session replay |

All are optional and activated only when respective env vars are set.

---

## 15. Environment Variables

Key variables in `backend/.env`:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `PORT` | Server port (default 5000) |
| `NODE_ENV` | Environment (development/production) |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth |
| `PERPLEXITY_API_KEYS` | Perplexity AI keys (comma-separated) |
| `GROQ_API_KEYS` | Groq AI keys (comma-separated) |
| `GEMINI_API_KEYS` | Gemini AI keys (comma-separated) |
| `SENTRY_DSN` | Sentry error tracking |
| `DD_TRACE_ENABLED` | Datadog APM toggle |
| `EMAIL_HOST/PORT/USER/PASS` | SMTP email config |

---

## 16. Scripts & Dev Workflow

### Root Scripts
```bash
npm run dev          # Runs all 3 services concurrently (backend + frontend + DSA)
npm run backend      # Backend only
npm run frontend     # Frontend only
npm run install:all  # Install deps for all packages
npm run seed         # Reseed database
npm run build        # Build frontend for production
npm run test         # Run all tests
```

### Startup Sequence (Development)
1. `npm run dev` → concurrently starts 3 processes
2. Backend (`nodemon server.js`): connects DB → seeds → mounts routes → starts cron → listens on :5000
3. Frontend (`react-scripts start`): webpack dev server on :3000, proxies API calls
4. DSA Visualizer (`next dev -p 3001`): Next.js dev server on :3001

### Default Admin Account
- **Email:** `admin@skillforge.ai`
- **Password:** `Admin@123`
- Created automatically during database seeding
