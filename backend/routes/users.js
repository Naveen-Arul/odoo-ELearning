/**
 * SkillForge AI - User Routes
 * User profile, preferences, and progress management
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const TimeTrackingSession = require('../models/TimeTrackingSession');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { preferencesValidation } = require('../middleware/validation');

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile with full details
 * @access  Private
 */
router.get('/profile', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('preferences.targetRole')
    .populate({
      path: 'enrolledRoadmaps.roadmap',
      populate: { path: 'role' }
    })
    .populate('languageLearning.language');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Calculate additional stats
  const todayStudyTime = user.getTodayStudyTime();
  const activeRoadmaps = user.enrolledRoadmaps.filter(r =>
    r.status === 'current' || r.status === 'active'
  );

  res.status(200).json({
    success: true,
    data: {
      user,
      stats: {
        todayStudyTime,
        activeRoadmapCount: activeRoadmaps.length,
        canEnrollNewRoadmap: user.canEnrollNewRoadmap()
      }
    }
  });
}));

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
const upload = require('../middleware/upload');

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', protect, upload.single('avatar'), asyncHandler(async (req, res) => {
  const { name } = req.body;

  const updateData = {};
  if (name) {
    const existingUser = await User.findOne({ name, _id: { $ne: req.user.id } });
    if (existingUser) {
      throw new ApiError('Username already taken', 400);
    }
    updateData.name = name;
  }

  // Handle file upload
  if (req.file) {
    // Convert backslashes to forward slashes for Windows compatibility and URL usage
    const relativePath = `uploads/profiles/${req.file.filename}`;
    // Store relative path. Should be served via static middleware.
    // Assuming server.js serves /uploads mapped to backend/uploads
    // If server serves /uploads directly, we might need full URL constructing or just path
    // Let's store the path relative to API_URL: /uploads/profiles/...
    // Actually, in server.js: app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    // So URL would be http://localhost:5000/uploads/profiles/...
    // Let's store the relative URL path starting with /
    updateData.avatar = `/${relativePath}`;
  } else if (req.body.avatar) {
    // Allow updating avatar string directly (e.g. if we add url presets later)
    updateData.avatar = req.body.avatar;
  }

  // Handle Professional Profile Fields
  const { currentStatus, skills, projects, experience } = req.body;

  if (currentStatus) updateData.currentStatus = currentStatus;

  if (skills) {
    updateData.skills = typeof skills === 'string' ? JSON.parse(skills) : skills;
  }

  if (projects) {
    updateData.projects = typeof projects === 'string' ? JSON.parse(projects) : projects;
  }

  if (experience) {
    updateData.experience = typeof experience === 'string' ? JSON.parse(experience) : experience;
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { ...updateData, isOnboarded: true } },
    { new: true, runValidators: true }
  ).populate('preferences.targetRole');

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
}));

/**
 * @route   PUT /api/users/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', protect, preferencesValidation, asyncHandler(async (req, res) => {
  const { targetRole, skillLevel, dailyStudyTime, preferredLanguage } = req.body;

  // Validate target role if provided
  if (targetRole) {
    const roleExists = await Role.isValidRole(targetRole);
    if (!roleExists) {
      throw new ApiError('Invalid target role selected', 400);
    }
  }

  const updateData = { preferences: {} };
  if (targetRole) updateData.preferences.targetRole = targetRole;
  if (skillLevel) updateData.preferences.skillLevel = skillLevel;
  if (dailyStudyTime) updateData.preferences.dailyStudyTime = dailyStudyTime;
  if (preferredLanguage) updateData.preferences.preferredLanguage = preferredLanguage;


  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('preferences.targetRole');

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    data: {
      preferences: user.preferences
    }
  });
}));

/**
 * @route   GET /api/users/outcomes
 * @desc    Get job outcomes for current user
 * @access  Private
 */
router.get('/outcomes', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('jobOutcomes');
  res.status(200).json({
    success: true,
    data: user?.jobOutcomes || []
  });
}));

/**
 * @route   POST /api/users/outcomes
 * @desc    Add job outcome entry
 * @access  Private
 */
