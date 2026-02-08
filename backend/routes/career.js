/**
 * SkillForge AI - Career Tools Routes
 * LeetCode Analysis, GitHub Analysis, ATS Resume Analyzer
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const CareerAnalysis = require('../models/CareerAnalysis');
const LeetCodeSubmission = require('../models/LeetCodeSubmission');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const AIService = require('../services/aiService');

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Configure multer for resume uploads (use memory storage on Vercel)
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create resume upload directory:', err.message);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `resume-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * @route   POST /api/career/leetcode/analyze
 * @desc    Analyze LeetCode profile
 * @access  Private
 */
router.post('/leetcode/analyze', protect, asyncHandler(async (req, res) => {
  let { username, forceRefresh } = req.body;

  if (!username) {
    const user = await User.findById(req.user.id);
    username = user?.careerData?.leetcodeUsername;
  }

  if (!username) {
    throw new ApiError('LeetCode username is required', 400);
  }

  // Check if recent analysis exists (within 24 hours)
  const recentAnalysis = await CareerAnalysis.findOne({
    user: req.user.id,
    type: 'leetcode',
    'leetcode.username': username,
    analyzedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (recentAnalysis && !forceRefresh) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: recentAnalysis
    });
  }

  // Create pending analysis
  const analysis = await CareerAnalysis.create({
    user: req.user.id,
    type: 'leetcode',
    leetcode: { username },
    status: 'processing'
  });

  try {
    // Fetch LeetCode stats (placeholder - would use actual API)
    const leetcodeStats = await fetchLeetCodeStats(username);

    // Generate AI insights
    const user = await User.findById(req.user.id).populate('preferences.targetRole');
    const aiInsights = await AIService.analyzeLeetCode({
      stats: leetcodeStats,
      targetRole: user.preferences.targetRole?.name,
      skillLevel: user.preferences.skillLevel,
      language: user.preferences.preferredLanguage
    });

    // XP Service Integration for LeetCode
    const xpService = require('../services/xpService');
    try {
      await xpService.addXP(req.user.id, 'LEETCODE_CONNECT');
    } catch (err) {
      console.error('Failed to award LeetCode XP:', err.message);
    }


    /* 
       Existing LeetCode XP logic (preserved but Leaderboard sync needed). 
       For now, I'll focus on the requested GitHub/Resume integrations.
    */

    // Update analysis
    analysis.leetcode = {
      username,
      ...leetcodeStats
    };
    analysis.aiInsights = aiInsights;
    analysis.status = 'completed';
    analysis.analyzedAt = new Date();
    analysis.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await analysis.save();

    // Save username to user's careerData so heatmap endpoint can find it
    await User.findByIdAndUpdate(req.user.id, {
      'careerData.leetcodeUsername': username,
      'careerData.lastLeetcodeAnalysis': new Date()
    });

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    analysis.status = 'failed';
    analysis.error = error.message;
    await analysis.save();
    if (error.message === 'LeetCode user not found') {
      throw new ApiError('LeetCode user not found', 404);
    }
    throw new ApiError(`Failed to analyze LeetCode profile: ${error.message}`, 500);
  }
}));

/**
 * @route   GET /api/career/leetcode/latest
 * @desc    Get latest LeetCode analysis
 * @access  Private
 */
router.get('/leetcode/latest', protect, asyncHandler(async (req, res) => {
  const analysis = await CareerAnalysis.getLatestAnalysis(req.user.id, 'leetcode');

  if (!analysis) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No LeetCode analysis found. Please analyze your profile first.'
    });
  }

  res.status(200).json({
    success: true,
    data: analysis
  });
}));

/**
 * @route   GET /api/career/leetcode/heatmap
 * @desc    Get LeetCode submission heatmap data (fetches live from LeetCode API)
 * @access  Private
 */
