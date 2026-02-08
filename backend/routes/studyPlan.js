/**
 * SkillForge AI - Daily Study Plan Routes
 * Adaptive daily learning schedule management
 */

const express = require('express');
const router = express.Router();
const DailyStudyPlan = require('../models/DailyStudyPlan');
const User = require('../models/User');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/study-plan/today
 * @desc    Get today's study plan
 * @access  Private
 */
router.get('/today', protect, asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let plan = await DailyStudyPlan.findOne({ user: req.user.id, date: today })
    .populate('roadmap', 'title slug')
    .populate('assignedTopics.topic', 'title slug estimatedDuration')
    .populate('languageTopics.topic', 'title slug estimatedDuration');

  if (!plan) {
    // Generate new plan
    plan = await generateDailyPlan(req.user.id);
  }

  res.status(200).json({
    success: true,
    data: plan
  });
}));

/**
 * @route   POST /api/study-plan/generate
 * @desc    Manually generate/regenerate daily plan
 * @access  Private
 */
router.post('/generate', protect, asyncHandler(async (req, res) => {
  const { date } = req.body;
  const targetDate = date ? new Date(date) : new Date();
  targetDate.setHours(0, 0, 0, 0);

  // Remove existing plan for this date
  await DailyStudyPlan.deleteOne({ user: req.user.id, date: targetDate });

  // Generate new plan
  const plan = await generateDailyPlan(req.user.id, targetDate);

  res.status(201).json({
    success: true,
    message: 'Daily study plan generated',
    data: plan
  });
}));

/**
 * @route   PUT /api/study-plan/topic/:topicId/status
 * @desc    Update topic status in daily plan
 * @access  Private
 */
router.put('/topic/:topicId/status', protect, asyncHandler(async (req, res) => {
  const { status, actualTimeSpent } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plan = await DailyStudyPlan.findOne({ user: req.user.id, date: today });

  if (!plan) {
    throw new ApiError('No study plan for today', 404);
  }

  // Find topic in assigned topics
  let topicEntry = plan.assignedTopics.find(
    t => t.topic.toString() === req.params.topicId
  );

  if (!topicEntry) {
    // Check language topics
    topicEntry = plan.languageTopics.find(
      t => t.topic.toString() === req.params.topicId
    );
  }

  if (!topicEntry) {
    throw new ApiError('Topic not found in today\'s plan', 404);
  }

  // Update status
  topicEntry.status = status;
  if (status === 'completed') {
    topicEntry.completedAt = new Date();
    topicEntry.actualTimeSpent = actualTimeSpent || topicEntry.estimatedDuration;
  }

  // Recalculate stats
  plan.updateStats();
  await plan.save();

  res.status(200).json({
    success: true,
    data: plan.summary
  });
}));

/**
 * @route   GET /api/study-plan/history
 * @desc    Get study plan history
 * @access  Private
 */
router.get('/history', protect, asyncHandler(async (req, res) => {
  const { startDate, endDate, limit = 30 } = req.query;

  const query = { user: req.user.id };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const plans = await DailyStudyPlan.find(query)
    .select('date summary status')
    .sort({ date: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: plans
  });
}));

/**
 * @route   GET /api/study-plan/stats
 * @desc    Get study plan statistics
 * @access  Private
 */