router.post('/outcomes', protect, asyncHandler(async (req, res) => {
  const { status, company, role, source, salary, location, notes, date } = req.body;

  const user = await User.findById(req.user.id);
  user.jobOutcomes.push({
    status,
    company,
    role,
    source,
    salary,
    location,
    notes,
    date: date ? new Date(date) : new Date()
  });
  await user.save();

  res.status(201).json({
    success: true,
    data: user.jobOutcomes
  });
}));

/**
 * @route   POST /api/users/heartbeat
 * @desc    Record a heartbeat for session time tracking (hidden from user)
 * @access  Private
 */
router.post('/heartbeat', protect, asyncHandler(async (req, res) => {
  const { minutes = 1 } = req.body;
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find or create today's study time record
  let todayRecord = user.studyTime.find(st => {
    const recordDate = new Date(st.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });

  if (todayRecord) {
    todayRecord.minutes += Math.min(minutes, 5); // Cap at 5 minutes per heartbeat for safety
  } else {
    user.studyTime.push({
      date: today,
      minutes: Math.min(minutes, 5),
      topicsCompleted: 0,
      sessions: []
    });
  }

  // Update lastActive timestamp
  user.lastActive = new Date();
  await user.save();

  res.status(200).json({
    success: true,
    data: {
      todayMinutes: user.getTodayStudyTime(),
      lastActive: user.lastActive
    }
  });
}));

/**
 * @route   GET /api/users/study-time
 * @desc    Get study time data for heatmap
 * @access  Private
 */
router.get('/study-time', protect, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const user = await User.findById(req.user.id);

  let studyTimeData = user.studyTime;

  // Filter by date range if provided
  if (startDate || endDate) {
    studyTimeData = studyTimeData.filter(st => {
      const date = new Date(st.date);
      if (startDate && date < new Date(startDate)) return false;
      if (endDate && date > new Date(endDate)) return false;
      return true;
    });
  }

  // Format for heatmap
  const heatmapData = studyTimeData.map(st => ({
    date: st.date,
    minutes: st.minutes,
    topicsCompleted: st.topicsCompleted,
    level: getActivityLevel(st.minutes)
  }));

  res.status(200).json({
    success: true,
    data: heatmapData
  });
}));

/**
 * @route   GET /api/users/study-time/today
 * @desc    Get today's study time
 * @access  Private
 */
router.get('/study-time/today', protect, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await TimeTrackingSession.getSessionsForDate(req.user.id, today);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      date: today,
      totalMinutes,
      sessions: sessions.length
    }
  });
}));

/**
 * @route   GET /api/users/analytics
 * @desc    Get user analytics for dashboard
 * @access  Private
 */
router.get('/analytics', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap');

  // Weekly study time
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyStudyTime = user.studyTime
    .filter(st => new Date(st.date) >= weekAgo)
    .map(st => ({
      date: st.date,
      minutes: st.minutes,
      topicsCompleted: st.topicsCompleted
    }));

  // Roadmap progress
  const roadmapProgress = user.enrolledRoadmaps.map(er => ({
    roadmap: er.roadmap,
    status: er.status,
    progress: er.progress,
    completedTopicsCount: er.completedTopics.length
  }));

  // Calculate streaks
  const currentStreak = calculateStreak(user.studyTime);
  const streakMessage = getStreakMessage(currentStreak);

  // Calculate today's study minutes
  const todayMinutes = user.getTodayStudyTime();

  // Calculate weekly progress
  const weeklyMinutesStudied = weeklyStudyTime.reduce((sum, st) => sum + st.minutes, 0);
  const weeklyTopicsCompleted = weeklyStudyTime.reduce((sum, st) => sum + st.topicsCompleted, 0);
  const weeklyGoal = user.weeklyGoal || { targetMinutes: 600, targetTopics: 5 };
  const weeklyProgress = weeklyGoal.targetMinutes > 0
    ? Math.min(Math.round((weeklyMinutesStudied / weeklyGoal.targetMinutes) * 100), 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      weeklyStudyTime,
      roadmapProgress,
      streak: currentStreak,
      streakMessage,
      todayMinutes,
      weeklyProgress,
      weeklyMinutesStudied,
      weeklyTopicsCompleted,
      weeklyGoal,
      totalTopicsCompleted: user.enrolledRoadmaps.reduce(
        (sum, er) => sum + er.completedTopics.length, 0
      ),
      totalStudyHours: Math.round(
        user.studyTime.reduce((sum, st) => sum + st.minutes, 0) / 60
      )
    }
  });
}));