router.get('/leetcode/heatmap', protect, asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  // Get user's LeetCode username
  const user = await User.findById(req.user.id);
  const username = user?.careerData?.leetcodeUsername;

  if (!username) {
    return res.status(200).json({
      success: true,
      data: {
        year,
        heatmapData: {},
        stats: { totalSubmissions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 }
      }
    });
  }

  try {
    // Fetch live data from LeetCode's GraphQL API
    // Note: If we pass a specific year, LeetCode returns only that year's data
    // For "current" view we want all data then filter
    const query = `query userProfileCalendar($username: String!, $year: Int) {
      matchedUser(username: $username) {
        userCalendar(year: $year) {
          activeYears
          streak
          totalActiveDays
          submissionCalendar
        }
      }
    }`;

    // For current year or rolling view, don't pass year to get all data
    const currentYear = new Date().getFullYear();
    const variables = { username };
    if (year && year !== currentYear) {
      variables.year = year;
    }

    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Referer: 'https://leetcode.com',
          Origin: 'https://leetcode.com'
        },
        timeout: 15000
      }
    );

    const userCalendar = response.data?.data?.matchedUser?.userCalendar;

    if (!userCalendar) {
      throw new Error('Failed to fetch calendar data');
    }

    // Parse submission calendar (timestamps to dates)
    let submissionCalendar = {};
    try {
      if (userCalendar.submissionCalendar) {
        submissionCalendar = JSON.parse(userCalendar.submissionCalendar);
      }
    } catch (e) {
      console.error('Failed to parse submissionCalendar:', e);
    }

    // Convert timestamps to date strings
    // For current year, show rolling 365-day period
    // For past years, show that specific year
    const heatmapData = {};
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
      const date = new Date(parseInt(timestamp) * 1000);
      const dateStr = date.toISOString().split('T')[0];

      if (year === currentYear) {
        // Rolling 365-day view: include dates from past year to today
        if (date >= oneYearAgo && date <= now) {
          heatmapData[dateStr] = count;
        }
      } else {
        // Specific year view
        if (date.getFullYear() === year) {
          heatmapData[dateStr] = count;
        }
      }
    });

    const activeDays = Object.keys(heatmapData).length;
    const totalSubmissions = Object.values(heatmapData).reduce((a, b) => a + b, 0);

    res.status(200).json({
      success: true,
      data: {
        year,
        heatmapData,
        stats: {
          totalSubmissions,
          activeDays,
          currentStreak: userCalendar.streak || 0,
          maxStreak: userCalendar.streak || 0,
          activeYears: userCalendar.activeYears || []
        }
      }
    });
  } catch (error) {
    console.error('LeetCode heatmap error:', error.message);

    // Fallback to stored analysis if live fetch fails
    const analysis = await CareerAnalysis.getLatestAnalysis(req.user.id, 'leetcode');

    if (analysis?.leetcode?.calendar?.heatmapData) {
      const calendarData = analysis.leetcode.calendar;
      const heatmapDataRaw = calendarData.heatmapData instanceof Map
        ? Object.fromEntries(calendarData.heatmapData)
        : (calendarData.heatmapData?.toObject?.() || calendarData.heatmapData || {});

      const yearData = {};
      Object.entries(heatmapDataRaw).forEach(([date, count]) => {
        if (new Date(date).getFullYear() === year) {
          yearData[date] = count;
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          year,
          heatmapData: yearData,
          stats: {
            totalSubmissions: Object.values(yearData).reduce((a, b) => a + b, 0),
            activeDays: Object.keys(yearData).length,
            currentStreak: calendarData.streak || 0,
            maxStreak: calendarData.streak || 0
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        year,
        heatmapData: {},
        stats: { totalSubmissions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 }
      }
    });
  }
}));

/**
 * @route   POST /api/career/leetcode/submission
 * @desc    Record a LeetCode submission
 * @access  Private
 */
router.post('/leetcode/submission', protect, asyncHandler(async (req, res) => {
  const { problemId, problemTitle, problemSlug, difficulty, status, language, runtime, memory } = req.body;

  if (!problemId || !problemTitle || !difficulty) {
    throw new ApiError('Problem ID, title, and difficulty are required', 400);
  }

  const submission = await LeetCodeSubmission.create({
    user: req.user.id,
    problemId,
    problemTitle,
    problemSlug,
    difficulty: difficulty.toLowerCase(),
    status: status || 'accepted',
    language,
    runtime,
    memory
  });

  res.status(201).json({
    success: true,
    data: submission
  });
}));

/**
 * @route   POST /api/career/github/analyze
 * @desc    Analyze GitHub profile
 * @access  Private
 */