router.get('/stats', protect, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  const plans = await DailyStudyPlan.find({
    user: req.user.id,
    date: { $gte: startDate }
  });

  const stats = {
    totalDays: plans.length,
    completedDays: plans.filter(p => p.status === 'completed').length,
    partialDays: plans.filter(p => p.status === 'partial').length,
    missedDays: plans.filter(p => p.status === 'missed').length,
    averageCompletion: plans.length > 0
      ? Math.round(plans.reduce((sum, p) => sum + p.summary.completionPercentage, 0) / plans.length)
      : 0,
    totalTopicsCompleted: plans.reduce((sum, p) => sum + p.summary.completedTopics, 0),
    totalMinutesStudied: plans.reduce((sum, p) => sum + p.summary.actualMinutesSpent, 0)
  };

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * Helper function to generate daily study plan
 */
async function generateDailyPlan(userId, date = new Date()) {
  date.setHours(0, 0, 0, 0);

  const user = await User.findById(userId)
    .populate('enrolledRoadmaps.roadmap');

  // Get daily available time in minutes
  const dailyMinutes = (user.preferences.dailyStudyTime || 2) * 60;

  // Get current roadmap
  const currentEnrollment = user.enrolledRoadmaps.find(er => er.status === 'current');

  const assignedTopics = [];
  let remainingTime = dailyMinutes;

  if (currentEnrollment) {
    const roadmap = await Roadmap.findById(currentEnrollment.roadmap._id)
      .populate('topics');

    // Get completed topic IDs
    const completedTopicIds = currentEnrollment.completedTopics.map(
      ct => ct.topic.toString()
    );

    // Check for rolled over topics from yesterday
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayPlan = await DailyStudyPlan.findOne({
      user: userId,
      date: yesterday
    });

    if (yesterdayPlan) {
      // Roll over incomplete topics
      const incompletTopics = yesterdayPlan.assignedTopics.filter(
        t => t.status !== 'completed' && t.status !== 'skipped'
      );

      for (const topic of incompletTopics) {
        if (remainingTime <= 0) break;

        const topicData = await Topic.findById(topic.topic);
        if (topicData && remainingTime >= topicData.estimatedDuration) {
          assignedTopics.push({
            topic: topic.topic,
            estimatedDuration: topicData.estimatedDuration,
            priority: 1, // Higher priority for rolled over
            status: 'pending',
            isRolledOver: true,
            rolledOverFrom: yesterday
          });
          remainingTime -= topicData.estimatedDuration;
        }
      }
    }

    // Add pending topics from roadmap
    const pendingTopics = roadmap.topics.filter(
      t => !completedTopicIds.includes(t._id.toString())
    );

    for (const topic of pendingTopics) {
      if (remainingTime <= 0) break;

      // Skip if already added as rolled over
      if (assignedTopics.some(at => at.topic.toString() === topic._id.toString())) {
        continue;
      }

      if (remainingTime >= topic.estimatedDuration) {
        assignedTopics.push({
          topic: topic._id,
          estimatedDuration: topic.estimatedDuration,
          priority: assignedTopics.length + 1,
          status: 'pending'
        });
        remainingTime -= topic.estimatedDuration;
      }
    }
  }

  // Generate AI suggestions based on progress
  const aiSuggestions = [];

  if (assignedTopics.length === 0) {
    aiSuggestions.push({
      message: 'Consider enrolling in a roadmap to get personalized study plans!',
      type: 'tip'
    });
  } else if (assignedTopics.some(t => t.isRolledOver)) {
    aiSuggestions.push({
      message: 'You have some topics from yesterday. Try to complete them first!',
      type: 'reminder'
    });
  }

  // Create and save plan
  const plan = await DailyStudyPlan.create({
    user: userId,
    date,
    roadmap: currentEnrollment?.roadmap._id,
    plannedTime: dailyMinutes - remainingTime,
    assignedTopics,
    languageTopics: [],
    summary: {
      totalTopics: assignedTopics.length,
      completedTopics: 0,
      totalPlannedMinutes: dailyMinutes - remainingTime,
      actualMinutesSpent: 0,
      completionPercentage: 0
    },
    status: 'pending',
    aiSuggestions,
    generatedAt: new Date()
  });

  // Populate and return
  return await DailyStudyPlan.findById(plan._id)
    .populate('roadmap', 'title slug')
    .populate('assignedTopics.topic', 'title slug estimatedDuration');
}

module.exports = router;
module.exports.generateDailyPlan = generateDailyPlan;