/**
 * @route   PUT /api/users/career-data
 * @desc    Update career data (LeetCode/GitHub usernames)
 * @access  Private
 */
router.get('/career-data', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user.careerData
  });
}));

/**
 * @route   PUT /api/users/career-data
 * @desc    Update career data (LeetCode/GitHub usernames)
 * @access  Private
 */
router.put('/career-data', protect, asyncHandler(async (req, res) => {
  const { leetcodeUsername, githubUsername } = req.body;

  const updateData = {};
  if (leetcodeUsername !== undefined) {
    updateData['careerData.leetcodeUsername'] = leetcodeUsername;
  }
  if (githubUsername !== undefined) {
    updateData['careerData.githubUsername'] = githubUsername;
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Career data updated',
    data: user.careerData
  });
}));

// Helper function to determine activity level for heatmap
function getActivityLevel(minutes) {
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

// Helper function to calculate study streak
function calculateStreak(studyTime) {
  if (!studyTime || studyTime.length === 0) return 0;

  // Sort by date descending
  const sorted = [...studyTime]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter(st => st.minutes > 0);

  if (sorted.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const st of sorted) {
    const stDate = new Date(st.date);
    stDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate - stDate) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
      currentDate = stDate;
    } else {
      break;
    }
  }

  return streak;
}

// Helper function to get motivational streak message
function getStreakMessage(streak) {
  if (streak === 0) {
    return { emoji: '🎯', message: 'Start your learning streak today!', type: 'start' };
  } else if (streak === 1) {
    return { emoji: '🔥', message: 'Great start! Keep it going!', type: 'new' };
  } else if (streak < 7) {
    return { emoji: '🔥', message: `${streak} days strong! Keep the momentum!`, type: 'building' };
  } else if (streak < 30) {
    return { emoji: '🔥', message: `Amazing ${streak}-day streak! You're on fire!`, type: 'strong' };
  } else if (streak < 100) {
    return { emoji: '🔥', message: `Incredible ${streak}-day streak! Unstoppable!`, type: 'epic' };
  } else {
    return { emoji: '🏆', message: `LEGENDARY ${streak}-day streak! 🌟`, type: 'legendary' };
  }
}

/**
 * @route   PUT /api/users/career-data
 * @desc    Update career data (LeetCode, GitHub usernames, Resume)
 * @access  Private
 */
router.put('/career-data', protect, upload.single('resume'), asyncHandler(async (req, res) => {
  const { leetcodeUsername, githubUsername } = req.body;

  const updateData = { careerData: {} };

  // Handle nested updates carefully to avoiding overwriting the whole object if we were doing $set on root.
  // But here we are constructing a specific object for $set or mixing.
  // Actually, standard Mongoose $set: { "careerData.leetcodeUsername": ... } is better to avoid overwriting other fields in careerData if we used mixed approach.
  // Let's build a flat update object.
  const updates = {};

  if (leetcodeUsername !== undefined) updates['careerData.leetcodeUsername'] = leetcodeUsername;
  if (githubUsername !== undefined) updates['careerData.githubUsername'] = githubUsername;

  // Handle resume file
  if (req.file) {
    const relativePath = `uploads/resumes/${req.file.filename}`;
    updates['careerData.resumeUrl'] = `/${relativePath}`;
  }

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('preferences.targetRole');

  res.status(200).json({
    success: true,
    message: 'Career data updated successfully',
    data: user.careerData
  });
}));

/**
 * @route   GET /api/users/weekly-goal
 * @desc    Get current week's goal and progress
 * @access  Private
 */
router.get('/weekly-goal', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  // Calculate weekly progress
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const weeklyStudyTime = user.studyTime
    .filter(st => new Date(st.date) >= weekAgo)
    .reduce((sum, st) => sum + st.minutes, 0);

  const weeklyTopicsCompleted = user.studyTime
    .filter(st => new Date(st.date) >= weekAgo)
    .reduce((sum, st) => sum + st.topicsCompleted, 0);

  const goal = user.weeklyGoal || {
    targetMinutes: 600,
    targetTopics: 5,
    weekStartDate: new Date(),
    lastUpdated: new Date()
  };

  const progressPercentage = goal.targetMinutes > 0
    ? Math.min(Math.round((weeklyStudyTime / goal.targetMinutes) * 100), 100)
    : 0;

  const topicsProgressPercentage = goal.targetTopics > 0
    ? Math.min(Math.round((weeklyTopicsCompleted / goal.targetTopics) * 100), 100)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      goal,
      progress: {
        minutesCompleted: weeklyStudyTime,
        topicsCompleted: weeklyTopicsCompleted,
        minutesPercentage: progressPercentage,
        topicsPercentage: topicsProgressPercentage
      }
    }
  });
}));