router.post('/github/analyze', protect, asyncHandler(async (req, res) => {
  let { username, forceRefresh } = req.body;

  if (!username) {
    const user = await User.findById(req.user.id);
    username = user?.careerData?.githubUsername;
  }

  if (!username) {
    throw new ApiError('GitHub username is required', 400);
  }

  // Check if recent analysis exists
  const recentAnalysis = await CareerAnalysis.findOne({
    user: req.user.id,
    type: 'github',
    'github.username': username,
    analyzedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (recentAnalysis && !forceRefresh) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: recentAnalysis
    });
  }

  // Create pending analysis
  const analysis = await CareerAnalysis.create({
    user: req.user.id,
    type: 'github',
    github: { username },
    status: 'processing'
  });

  try {
    // Fetch GitHub stats
    const githubStats = await fetchGitHubStats(username);

    // Generate AI insights
    const user = await User.findById(req.user.id).populate('preferences.targetRole');
    const aiInsights = await AIService.analyzeGitHub({
      stats: githubStats,
      targetRole: user.preferences.targetRole?.name,
      language: user.preferences.preferredLanguage
    });

    // Update analysis - flatten the structure properly
    analysis.github = {
      username,
      stats: githubStats.stats,
      topRepositories: githubStats.topRepositories,
      languageBreakdown: githubStats.languageBreakdown,
      techStack: githubStats.techStack
    };
    analysis.aiInsights = aiInsights;
    analysis.status = 'completed';
    analysis.analyzedAt = new Date();

    // Award XP for GitHub
    // "GitHub Repo Added -> +50 XP"
    // Since we don't track individual adds easily here, we award 50 XP for the sync/analysis action.
    const xpService = require('../services/xpService');
    try {
      await xpService.addXP(req.user.id, 'GITHUB_REPO');
    } catch (err) {
      console.error('Failed to award GitHub XP:', err.message);
    }

    await analysis.save();

    // Save username to user's careerData so heatmap endpoint can find it
    await User.findByIdAndUpdate(req.user.id, {
      'careerData.githubUsername': username,
      'careerData.lastGithubAnalysis': new Date()
    });

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    analysis.status = 'failed';
    analysis.error = error.message;
    await analysis.save();

    // Handle specific GitHub API errors
    if (error.response?.status === 404) {
      throw new ApiError('GitHub user not found', 404);
    }
    if (error.response?.status === 403) {
      throw new ApiError('GitHub API rate limit exceeded. Please try again later or configure a GitHub token in environment variables.', 429);
    }
    throw new ApiError(`Failed to analyze GitHub profile: ${error.message}`, 500);
  }
}));

/**
 * @route   GET /api/career/github/latest
 * @desc    Get latest GitHub analysis
 * @access  Private
 */
router.get('/github/latest', protect, asyncHandler(async (req, res) => {
  const analysis = await CareerAnalysis.getLatestAnalysis(req.user.id, 'github');

  if (!analysis) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No GitHub analysis found. Please analyze your profile first.'
    });
  }

  res.status(200).json({
    success: true,
    data: analysis
  });
}));

/**
 * @route   GET /api/career/github/heatmap
 * @desc    Get GitHub contribution heatmap data
 * @access  Private
 */
router.get('/github/heatmap', protect, asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  // Get user's GitHub username
  const user = await User.findById(req.user.id);
  const username = user?.careerData?.githubUsername;

  if (!username) {
    return res.status(200).json({
      success: true,
      data: {
        year,
        heatmapData: {},
        stats: { totalContributions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 }
      }
    });
  }

  try {
    const contributionData = await fetchGitHubContributions(username, year);
    res.status(200).json({
      success: true,
      data: {
        year,
        ...contributionData
      }
    });
  } catch (error) {
    console.error('GitHub heatmap error:', error.message);
    res.status(200).json({
      success: true,
      data: {
        year,
        heatmapData: {},
        stats: { totalContributions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 }
      }
    });
  }
}));

/**
 * @route   GET /api/career/github/repos
 * @desc    Get public GitHub repositories for import
 * @access  Private
 */
