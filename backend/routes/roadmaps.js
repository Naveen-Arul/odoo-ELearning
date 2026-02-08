/**
 * SkillForge AI - Roadmap Routes
 * Roadmap browsing, enrollment, and progress tracking
 */

const express = require('express');
const router = express.Router();
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const User = require('../models/User');
const TestAttempt = require('../models/TestAttempt');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');
const { roadmapValidation, objectIdValidation } = require('../middleware/validation');
const { getIO } = require('../config/socket');
const emailService = require('../services/emailService');

/**
 * @route   GET /api/roadmaps/recommended/for-me
 * @desc    Get roadmaps based on user's target role
 * @access  Private
 */
router.get('/recommended/for-me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('preferences.targetRole');

  // If user hasn't set a target role, return all roadmaps
  if (!user.preferences.targetRole) {
    const query = { isPublished: true, isActive: true };
    const roadmaps = await Roadmap.find(query)
      .populate('role', 'name slug icon')
      .sort({ 'stats.enrollmentCount': -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      data: roadmaps,
      message: 'No target role selected. Showing popular roadmaps.'
    });
  }

  // Get roadmaps for user's target role
  const roadmaps = await Roadmap.find({
    role: user.preferences.targetRole._id,
    isPublished: true,
    isActive: true
  })
    .populate('role', 'name slug icon')
    .sort({ skillLevel: 1, 'stats.enrollmentCount': -1 });

  res.status(200).json({
    success: true,
    data: roadmaps,
    roleInfo: {
      roleId: user.preferences.targetRole._id,
      roleName: user.preferences.targetRole.name
    }
  });
}));

/**
 * @route   GET /api/roadmaps
 * @desc    Get all published roadmaps
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const { role, skillLevel, search, page = 1, limit = 10 } = req.query;

  const query = { isPublished: true, isActive: true };

  if (role) query.role = role;
  if (skillLevel) query.skillLevel = skillLevel;
  if (search) {
    query.$or = [
      { title: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { tags: new RegExp(search, 'i') }
    ];
  }

  const roadmaps = await Roadmap.find(query)
    .populate('role', 'name slug icon')
    .sort({ 'stats.enrollmentCount': -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Roadmap.countDocuments(query);

  res.status(200).json({
    success: true,
    data: roadmaps,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   GET /api/roadmaps/:id
 * @desc    Get single roadmap with topics
 * @access  Public
 */
router.get('/:id', objectIdValidation('id'), asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id)
    .populate('role')
    .populate({
      path: 'topics',
      select: 'title slug description estimatedDuration difficulty order',
      options: { sort: { order: 1 } }
    })
    .populate('prerequisites', 'title slug');

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  res.status(200).json({
    success: true,
    data: roadmap
  });
}));

/**
 * @route   POST /api/roadmaps/:id/review
 * @desc    Submit or update a course completion review
 * @access  Private
 */
router.post('/:id/review', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const roadmap = await Roadmap.findById(req.params.id);
  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  const user = await User.findById(req.user.id);
  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === roadmap._id.toString()
  );

  if (!enrollment || (enrollment.progress || 0) < 100) {
    throw new ApiError('Complete the course before leaving a review', 400);
  }

  const numericRating = Number(rating);
  if (!numericRating || numericRating < 1 || numericRating > 5) {
    throw new ApiError('Rating must be between 1 and 5', 400);
  }

  const existing = roadmap.reviews.find(r => r.user?.toString() === req.user.id);
  if (existing) {
    existing.rating = numericRating;
    existing.comment = comment || '';
    existing.createdAt = new Date();
  } else {
    roadmap.reviews.push({
      user: req.user.id,
      rating: numericRating,
      comment: comment || ''
    });
  }

  const totalRatings = roadmap.reviews.length;
  const averageRating = totalRatings
    ? roadmap.reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings
    : 0;

  roadmap.stats.totalRatings = totalRatings;
  roadmap.stats.averageRating = Number(averageRating.toFixed(2));

  await roadmap.save();

  res.status(200).json({
    success: true,
    message: 'Review submitted',
    data: {
      averageRating: roadmap.stats.averageRating,
      totalRatings: roadmap.stats.totalRatings
    }
  });
}));

/**
 * @route   POST /api/roadmaps/:id/enroll
 * @desc    Enroll in a roadmap
 * @access  Private
 */