/**
 * @route   PUT /api/users/weekly-goal
 * @desc    Update weekly goal settings
 * @access  Private
 */
router.put('/weekly-goal', protect, asyncHandler(async (req, res) => {
  const { targetMinutes, targetTopics } = req.body;

  const updateData = {
    'weeklyGoal.lastUpdated': new Date()
  };

  if (targetMinutes !== undefined) {
    updateData['weeklyGoal.targetMinutes'] = Math.max(0, targetMinutes);
  }
  if (targetTopics !== undefined) {
    updateData['weeklyGoal.targetTopics'] = Math.max(0, targetTopics);
  }

  // Set week start date if not already set
  const user = await User.findById(req.user.id);
  if (!user.weeklyGoal?.weekStartDate) {
    updateData['weeklyGoal.weekStartDate'] = new Date();
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { $set: updateData },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Weekly goal updated successfully',
    data: updatedUser.weeklyGoal
  });
}));

/**
 * @route   GET /api/users/profile-completion
 * @desc    Calculate and return profile completion percentage
 * @access  Private
 */
router.get('/profile-completion', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('preferences.targetRole');

  const completion = user.getProfileCompletion();

  res.status(200).json({
    success: true,
    data: completion
  });
}));

/**
 * @route   GET /api/users/recent-activity
 * @desc    Get last 10 user activities
 * @access  Private
 */
router.get('/recent-activity', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap', 'title')
    .populate('enrolledRoadmaps.completedTopics.topic', 'title');

  const activities = [];

  // Add enrollment activities
  user.enrolledRoadmaps.forEach(enrollment => {
    if (enrollment.enrolledAt) {
      activities.push({
        type: 'enrollment',
        title: `Enrolled in ${enrollment.roadmap?.title || 'a roadmap'}`,
        date: enrollment.enrolledAt,
        icon: '🎓',
        roadmapId: enrollment.roadmap?._id
      });
    }

    // Add completed topic activities
    enrollment.completedTopics.forEach(ct => {
      if (ct.completedAt) {
        activities.push({
          type: 'topic_completed',
          title: `Completed "${ct.topic?.title || 'a topic'}"`,
          date: ct.completedAt,
          icon: '✅',
          topicId: ct.topic?._id,
          timeSpent: ct.timeSpent
        });
      }
    });
  });

  // Add badge activities
  user.badges.forEach(badge => {
    activities.push({
      type: 'badge_earned',
      title: 'Earned a new badge',
      date: badge.awardedAt,
      icon: '🏆',
      badgeId: badge.badge
    });
  });

  // Sort by date descending and take last 10
  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentActivities = activities.slice(0, 10);

  res.status(200).json({
    success: true,
    data: recentActivities
  });
}));

/**
 * @route   GET /api/users/next-action
 * @desc    Get AI-recommended next action based on progress
 * @access  Private
 */