router.get('/github/repos', protect, asyncHandler(async (req, res) => {
  let { username } = req.query;

  if (!username) {
    const user = await User.findById(req.user.id);
    username = user?.careerData?.githubUsername;
  }

  if (!username) {
    throw new ApiError('GitHub username is required', 400);
  }

  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
  const headers = {
    'User-Agent': 'SkillForge-AI',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers,
      params: {
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      },
      timeout: 10000
    });

    const repos = response.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      language: repo.language,
      stargazers_count: repo.stargazers_count,
      updated_at: repo.updated_at
    }));

    res.status(200).json({
      success: true,
      data: repos
    });
  } catch (error) {
    console.error('GitHub repos fetch error:', error.message);
    if (error.response?.status === 404) {
      throw new ApiError('GitHub user not found', 404);
    }
    throw new ApiError('Failed to fetch GitHub repositories', 500);
  }
}));

/**
 * @route   GET /api/career/activity/unified
 * @desc    Get unified activity data from both GitHub and LeetCode
 * @access  Private
 */
router.get('/activity/unified', protect, asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const user = await User.findById(req.user.id);

  // Fetch both sources in parallel
  const [leetcodeData, githubData] = await Promise.allSettled([
    LeetCodeSubmission.getHeatmapData(req.user.id, year).then(async (heatmapData) => ({
      heatmapData,
      stats: await LeetCodeSubmission.getStreakStats(req.user.id, year)
    })),
    user?.careerData?.githubUsername
      ? fetchGitHubContributions(user.careerData.githubUsername, year)
      : { heatmapData: {}, stats: { totalContributions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 } }
  ]);

  const leetcode = leetcodeData.status === 'fulfilled' ? leetcodeData.value : { heatmapData: {}, stats: {} };
  const github = githubData.status === 'fulfilled' ? githubData.value : { heatmapData: {}, stats: {} };

  // Combine heatmap data
  const combinedHeatmap = {};
  const allDates = new Set([...Object.keys(leetcode.heatmapData || {}), ...Object.keys(github.heatmapData || {})]);

  for (const date of allDates) {
    combinedHeatmap[date] = {
      leetcode: leetcode.heatmapData?.[date] || 0,
      github: github.heatmapData?.[date] || 0,
      total: (leetcode.heatmapData?.[date] || 0) + (github.heatmapData?.[date] || 0)
    };
  }

  res.status(200).json({
    success: true,
    data: {
      year,
      leetcode,
      github,
      combined: {
        heatmapData: combinedHeatmap,
        stats: {
          totalActivity: (leetcode.stats?.totalSubmissions || 0) + (github.stats?.totalContributions || 0),
          activeDays: allDates.size,
          leetcodeStreak: leetcode.stats?.currentStreak || 0,
          githubStreak: github.stats?.currentStreak || 0
        }
      }
    }
  });
}));

/**
 * @route   POST /api/career/resume/analyze
 * @desc    Analyze resume with ATS scoring
 * @access  Private
 */
router.post('/resume/analyze', protect, upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError('Resume PDF file is required', 400);
  }

  const { targetRole } = req.body;

  // Create analysis record
  const analysis = await CareerAnalysis.create({
    user: req.user.id,
    type: 'resume',
    resume: {
      fileName: req.file.originalname,
      fileUrl: req.file.path,
      targetRole
    },
    status: 'processing'
  });

  try {
    // Parse PDF (placeholder - would use pdf-parse)
    const resumeText = await parseResumePDF(req.file.path);

    // Analyze with AI
    const user = await User.findById(req.user.id).populate('preferences.targetRole');
    const role = targetRole || user.preferences.targetRole?.name || 'Software Developer';

    const atsAnalysis = await AIService.analyzeResume({
      resumeText,
      targetRole: role,
      language: user.preferences.preferredLanguage
    });

    // Update analysis
    analysis.resume = {
      ...analysis.resume.toObject(),
      atsScore: atsAnalysis.atsScore,
      sections: atsAnalysis.sections,
      keywords: atsAnalysis.keywords,
      formatting: atsAnalysis.formatting,
      targetRole: role
    };
    analysis.aiInsights = atsAnalysis.insights;
    analysis.status = 'completed';
    analysis.analyzedAt = new Date();

    // Award XP for Resume Upload
    // "Resume Upload -> +200 XP"
    const xpService = require('../services/xpService');
    try {
      await xpService.addXP(req.user.id, 'RESUME_UPLOAD');
    } catch (err) {
      console.error('Failed to award Resume XP:', err.message);
    }

    await analysis.save();

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    analysis.status = 'failed';
    analysis.error = error.message;
    await analysis.save();
    throw new ApiError('Failed to analyze resume', 500);
  }
}));