router.post('/:id/enroll', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id);

  if (!roadmap || !roadmap.isPublished) {
    throw new ApiError('Roadmap not found', 404);
  }

  const user = await User.findById(req.user.id);

  // Check if already enrolled
  const existingEnrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === req.params.id
  );

  if (existingEnrollment) {
    throw new ApiError('Already enrolled in this roadmap', 400);
  }

  // Check enrollment limit (max 3 active roadmaps)
  if (!user.canEnrollNewRoadmap()) {
    throw new ApiError('Maximum 3 active roadmaps allowed. Complete or unenroll from an existing roadmap.', 400);
  }

  // Check prerequisites
  if (roadmap.prerequisites && roadmap.prerequisites.length > 0) {
    const completedRoadmaps = user.enrolledRoadmaps
      .filter(er => er.status === 'completed')
      .map(er => er.roadmap.toString());

    const missingPrereqs = roadmap.prerequisites.filter(
      prereq => !completedRoadmaps.includes(prereq.toString())
    );

    if (missingPrereqs.length > 0) {
      throw new ApiError('Prerequisites not completed', 400);
    }
  }

  // Determine status (first enrollment is current, rest are active)
  const hasCurrentRoadmap = user.enrolledRoadmaps.some(er => er.status === 'current');
  const status = hasCurrentRoadmap ? 'active' : 'current';

  // Add enrollment
  user.enrolledRoadmaps.push({
    roadmap: roadmap._id,
    status,
    enrolledAt: new Date(),
    progress: 0,
    completedTopics: []
  });

  await user.save();

  // Update roadmap stats
  roadmap.stats.enrollmentCount += 1;
  await roadmap.save();

  // Notify clients
  try {
    const io = getIO();
    io.emit('roadmap_stats_updated', {
      roadmapId: roadmap._id,
      stats: roadmap.stats
    });
  } catch (error) {
    console.error('Socket emission failed:', error);
  }

  // Send enrollment email
  try {
    console.log(`📧 Attempting to send enrollment email to ${user.email} for roadmap: ${roadmap.title}`);
    await emailService.sendCourseEnrollmentEmail(user, roadmap);
    console.log(`✅ Enrollment email sent successfully to ${user.email}`);
  } catch (error) {
    console.error(`❌ Failed to send enrollment email to ${user.email}:`, error.message);
    // Don't fail the request, but log clearly for debugging
  }

  // Auto-generate study plan for today if this is their current roadmap
  if (status === 'current') {
    try {
      const DailyStudyPlan = require('../models/DailyStudyPlan');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if plan already exists for today
      const existingPlan = await DailyStudyPlan.findOne({
        user: user._id,
        date: today
      });

      // Generate plan if none exists
      if (!existingPlan) {
        const { generateDailyPlan } = require('./studyPlan');
        await generateDailyPlan(user._id, today);
        console.log(`✅ Auto-generated study plan for user ${user._id}`);
      }
    } catch (error) {
      console.error('Failed to generate study plan:', error);
      // Don't fail the enrollment if plan generation fails
    }
  }

  res.status(200).json({
    success: true,
    message: `Successfully enrolled in ${roadmap.title}`,
    data: {
      roadmap: roadmap._id,
      status
    }
  });
}));

/**
 * @route   PUT /api/roadmaps/:id/set-current
 * @desc    Set a roadmap as current
 * @access  Private
 */
router.put('/:id/set-current', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === req.params.id
  );

  if (!enrollment) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  if (enrollment.status === 'completed') {
    throw new ApiError('Cannot set completed roadmap as current', 400);
  }

  // Set all others to active, this one to current
  user.enrolledRoadmaps.forEach(er => {
    if (er.roadmap.toString() === req.params.id) {
      er.status = 'current';
    } else if (er.status === 'current') {
      er.status = 'active';
    }
  });

  await user.save();

  // Regenerate study plan for today with the new current roadmap
  try {
    const DailyStudyPlan = require('../models/DailyStudyPlan');
    const { generateDailyPlan } = require('./studyPlan');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Delete existing plan for today
    await DailyStudyPlan.deleteOne({ user: user._id, date: today });

    // Generate new plan with the new current roadmap
    await generateDailyPlan(user._id, today);
    console.log(`✅ Regenerated study plan with new current roadmap for user ${user._id}`);
  } catch (error) {
    console.error('Failed to regenerate study plan:', error);
    // Don't fail the operation if plan generation fails
  }

  res.status(200).json({
    success: true,
    message: 'Roadmap set as current'
  });
}));

/**
 * @route   DELETE /api/roadmaps/:id/unenroll
 * @desc    Unenroll from a roadmap
 * @access  Private
 */
router.delete('/:id/unenroll', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  const enrollmentIndex = user.enrolledRoadmaps.findIndex(
    er => er.roadmap.toString() === req.params.id
  );

  if (enrollmentIndex === -1) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  user.enrolledRoadmaps.splice(enrollmentIndex, 1);
  await user.save();

  // Decrement roadmap enrollment count
  const roadmap = await Roadmap.findById(req.params.id);
  if (roadmap) {
    roadmap.stats.enrollmentCount = Math.max(0, roadmap.stats.enrollmentCount - 1);
    await roadmap.save();

    // Notify clients
    try {
      const io = getIO();
      io.emit('roadmap_stats_updated', {
        roadmapId: roadmap._id,
        stats: roadmap.stats
      });
    } catch (error) {
      console.error('Socket emission failed:', error);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Successfully unenrolled from roadmap'
  });
}));

