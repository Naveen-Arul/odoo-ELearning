/**
 * SkillForge AI - Topics Routes
 * Topic content, video playback, and progress tracking
 */

const express = require('express');
const router = express.Router();
const Topic = require('../models/Topic');
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const TimeTrackingSession = require('../models/TimeTrackingSession');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, optionalAuth } = require('../middleware/auth');
const { objectIdValidation } = require('../middleware/validation');

/**
 * @route   GET /api/topics/:id
 * @desc    Get topic details
 * @access  Public (with optional auth for progress)
 */
router.get('/:id', optionalAuth, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id)
    .populate('relatedTopics', 'title slug');

  if (!topic || !topic.isActive) {
    throw new ApiError('Topic not found', 404);
  }

  // Increment view count
  topic.stats.viewCount += 1;
  await topic.save();

  // Get user progress if authenticated
  let userProgress = null;
  if (req.user) {
    const user = await User.findById(req.user.id);

    // Find topic in any enrolled roadmap
    for (const enrollment of user.enrolledRoadmaps) {
      const completed = enrollment.completedTopics.find(
        ct => ct.topic.toString() === topic._id.toString()
      );
      if (completed) {
        userProgress = {
          completed: true,
          completedAt: completed.completedAt,
          timeSpent: completed.timeSpent,
          testScore: completed.testScore
        };
        break;
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      topic,
      userProgress
    }
  });
}));

/**
 * @route   GET /api/topics/:id/video
 * @desc    Get topic video based on user's preferred language
 * @access  Private
 */
router.get('/:id/video', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const user = await User.findById(req.user.id);
  const preferredLanguage = user.preferences.preferredLanguage || 'english';

  const video = topic.getVideo(preferredLanguage);

  res.status(200).json({
    success: true,
    data: {
      video,
      preferredLanguage,
      availableLanguages: {
        english: !!topic.videoLinks.english?.url,
        tamil: !!topic.videoLinks.tamil?.url,
        hindi: !!topic.videoLinks.hindi?.url
      }
    }
  });
}));

/**
 * @route   POST /api/topics/:id/start-session
 * @desc    Start a time tracking session for a topic
 * @access  Private
 */
router.post('/:id/start-session', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { roadmapId, activityType = 'watching-video' } = req.body;

  const topic = await Topic.findById(req.params.id);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  // End any active session for this user
  await TimeTrackingSession.updateMany(
    { user: req.user.id, status: 'active' },
    {
      $set: {
        status: 'abandoned',
        endTime: new Date()
      }
    }
  );

  // Create new session
  const session = await TimeTrackingSession.create({
    user: req.user.id,
    contentType: 'roadmap-topic',
    topic: topic._id,
    roadmap: roadmapId,
    activityType,
    startTime: new Date(),
    status: 'active'
  });

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      startTime: session.startTime
    }
  });
}));

/**
 * @route   POST /api/topics/:id/pause-session
 * @desc    Pause current session (tab change/page exit)
 * @access  Private
 */
router.post('/:id/pause-session', protect, asyncHandler(async (req, res) => {
  const { sessionId, reason = 'manual' } = req.body;

  const session = await TimeTrackingSession.findOne({
    _id: sessionId,
    user: req.user.id,
    status: 'active'
  });

  if (!session) {
    throw new ApiError('Active session not found', 404);
  }

  session.pause(reason);
  await session.save();

  res.status(200).json({
    success: true,
    message: 'Session paused'
  });
}));

/**
 * @route   POST /api/topics/:id/resume-session
 * @desc    Resume paused session
 * @access  Private
 */
router.post('/:id/resume-session', protect, asyncHandler(async (req, res) => {
  const { sessionId } = req.body;

  const session = await TimeTrackingSession.findOne({
    _id: sessionId,
    user: req.user.id,
    status: 'paused'
  });

  if (!session) {
    throw new ApiError('Paused session not found', 404);
  }

  session.resume();
  await session.save();

  res.status(200).json({
    success: true,
    message: 'Session resumed'
  });
}));