/**
 * @route   POST /api/career/resume/reanalyze
 * @desc    Re-analyze latest resume with ATS scoring
 * @access  Private
 */
router.post('/resume/reanalyze', protect, asyncHandler(async (req, res) => {
  const latest = await CareerAnalysis.getLatestAnalysis(req.user.id, 'resume');

  if (!latest?.resume?.fileUrl) {
    throw new ApiError('No resume available to re-analyze', 404);
  }

  const { targetRole } = req.body || {};

  // Create analysis record
  const analysis = await CareerAnalysis.create({
    user: req.user.id,
    type: 'resume',
    resume: {
      fileName: latest.resume.fileName,
      fileUrl: latest.resume.fileUrl,
      targetRole: latest.resume.targetRole
    },
    status: 'processing'
  });

  try {
    const resumeText = await parseResumePDF(latest.resume.fileUrl);

    const user = await User.findById(req.user.id).populate('preferences.targetRole');
    const role = targetRole || user.preferences.targetRole?.name || latest.resume.targetRole || 'Software Developer';

    const atsAnalysis = await AIService.analyzeResume({
      resumeText,
      targetRole: role,
      language: user.preferences.preferredLanguage
    });

    analysis.resume = {
      ...analysis.resume.toObject(),
      atsScore: atsAnalysis.atsScore,
      sections: atsAnalysis.sections,
      keywords: atsAnalysis.keywords,
      formatting: atsAnalysis.formatting,
      targetRole: role
    };
    analysis.aiInsights = atsAnalysis.insights;
    analysis.status = 'completed';
    analysis.analyzedAt = new Date();

    await analysis.save();

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    analysis.status = 'failed';
    analysis.error = error.message;
    await analysis.save();
    throw new ApiError('Failed to re-analyze resume', 500);
  }
}));

/**
 * @route   GET /api/career/resume/latest
 * @desc    Get latest resume analysis
 * @access  Private
 */
router.get('/resume/latest', protect, asyncHandler(async (req, res) => {
  const analysis = await CareerAnalysis.getLatestAnalysis(req.user.id, 'resume');

  if (!analysis) {
    return res.status(200).json({
      success: true,
      data: null,
      message: 'No resume analysis found. Please upload your resume first.'
    });
  }

  res.status(200).json({
    success: true,
    data: analysis
  });
}));

/**
 * @route   GET /api/career/all
 * @desc    Get all career analyses for user
 * @access  Private
 */
router.get('/all', protect, asyncHandler(async (req, res) => {
  const analyses = await CareerAnalysis.find({
    user: req.user.id,
    status: 'completed'
  }).sort({ analyzedAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      leetcode: analyses.find(a => a.type === 'leetcode'),
      github: analyses.find(a => a.type === 'github'),
      resume: analyses.find(a => a.type === 'resume')
    }
  });
}));

// Helper functions (placeholders for actual API integrations)