/**
 * @route   GET /api/roadmaps/:id/progress
 * @desc    Get user's progress in a roadmap
 * @access  Private
 */
router.get('/:id/progress', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const roadmap = await Roadmap.findById(req.params.id)
    .populate({
      path: 'topics',
      select: 'title slug estimatedDuration order',
      options: { sort: { order: 1 } }
    });

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === req.params.id
  );

  if (!enrollment) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  // Get test attempts for topics
  const testAttempts = await TestAttempt.find({
    user: req.user.id,
    roadmap: req.params.id,
    status: 'completed'
  }).select('topic score.passed score.percentage');

  // Build topic progress
  const topicProgress = roadmap.topics.map(topic => {
    const completed = enrollment.completedTopics.find(
      ct => ct.topic.toString() === topic._id.toString()
    );
    const bestAttempt = testAttempts.find(
      ta => ta.topic.toString() === topic._id.toString() && ta.score.passed
    );

    return {
      topic: topic,
      completed: !!completed,
      completedAt: completed?.completedAt,
      timeSpent: completed?.timeSpent || 0,
      testPassed: !!bestAttempt,
      testScore: bestAttempt?.score?.percentage || null
    };
  });

  res.status(200).json({
    success: true,
    data: {
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title,
        totalTopics: roadmap.topics.length
      },
      enrollment: {
        status: enrollment.status,
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt
      },
      topicProgress,
      completedCount: enrollment.completedTopics.length,
      totalTimeSpent: enrollment.completedTopics.reduce((sum, ct) => sum + (ct.timeSpent || 0), 0)
    }
  });
}));

/**
 * @route   GET /api/roadmaps/:id/adaptive-path
 * @desc    Get adaptive learning diagnostics and next topic recommendation
 * @access  Private
 */
router.get('/:id/adaptive-path', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id)
    .populate({ path: 'topics', select: 'title slug description estimatedDuration order' });

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  const user = await User.findById(req.user.id);
  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === req.params.id
  );

  if (!enrollment) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  const masteryThreshold = roadmap.testConfig?.passingPercentage || 70;
  const completedTopicIds = enrollment.completedTopics.map(ct => ct.topic.toString());

  const attempts = await TestAttempt.find({
    user: req.user.id,
    roadmap: req.params.id,
    status: 'completed'
  }).select('topic score.percentage score.passed timing.startedAt');

  const bestByTopic = attempts.reduce((acc, attempt) => {
    const topicId = attempt.topic.toString();
    const score = attempt.score?.percentage || 0;
    if (!acc[topicId] || score > acc[topicId].score) {
      acc[topicId] = {
        score,
        passed: !!attempt.score?.passed,
        lastAttemptedAt: attempt.timing?.startedAt || null
      };
    }
    return acc;
  }, {});

  const sortedTopics = [...(roadmap.topics || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const diagnostics = sortedTopics.map((topic) => {
    const topicId = topic._id.toString();
    const attempt = bestByTopic[topicId];
    const masteryScore = attempt?.score || 0;
    const mastered = attempt?.passed || masteryScore >= masteryThreshold || completedTopicIds.includes(topicId);

    let status = 'not-started';
    if (mastered) {
      status = 'mastered';
    } else if (attempt) {
      status = 'in-progress';
    }

    return {
      topic,
      masteryScore,
      mastered,
      status,
      lastAttemptedAt: attempt?.lastAttemptedAt || null
    };
  });

  let recommendedNext = null;
  for (let i = 0; i < diagnostics.length; i += 1) {
    const current = diagnostics[i];
    const prev = diagnostics[i - 1];
    const prevMastered = i === 0 ? true : prev?.mastered;
    if (!current.mastered && prevMastered) {
      recommendedNext = current;
      break;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      masteryThreshold,
      totalTopics: diagnostics.length,
      masteredCount: diagnostics.filter(d => d.mastered).length,
      recommendedNext,
      diagnostics
    }
  });
}));

/**
 * @route   GET /api/roadmaps/enrolled/my
 * @desc    Get user's enrolled roadmaps
 * @access  Private
 */
router.get('/enrolled/my', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'enrolledRoadmaps.roadmap',
      populate: [
        { path: 'role', select: 'name' },
        {
          path: 'topics',
          select: 'title slug description order',
          options: { sort: { order: 1 } }
        }
      ]
    });

  const enrolledRoadmaps = user.enrolledRoadmaps.map(er => ({
    ...er.toObject(),
    completedTopicsCount: er.completedTopics.length
  }));

  res.status(200).json({
    success: true,
    data: enrolledRoadmaps
  });
}));

module.exports = router;