/**
 * @route   POST /api/topics/:id/end-session
 * @desc    End a time tracking session
 * @access  Private
 */
router.post('/:id/end-session', protect, asyncHandler(async (req, res) => {
  const { sessionId, completed = true } = req.body;

  const session = await TimeTrackingSession.findOne({
    _id: sessionId,
    user: req.user.id
  });

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  session.end(completed);
  await session.save();

  // Update user's daily study time
  const user = await User.findById(req.user.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayRecord = user.studyTime.find(st => {
    const stDate = new Date(st.date);
    stDate.setHours(0, 0, 0, 0);
    return stDate.getTime() === today.getTime();
  });

  if (!todayRecord) {
    user.studyTime.push({
      date: today,
      minutes: session.duration,
      topicsCompleted: 0,
      sessions: [{
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        topicId: session.topic
      }]
    });
  } else {
    todayRecord.minutes += session.duration;
    todayRecord.sessions.push({
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      topicId: session.topic
    });
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      duration: session.duration,
      totalPauseTime: session.totalPauseTime
    }
  });
}));

/**
 * @route   POST /api/topics/:id/complete
 * @desc    Mark topic as complete (for language learning - no test required)
 * @access  Private
 */
router.post('/:id/complete', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { roadmapId, timeSpent } = req.body;

  const topic = await Topic.findById(req.params.id);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  if (!roadmapId) {
    // This is for language learning topics
    throw new ApiError('Use language topic completion endpoint', 400);
  }

  const user = await User.findById(req.user.id);
  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === roadmapId
  );

  if (!enrollment) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  // Check if already completed
  const alreadyCompleted = enrollment.completedTopics.find(
    ct => ct.topic.toString() === topic._id.toString()
  );

  if (alreadyCompleted) {
    throw new ApiError('Topic already completed', 400);
  }

  // Add to completed topics
  enrollment.completedTopics.push({
    topic: topic._id,
    completedAt: new Date(),
    timeSpent: timeSpent || 0
  });

  // Update progress
  const roadmap = await Roadmap.findById(roadmapId);
  enrollment.progress = Math.round(
    (enrollment.completedTopics.length / roadmap.topics.length) * 100
  );

  // Check if roadmap completed
  if (enrollment.progress === 100) {
    enrollment.status = 'completed';
    enrollment.completedAt = new Date();
    roadmap.stats.completionCount += 1;
    await roadmap.save();
  }

  // Update user's daily stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let todayRecord = user.studyTime.find(st => {
    const stDate = new Date(st.date);
    stDate.setHours(0, 0, 0, 0);
    return stDate.getTime() === today.getTime();
  });

  if (todayRecord) {
    todayRecord.topicsCompleted += 1;
  }

  // Update topic stats
  topic.stats.completionCount += 1;
  await topic.save();

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Topic completed successfully',
    data: {
      progress: enrollment.progress,
      roadmapCompleted: enrollment.status === 'completed'
    }
  });
}));

/**
 * @route   GET /api/topics/roadmap/:roadmapId
 * @desc    Get all topics for a roadmap with user progress
 * @access  Private
 */
router.get('/roadmap/:roadmapId', protect, asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.roadmapId)
    .populate({
      path: 'topics',
      select: 'title slug description estimatedDuration difficulty order objectives'
    });

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  const user = await User.findById(req.user.id);
  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === req.params.roadmapId
  );

  const topics = roadmap.topics.map(topic => {
    const completed = enrollment?.completedTopics.find(
      ct => ct.topic.toString() === topic._id.toString()
    );

    return {
      ...topic.toObject(),
      userProgress: {
        completed: !!completed,
        completedAt: completed?.completedAt,
        timeSpent: completed?.timeSpent,
        testScore: completed?.testScore
      }
    };
  });

  res.status(200).json({
    success: true,
    data: {
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title
      },
      topics,
      isEnrolled: !!enrollment
    }
  });
}));

module.exports = router;