async function fetchLeetCodeStats(username) {
  // Query for user profile, stats, and recent submissions
  const query = `query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStatsGlobal {
        acSubmissionNum { difficulty count submissions }
        totalSubmissionNum { difficulty count submissions }
      }
      tagProblemCounts {
        advanced { tagName problemsSolved }
        intermediate { tagName problemsSolved }
        fundamental { tagName problemsSolved }
      }
      userCalendar {
        activeYears
        streak
        totalActiveDays
        submissionCalendar
      }
    }
    recentAcSubmissionList(username: $username, limit: 50) {
      id
      title
      titleSlug
      timestamp
    }
  }`;

  const response = await axios.post(
    'https://leetcode.com/graphql',
    { query, variables: { username } },
    {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://leetcode.com',
        Origin: 'https://leetcode.com',
        Accept: 'application/json'
      },
      timeout: 15000
    }
  );

  const matchedUser = response.data?.data?.matchedUser;
  if (!matchedUser) {
    throw new Error('LeetCode user not found');
  }

  const acSubmissionNum = matchedUser.submitStatsGlobal?.acSubmissionNum || [];
  const totalSubmissionNum = matchedUser.submitStatsGlobal?.totalSubmissionNum || [];
  const getCount = (arr, difficulty) =>
    arr.find((item) => item.difficulty === difficulty)?.count || 0;

  const totalSolved = getCount(acSubmissionNum, 'All');
  const easySolved = getCount(acSubmissionNum, 'Easy');
  const mediumSolved = getCount(acSubmissionNum, 'Medium');
  const hardSolved = getCount(acSubmissionNum, 'Hard');

  const totalSubmissions = getCount(totalSubmissionNum, 'All');
  const acceptanceRate = totalSubmissions
    ? Number(((totalSolved / totalSubmissions) * 100).toFixed(1))
    : 0;

  const tagProblemCounts = matchedUser.tagProblemCounts || {};
  const topicWise = [
    ...(tagProblemCounts.fundamental || []),
    ...(tagProblemCounts.intermediate || []),
    ...(tagProblemCounts.advanced || [])
  ].map((tag) => ({
    topic: tag.tagName,
    solved: tag.problemsSolved || 0,
    total: 0
  }));

  const skillLevel = totalSolved >= 500
    ? 'advanced'
    : totalSolved >= 200
      ? 'intermediate'
      : 'beginner';

  // Parse submission calendar for heatmap
  const userCalendar = matchedUser.userCalendar || {};
  let submissionCalendar = {};
  try {
    if (userCalendar.submissionCalendar) {
      submissionCalendar = JSON.parse(userCalendar.submissionCalendar);
    }
  } catch (e) {
    console.error('Failed to parse submissionCalendar:', e);
  }

  // Convert timestamps to dates
  const heatmapData = {};
  Object.entries(submissionCalendar).forEach(([timestamp, count]) => {
    const date = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
    heatmapData[date] = count;
  });

  // Parse recent submissions
  const recentSubmissions = (response.data?.data?.recentAcSubmissionList || []).map(sub => ({
    problemId: sub.id,
    problemTitle: sub.title,
    problemSlug: sub.titleSlug,
    submittedAt: new Date(parseInt(sub.timestamp) * 1000)
  }));

  return {
    stats: {
      totalSolved,
      easySolved,
      mediumSolved,
      hardSolved,
      totalQuestions: null,
      acceptanceRate,
      ranking: matchedUser.profile?.ranking || null
    },
    recentSubmissions,
    topicWise,
    skillLevel,
    calendar: {
      heatmapData,
      streak: userCalendar.streak || 0,
      totalActiveDays: userCalendar.totalActiveDays || 0,
      activeYears: userCalendar.activeYears || []
    }
  };
}