router.get('/next-action', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'enrolledRoadmaps.roadmap',
      populate: { path: 'topics' }
    });

  let recommendation = {
    type: 'explore',
    title: 'Explore Roadmaps',
    description: 'Browse available learning paths to get started',
    action: 'View Roadmaps',
    link: '/roadmaps',
    icon: '🗺️',
    priority: 'medium'
  };

  // Check if user has no enrolled roadmaps
  if (!user.enrolledRoadmaps || user.enrolledRoadmaps.length === 0) {
    recommendation = {
      type: 'enroll',
      title: 'Start Your Learning Journey',
      description: 'Enroll in your first roadmap to begin learning',
      action: 'Browse Roadmaps',
      link: '/roadmaps',
      icon: '🚀',
      priority: 'high'
    };
  } else {
    // Find current roadmap
    const currentRoadmap = user.enrolledRoadmaps.find(r => r.status === 'current');

    if (currentRoadmap) {
      const totalTopics = currentRoadmap.roadmap?.topics?.length || 0;
      const completedCount = currentRoadmap.completedTopics?.length || 0;

      if (completedCount < totalTopics) {
        // Find next incomplete topic
        const completedTopicIds = new Set(
          currentRoadmap.completedTopics.map(ct => ct.topic?.toString())
        );

        const nextTopic = currentRoadmap.roadmap?.topics?.find(
          topic => !completedTopicIds.has(topic._id.toString())
        );

        if (nextTopic) {
          recommendation = {
            type: 'continue_learning',
            title: `Continue with "${nextTopic.title}"`,
            description: `Next topic in ${currentRoadmap.roadmap?.title}`,
            action: 'Start Topic',
            link: `/topics/${nextTopic._id}`,
            icon: '📚',
            priority: 'high',
            topicId: nextTopic._id,
            roadmapId: currentRoadmap.roadmap?._id
          };
        }
      } else {
        // Current roadmap completed
        recommendation = {
          type: 'practice',
          title: 'Practice Your Skills',
          description: 'Test your knowledge with mock interviews',
          action: 'Start Interview',
          link: '/ai/interviewer',
          icon: '🎯',
          priority: 'medium'
        };
      }
    }

    // Check if weekly goal is not set
    if (!user.weeklyGoal || !user.weeklyGoal.weekStartDate) {
      recommendation = {
        type: 'set_goal',
        title: 'Set Your Weekly Goal',
        description: 'Define your learning targets for the week',
        action: 'Set Goals',
        link: '/dashboard',
        icon: '🎯',
        priority: 'medium'
      };
    }
  }

  res.status(200).json({
    success: true,
    data: recommendation
  });
}));

/**
 * @route   GET /api/users/career-data
 * @desc    Get user career data
 * @access  Private
 */
router.get('/career-data', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('careerData');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user.careerData || {}
  });
}));

/**
 * @route   POST /api/users/verify-leetcode
 * @desc    Verify LeetCode username
 * @access  Private
 */
router.post('/verify-leetcode', protect, asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new ApiError('Username is required', 400);
  }

  const axios = require('axios');

  const query = `query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      profile { ranking }
      submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
    }
  }`;

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      { query, variables: { username } },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        timeout: 10000
      }
    );

    if (response.data?.data?.matchedUser) {
      const totalSolved = response.data.data.matchedUser.submitStatsGlobal?.acSubmissionNum?.find(
        item => item.difficulty === 'All'
      )?.count || 0;

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          username: response.data.data.matchedUser.username,
          totalSolved
        }
      });
    } else {
      res.status(404).json({
        success: false,
        data: { valid: false }
      });
    }
  } catch (error) {
    console.error('LeetCode verification error:', error.message);
    throw new ApiError('Failed to verify LeetCode username', 500);
  }
}));

/**
 * @route   POST /api/users/verify-github
 * @desc    Verify GitHub username
 * @access  Private
 */
router.post('/verify-github', protect, asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new ApiError('Username is required', 400);
  }

  const axios = require('axios');

  try {
    const response = await axios.get(`https://api.github.com/users/${username}`, {
      headers: {
        'User-Agent': 'SkillForge-AI',
        Accept: 'application/vnd.github+json'
      },
      timeout: 10000
    });

    if (response.data && response.data.login) {
      res.status(200).json({
        success: true,
        data: {
          valid: true,
          username: response.data.login,
          publicRepos: response.data.public_repos || 0,
          followers: response.data.followers || 0
        }
      });
    } else {
      res.status(404).json({
        success: false,
        data: { valid: false }
      });
    }
  } catch (error) {
    if (error.response?.status === 404) {
      res.status(404).json({
        success: false,
        data: { valid: false }
      });
    } else {
      console.error('GitHub verification error:', error.message);
      throw new ApiError('Failed to verify GitHub username', 500);
    }
  }
}));

/**
 * @route   GET /api/users/export
 * @desc    Export user data (privacy compliance)
 * @access  Private
 */
router.get('/export', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-password')
    .populate('preferences.targetRole')
    .populate('enrolledRoadmaps.roadmap', 'title');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    data: user
  });
}));

module.exports = router;
