# =====================================================
# SkillForge AI - Environment Configuration Requirements
# =====================================================
# This file documents ALL required environment variables
# Copy this content to a .env file and fill in your values
# =====================================================

# =====================================================
# 🔧 SERVER CONFIGURATION
# =====================================================

# Server port (default: 5000)
PORT=5000

# Server host binding (default: 0.0.0.0)
HOST=0.0.0.0

# Environment mode: development | production | test
NODE_ENV=development

# ===================
# EXTERNAL SCHEDULER (OPTION A)
# ===================
# Token used by external cron to trigger reminder emails
SCHEDULER_TOKEN=your_scheduler_token_here

# =====================================================
# 🗄️ DATABASE CONFIGURATION (REQUIRED)
# =====================================================

# MongoDB Connection String
# Local: mongodb://localhost:27017/skillforge-ai
# Atlas: mongodb+srv://<username>:<password>@cluster.mongodb.net/skillforge-ai?retryWrites=true&w=majority
#
# To get MongoDB Atlas URI:
# 1. Go to https://cloud.mongodb.com/
# 2. Create a free cluster
# 3. Click "Connect" > "Connect your application"
# 4. Copy the connection string
MONGODB_URI=mongodb://localhost:27017/skillforge-ai

# =====================================================
# 🔐 JWT AUTHENTICATION (REQUIRED)
# =====================================================

# JWT Secret Key - CHANGE THIS IN PRODUCTION!
# Generate a strong random string (minimum 32 characters)
# Use: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production_min_32_chars

# JWT Token Expiration (default: 7d)
# Format: 1h, 7d, 30d, etc.
JWT_EXPIRES_IN=7d

# =====================================================
# 🌐 OAUTH - GOOGLE (OPTIONAL)
# =====================================================
# Required for "Sign in with Google" functionality
#
# Setup Instructions:
# 1. Go to https://console.cloud.google.com/
# 2. Create a new project or select existing
# 3. Enable "Google+ API" and "Google Identity"
# 4. Go to Credentials > Create Credentials > OAuth Client ID
# 5. Application type: Web application
# 6. Authorized redirect URIs: http://localhost:5000/api/auth/google/callback
# 7. Copy Client ID and Client Secret

GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# =====================================================
# 🐙 OAUTH - GITHUB (OPTIONAL)
# =====================================================
# Required for "Sign in with GitHub" functionality
#
# Setup Instructions:
# 1. Go to https://github.com/settings/developers
# 2. Click "New OAuth App"
# 3. Application name: SkillForge AI
# 4. Homepage URL: http://localhost:3000
# 5. Authorization callback URL: http://localhost:5000/api/auth/github/callback
# 6. Copy Client ID and generate Client Secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# =====================================================
# 🔑 GITHUB PERSONAL ACCESS TOKEN (OPTIONAL)
# =====================================================
# Required for GitHub profile analysis with higher API rate limits
# Without this, GitHub API calls are rate-limited to 60 requests/hour
# With a token, you get 5000 requests/hour
#
# Setup Instructions:
# 1. Go to https://github.com/settings/tokens
# 2. Click "Generate new token (classic)"
# 3. Give it a name: "SkillForge AI"
# 4. Select scopes:
#    - repo (full control of private repositories) - OR
#    - public_repo (access to public repositories) - Recommended for public profiles
# 5. Click "Generate token"
# 6. Copy and paste below (token will only be shown once)
# 7. Keep this secret and don't commit to version control!

GITHUB_TOKEN=your_github_personal_access_token

# =====================================================
# 🤖 AI PROVIDERS (NOT REQUIRED)
# =====================================================
# The app works fully WITHOUT any AI API keys!
# Built-in mock responses provide a complete demo experience.
# Only configure this if you want real AI-generated responses.
#
# Use comma-separated values to allow fallback between keys.

GEMINI_API_KEYS=
GROQ_API_KEYS=
PERPLEXITY_API_KEYS=

# Optional overrides
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models
GEMINI_MODEL=gemini-1.5-flash
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.1-70b-versatile
PERPLEXITY_API_URL=https://api.perplexity.ai/chat/completions
PERPLEXITY_MODEL=sonar-pro