async function fetchGitHubStats(username) {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
  const headers = {
    'User-Agent': 'SkillForge-AI',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    console.log(`Fetching GitHub stats for user: ${username}`);

    // Fetch user data
    const userResponse = await axios.get(`https://api.github.com/users/${username}`, {
      headers,
      timeout: 10000
    });

    if (!userResponse.data) {
      throw new Error('GitHub user not found');
    }

    console.log(`User found: ${username}, public repos: ${userResponse.data.public_repos}`);

    // Fetch repositories
    const reposResponse = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers,
      timeout: 10000,
      params: {
        per_page: 100,
        sort: 'updated'
      }
    });

    const repos = reposResponse.data || [];
    console.log(`Found ${repos.length} repositories`);

    const totalStars = repos.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0);
    const totalForks = repos.reduce((sum, repo) => sum + (repo.forks_count || 0), 0);

    // For contributions/commits, use a simpler approach
    let totalCommits = 0;

    try {
      // Only check top 2 repos to avoid rate limiting and timeouts
      const topRepos = repos.slice(0, 2);

      for (const repo of topRepos) {
        try {
          // Get the commit count
          const commitsResponse = await axios.get(
            `https://api.github.com/repos/${username}/${repo.name}/commits`,
            {
              headers,
              timeout: 3000,
              params: {
                per_page: 1
              }
            }
          );

          // Parse pagination header to get total count
          const linkHeader = commitsResponse.headers.link;
          if (linkHeader && typeof linkHeader === 'string') {
            const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
            if (lastPageMatch) {
              const pageCount = parseInt(lastPageMatch[1], 10);
              totalCommits += pageCount;
            }
          }
        } catch (repoError) {
          // Log but continue - some repos might not have commits or be inaccessible
          console.log(`Could not fetch commits for ${repo.name}: ${repoError.message}`);
          continue;
        }
      }
    } catch (commitError) {
      console.log(`Error fetching commits: ${commitError.message}`);
      // Continue without commit data
    }

    // Process languages
    const languageCounts = repos.reduce((acc, repo) => {
      if (repo.language) {
        acc[repo.language] = (acc[repo.language] || 0) + 1;
      }
      return acc;
    }, {});

    const totalLanguageRepos = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
    const languageBreakdown = Object.entries(languageCounts)
      .map(([language, count]) => ({
        language,
        percentage: totalLanguageRepos ? Number(((count / totalLanguageRepos) * 100).toFixed(1)) : 0,
        bytes: 0
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 8);

    // Get all repositories sorted by stars (limit to first 50 to avoid document size issues)
    const topRepositories = repos
      .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
      .slice(0, 50)
      .map((repo) => ({
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        url: repo.html_url
      }));

    const result = {
      stats: {
        publicRepos: userResponse.data.public_repos || 0,
        totalStars,
        totalForks,
        followers: userResponse.data.followers || 0,
        following: userResponse.data.following || 0,
        totalCommits: Math.max(totalCommits, 0)
      },
      topRepositories,
      languageBreakdown,
      techStack: languageBreakdown.map((lang) => lang.language)
    };

    console.log('GitHub stats fetched successfully:', result.stats);
    return result;

  } catch (error) {
    console.error('fetchGitHubStats error:', error.message);
    console.error('Error status:', error.response?.status);

    // Provide better error messages for common issues
    if (error.response?.status === 404) {
      throw new Error('GitHub user not found');
    }
    if (error.response?.status === 403) {
      const remaining = error.response?.headers?.['x-ratelimit-remaining'];
      const reset = error.response?.headers?.['x-ratelimit-reset'];
      console.error('Rate limit headers:', { remaining, reset });

      if (remaining === '0') {
        const resetTime = new Date(parseInt(reset) * 1000).toLocaleTimeString();
        throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime}. Please configure GITHUB_TOKEN environment variable for higher limits.`);
      }
      throw new Error('GitHub API access denied. Please check your GitHub token configuration.');
    }
    throw new Error(`Failed to fetch GitHub stats: ${error.message}`);
  }
}

/**
 * Fetch GitHub contribution data for heatmap
 * Uses GitHub Events API to get user activity
 */
async function fetchGitHubContributions(username, year) {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_TOKEN;
  const headers = {
    'User-Agent': 'SkillForge-AI',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    // Fetch user events (public activity)
    const eventsResponse = await axios.get(`https://api.github.com/users/${username}/events/public`, {
      headers,
      timeout: 10000,
      params: { per_page: 100 }
    });

    const events = eventsResponse.data || [];
    const heatmapData = {};
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Group events by date
    events.forEach(event => {
      const eventDate = new Date(event.created_at);
      if (eventDate >= startDate && eventDate <= endDate) {
        const dateStr = eventDate.toISOString().split('T')[0];
        heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 1;
      }
    });

    // Calculate stats
    const sortedDates = Object.keys(heatmapData).sort();
    const totalContributions = Object.values(heatmapData).reduce((sum, count) => sum + count, 0);
    const activeDays = sortedDates.length;

    // Calculate streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = sortedDates.map(d => new Date(d));

    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    // Calculate current streak
    if (dates.length > 0) {
      const lastDate = new Date(dates[dates.length - 1]);
      lastDate.setHours(0, 0, 0, 0);
      const diffFromToday = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

      if (diffFromToday <= 1) {
        currentStreak = 1;
        for (let i = dates.length - 2; i >= 0; i--) {
          const diff = (dates[i + 1] - dates[i]) / (1000 * 60 * 60 * 24);
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      heatmapData,
      stats: {
        totalContributions,
        activeDays,
        currentStreak,
        maxStreak
      }
    };
  } catch (error) {
    console.error('fetchGitHubContributions error:', error.message);
    return {
      heatmapData: {},
      stats: { totalContributions: 0, activeDays: 0, currentStreak: 0, maxStreak: 0 }
    };
  }
}

async function parseResumePDF(filePath) {
  const pdfParse = require('pdf-parse');
  const fs = require('fs').promises;

  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error.message);
    throw new Error('Failed to parse PDF file. Please ensure it is a valid PDF.');
  }
}

