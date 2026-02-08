/**
 * SkillForge AI - Main Server Entry Point
 * Express.js application configuration and startup
 */

require('dotenv').config();
const ddTrace = require('dd-trace');
const Sentry = require('@sentry/node');

if (process.env.DD_TRACE_ENABLED !== 'false') {
  ddTrace.init({
    service: process.env.DD_SERVICE || 'skillforge-ai-backend',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION,
    logInjection: true,
    sampleRate: Number(process.env.DD_TRACE_SAMPLE_RATE || 1)
  });
}

const isSentryEnabled = Boolean(process.env.SENTRY_DSN);
if (isSentryEnabled) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0)
  });
}
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Import configurations
const connectDatabase = require('./config/database');
const { seedDatabase } = require('./seed/seedData');
require('./config/passport');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import services
const emailService = require('./services/emailService');
const schedulerService = require('./services/schedulerService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roadmapRoutes = require('./routes/roadmaps');
const topicRoutes = require('./routes/topics');
const roleRoutes = require('./routes/roles');
const languageRoutes = require('./routes/languages');
const studyPlanRoutes = require('./routes/studyPlan');
const testRoutes = require('./routes/tests');
const aiRoutes = require('./routes/ai');
const careerRoutes = require('./routes/career');
const adminRoutes = require('./routes/admin');
const schedulerRoutes = require('./routes/scheduler');
const assessmentRoutes = require('./routes/assessments');
const cohortRoutes = require('./routes/cohorts');
const mentorRoutes = require('./routes/mentors');
const communityRoutes = require('./routes/community');
const recruitersRoutes = require('./routes/recruiters');
const companiesRoutes = require('./routes/companies'); // Existing companies route?
const companyRoutes = require('./routes/company'); // NEW company admin routes
const jobsRoutes = require('./routes/jobs');
const socialRoutes = require('./routes/social');
const analyticsRoutes = require('./routes/analytics');
const hackathonRoutes = require('./routes/hackathons');
const certificateRoutes = require('./routes/certificates');
const gamificationRoutes = require('./routes/gamification');
const referralRoutes = require('./routes/referrals');

// Initialize express app
const app = express();

// EXACT CORS FIX
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// Connect to database
const startServer = async () => {
  await connectDatabase();

  // Always seed data on startup
  await seedDatabase({ exitOnComplete: false, connect: false });

  // Start server
  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || '0.0.0.0';

  // Create HTTP server instance explicitly to attach Socket.io
  const http = require('http');
  const httpServer = http.createServer(app);
  const { initializeSocket } = require('./config/socket');

  // Initialize Socket.io
  const io = initializeSocket(httpServer);

  const server = httpServer.listen(PORT, HOST, () => {
    console.log('');
    console.log('🚀 ═══════════════════════════════════════════════════');
    console.log('   SkillForge AI - Backend Server');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Server:      http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`   API:         http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api`);
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    // Initialize scheduler service after server starts
    if (process.env.NODE_ENV !== 'test') {
      schedulerService.initialize();
    }
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    schedulerService.stopAll();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    schedulerService.stopAll();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err.message);
    if (isSentryEnabled) {
      Sentry.captureException(err);
    }
    // Don't crash the server, just log the error
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    console.error(err.stack);
    if (isSentryEnabled) {
      Sentry.captureException(err);
    }
    // Gracefully shutdown
    schedulerService.stopAll();
    server.close(() => {
      process.exit(1);
    });
  });
};

// Initialize email service
emailService.initialize();



// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "http://localhost:5000",
        "ws://localhost:5000",
        process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai',
        process.env.GROQ_API_URL || 'https://api.groq.com',
        process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com',
        process.env.SENTRY_INGEST_URL || 'https://*.sentry.io',
        process.env.DD_RUM_INGEST_URL || 'https://*.browser-intake-datadoghq.com',
        process.env.DD_RUM_INGEST_URL_EU || 'https://*.browser-intake-datadoghq.eu',
        process.env.LOGROCKET_INGEST_URL || 'https://*.logrocket.io'
      ]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
if (process.env.NODE_ENV !== 'development') {
  app.use('/api/', limiter);
}

// AI routes get stricter rate limiting
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    message: 'AI request limit exceeded. Please wait before trying again.'
  }
});
app.use('/api/ai/', aiLimiter);

// Sentry request handler
if (isSentryEnabled) {
  app.use(Sentry.Handlers.requestHandler());
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Initialize passport
app.use(passport.initialize());

// Static files for uploads and images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SkillForge AI API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SkillForge AI Backend API',
    version: '1.0.0',
    documentation: '/api/v1',
    health: '/health'
  });
});

// API version prefix
const API_PREFIX = '/api/v1';

// Mount routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/roadmaps`, roadmapRoutes);
app.use(`${API_PREFIX}/topics`, topicRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/languages`, languageRoutes);
app.use(`${API_PREFIX}/study-plan`, studyPlanRoutes);
app.use(`${API_PREFIX}/tests`, testRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);
app.use(`${API_PREFIX}/career`, careerRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/scheduler`, schedulerRoutes);
app.use(`${API_PREFIX}/assessments`, assessmentRoutes);
app.use(`${API_PREFIX}/cohorts`, cohortRoutes);
app.use(`${API_PREFIX}/mentors`, mentorRoutes);
app.use(`${API_PREFIX}/community`, communityRoutes);
app.use(`${API_PREFIX}/recruiters`, recruitersRoutes);
app.use(`${API_PREFIX}/companies`, companiesRoutes);
app.use(`${API_PREFIX}/company`, companyRoutes); // Mount new admin route
app.use(`${API_PREFIX}/jobs`, jobsRoutes);
app.use(`${API_PREFIX}/social`, socialRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/hackathons`, hackathonRoutes);
app.use(`${API_PREFIX}/certificates`, certificateRoutes);
app.use(`${API_PREFIX}/gamification`, gamificationRoutes);
app.use(`${API_PREFIX}/referrals`, referralRoutes);
const xpRoutes = require('./routes/xp');
app.use(`${API_PREFIX}/xp`, xpRoutes);
const badgeRoutes = require('./routes/badges');
app.use(`${API_PREFIX}/badges`, badgeRoutes);
const leaderboardRoutes = require('./routes/leaderboard');
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);

// API documentation redirect
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to SkillForge AI API',
    version: 'v1',
    documentation: '/api/docs',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      users: `${API_PREFIX}/users`,
      roadmaps: `${API_PREFIX}/roadmaps`,
      topics: `${API_PREFIX}/topics`,
      roles: `${API_PREFIX}/roles`,
      languages: `${API_PREFIX}/languages`,
      studyPlan: `${API_PREFIX}/study-plan`,
      tests: `${API_PREFIX}/tests`,
      ai: `${API_PREFIX}/ai`,
      career: `${API_PREFIX}/career`,
      admin: `${API_PREFIX}/admin`
    }
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling
app.use(notFound);
if (isSentryEnabled) {
  app.use(Sentry.Handlers.errorHandler());
}
app.use(errorHandler);

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

module.exports = app;