# =====================================================
# 📧 EMAIL SERVICE (OPTIONAL)
# =====================================================
# Required for password reset and daily study reminders
# Without this, emails will be logged to console only
#
# Gmail Setup (Recommended for Development):
# 1. Go to https://myaccount.google.com/apppasswords
# 2. Generate an App Password (requires 2FA enabled)
# 3. Use your Gmail address and the App Password below
#
# SendGrid Setup (Recommended for Production):
# 1. Sign up at https://sendgrid.com/
# 2. Create an API key
# 3. Use: smtp.sendgrid.net, port 587, apikey as user

EMAIL_SERVICE_PROVIDER=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_16_char_app_password

# =====================================================
# 🌐 CORS & FRONTEND URL (REQUIRED)
# =====================================================

# Frontend URL (for OAuth callbacks and CORS)
CLIENT_URL=http://localhost:3000

# CORS allowed origins (comma-separated for multiple)
CORS_ORIGIN=http://localhost:3000

# =====================================================
# 🛡️ RATE LIMITING (OPTIONAL)
# =====================================================

# Rate limit window in milliseconds (default: 15 minutes)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window (default: 100)
RATE_LIMIT_MAX_REQUESTS=100

# =====================================================
# 📈 OBSERVABILITY (SENTRY / DATADOG / LOGROCKET)
# =====================================================

# --- Backend (Express) ---
# Sentry DSN for backend error reporting
SENTRY_DSN=
SENTRY_ENV=development
SENTRY_TRACES_SAMPLE_RATE=0

# Datadog tracing for backend
DD_TRACE_ENABLED=true
DD_SERVICE=skillforge-ai-backend
DD_ENV=development
DD_VERSION=
DD_TRACE_SAMPLE_RATE=1

# Optional CSP allowlist overrides
SENTRY_INGEST_URL=https://*.sentry.io
DD_RUM_INGEST_URL=https://*.browser-intake-datadoghq.com
DD_RUM_INGEST_URL_EU=https://*.browser-intake-datadoghq.eu
LOGROCKET_INGEST_URL=https://*.logrocket.io

# --- Frontend (React) ---
# Sentry for frontend error reporting
REACT_APP_SENTRY_DSN=
REACT_APP_SENTRY_ENV=development
REACT_APP_SENTRY_TRACES_SAMPLE_RATE=0.1

# Datadog RUM for frontend
REACT_APP_DD_APPLICATION_ID=
REACT_APP_DD_CLIENT_TOKEN=
REACT_APP_DD_SITE=datadoghq.com
REACT_APP_DD_SERVICE=skillforge-ai-frontend
REACT_APP_DD_ENV=development
REACT_APP_DD_VERSION=
REACT_APP_DD_SAMPLE_RATE=100
REACT_APP_DD_SESSION_REPLAY_SAMPLE_RATE=20

# LogRocket for frontend session replay
REACT_APP_LOGROCKET_ID=
REACT_APP_LOGROCKET_RELEASE=

# =====================================================
# 👤 ADMIN CONFIGURATION (OPTIONAL)
# =====================================================

# Default admin email and password for seeding
ADMIN_EMAIL=admin@skillforge.ai
ADMIN_DEFAULT_PASSWORD=Admin@123

# =====================================================
# 🔑 SESSION (OPTIONAL)
# =====================================================

# Session secret for OAuth flows
SESSION_SECRET=your_session_secret_key_here


# =====================================================
# 📋 QUICK START CHECKLIST
# =====================================================
#
# Minimum Required for Development:
# ✅ MONGODB_URI - Database connection
# ✅ JWT_SECRET - Authentication
# ✅ CLIENT_URL - Frontend URL
#
# For OAuth Login (Optional):
# ⬜ GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET - Google OAuth
# ⬜ GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET - GitHub OAuth
#
# For Email Notifications (Optional):
# ⬜ EMAIL_USERNAME & EMAIL_PASSWORD - Email reminders
#
# AI Features (NOT REQUIRED):
# ℹ️ GEMINI_API_KEYS / GROQ_API_KEYS / PERPLEXITY_API_KEYS - Leave empty! App uses built-in mock responses
#
# =====================================================