/**
 * @route   GET /api/career/readiness-score
 * @desc    Calculate career readiness score based on target role and analyses
 * @access  Private
 */
router.get('/readiness-score', protect, asyncHandler(async (req, res) => {
  // Fetch user with preferences and career data
  const user = await User.findById(req.user.id).populate('preferences.targetRole');

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Get all analyses
  const analyses = await CareerAnalysis.find({
    user: req.user.id,
    status: 'completed'
  }).sort({ analyzedAt: -1 });

  const leetcodeAnalysis = analyses.find(a => a.type === 'leetcode');
  const githubAnalysis = analyses.find(a => a.type === 'github');
  const resumeAnalysis = analyses.find(a => a.type === 'resume');

  // Extract scores
  const leetcodeScore = leetcodeAnalysis?.aiInsights?.score ?? 0;
  const githubScore = githubAnalysis?.aiInsights?.score ?? 0;
  const resumeScore = resumeAnalysis?.resume?.atsScore ?? 0;

  // Get role-based weights
  const targetRole = user.preferences?.targetRole?.name || '';
  const roleCategory = targetRole.toLowerCase();

  const getWeights = () => {
    if (roleCategory.includes('algorithm') || roleCategory.includes('competitive') ||
      roleCategory.includes('sde') || roleCategory.includes('software engineer')) {
      return { leetcode: 0.45, github: 0.35, resume: 0.20 };
    }
    if (roleCategory.includes('backend') || roleCategory.includes('system') ||
      roleCategory.includes('devops') || roleCategory.includes('cloud')) {
      return { leetcode: 0.30, github: 0.45, resume: 0.25 };
    }
    if (roleCategory.includes('frontend') || roleCategory.includes('ui') ||
      roleCategory.includes('web') || roleCategory.includes('mobile')) {
      return { leetcode: 0.20, github: 0.50, resume: 0.30 };
    }
    if (roleCategory.includes('data') || roleCategory.includes('ml') ||
      roleCategory.includes('ai') || roleCategory.includes('scientist')) {
      return { leetcode: 0.35, github: 0.40, resume: 0.25 };
    }
    if (roleCategory.includes('full stack') || roleCategory.includes('fullstack')) {
      return { leetcode: 0.33, github: 0.37, resume: 0.30 };
    }
    return { leetcode: 0.33, github: 0.34, resume: 0.33 };
  };

  const weights = getWeights();

  // Calculate overall score
  const completedCount = [leetcodeScore, githubScore, resumeScore].filter(s => s > 0).length;

  const overallScore = completedCount > 0
    ? Math.round(
      (leetcodeScore ? leetcodeScore * weights.leetcode : 0) +
      (githubScore ? githubScore * weights.github : 0) +
      (resumeScore ? resumeScore * weights.resume : 0)
    ) / (
      (leetcodeScore ? weights.leetcode : 0) +
      (githubScore ? weights.github : 0) +
      (resumeScore ? weights.resume : 0)
    )
    : 0;

  // Save readiness score to user
  user.careerData.readinessScore = {
    overall: Math.round(overallScore),
    leetcodeScore: Math.round(leetcodeScore),
    githubScore: Math.round(githubScore),
    resumeScore: Math.round(resumeScore),
    weights,
    targetRole: user.preferences?.targetRole?._id?.toString(),
    lastCalculated: new Date()
  };

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      readinessScore: user.careerData.readinessScore,
      analyses: {
        leetcode: leetcodeAnalysis,
        github: githubAnalysis,
        resume: resumeAnalysis
      }
    }
  });
}));

module.exports = router;
