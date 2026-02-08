/**
 * SkillForge AI - Programming Languages Routes
 * Learn Languages section - separate from roadmaps
 */

const express = require('express');
const router = express.Router();
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const LanguageTopic = require('../models/LanguageTopic');
const User = require('../models/User');
const TimeTrackingSession = require('../models/TimeTrackingSession');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, optionalAuth } = require('../middleware/auth');
const { objectIdValidation } = require('../middleware/validation');

/**
 * @route   GET /api/languages
 * @desc    Get all programming languages
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const languages = await ProgrammingLanguage.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'languagetopics',
        let: { languageId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$language', '$$languageId'] },
              isActive: true
            }
          },
          { $project: { _id: 1 } }
        ],
        as: 'topics'
      }
    },
    {
      $addFields: {
        topicsCount: { $size: '$topics' }
      }
    },
    {
      $project: {
        name: 1,
        slug: 1,
        description: 1,
        icon: 1,
        logo: 1,
        color: 1,
        'stats.learnerCount': 1,
        useCases: 1,
        topicsCount: 1
      }
    },
    { $sort: { 'stats.learnerCount': -1 } }
  ]);

  res.status(200).json({
    success: true,
    count: languages.length,
    data: languages
  });
}));

/**
 * @route   GET /api/languages/:id
 * @desc    Get single programming language with topics
 * @access  Public
 */
router.get('/:id', optionalAuth, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const language = await ProgrammingLanguage.findById(req.params.id)
    .populate({
      path: 'levels.beginner',
      select: 'title slug description estimatedDuration order',
      options: { sort: { order: 1 } }
    })
    .populate({
      path: 'levels.intermediate',
      select: 'title slug description estimatedDuration order',
      options: { sort: { order: 1 } }
    })
    .populate({
      path: 'levels.advanced',
      select: 'title slug description estimatedDuration order',
      options: { sort: { order: 1 } }
    })
    .populate('relatedLanguages', 'name slug icon');

  if (!language || !language.isActive) {
    throw new ApiError('Programming language not found', 404);
  }

  // Get user progress if authenticated
  let userProgress = null;
  if (req.user) {
    const user = await User.findById(req.user.id);
    const learning = user.languageLearning.find(
      ll => ll.language.toString() === language._id.toString()
    );

    if (learning) {
      userProgress = {
        level: learning.level,
        progress: learning.progress,
        completedTopics: learning.completedTopics.map(ct => ct.topic.toString())
      };
    }
  }

  res.status(200).json({
    success: true,
    data: {
      language,
      userProgress
    }
  });
}));

/**
 * @route   POST /api/languages/:id/start
 * @desc    Start learning a programming language
 * @access  Private
 */
router.post('/:id/start', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { level = 'beginner' } = req.body;

  const language = await ProgrammingLanguage.findById(req.params.id);
  if (!language) {
    throw new ApiError('Programming language not found', 404);
  }

  const user = await User.findById(req.user.id);

  // Check if already learning this language
  const existingLearning = user.languageLearning.find(
    ll => ll.language.toString() === language._id.toString()
  );

  if (existingLearning) {
    throw new ApiError('Already learning this language', 400);
  }

  // Add to language learning
  user.languageLearning.push({
    language: language._id,
    level,
    completedTopics: [],
    progress: 0
  });

  await user.save();

  // Update language stats
  language.stats.learnerCount += 1;
  await language.save();

  res.status(200).json({
    success: true,
    message: `Started learning ${language.name}`
  });
}));

/**
 * @route   GET /api/languages/:id/topics
 * @desc    Get topics for a language by level
 * @access  Public (with optional auth)
 */
router.get('/:id/topics', optionalAuth, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { level } = req.query;

  const query = { language: req.params.id, isActive: true };
  if (level) {
    query.level = level;
  }

  const topics = await LanguageTopic.find(query)
    .select('title slug description level estimatedDuration order keyConcepts videoLinks')
    .sort({ level: 1, order: 1 });

  // Get user progress if authenticated
  let completedTopicIds = [];
  if (req.user) {
    const user = await User.findById(req.user.id);
    const learning = user.languageLearning.find(
      ll => ll.language.toString() === req.params.id
    );
    if (learning) {
      completedTopicIds = learning.completedTopics.map(ct => ct.topic.toString());
    }
  }

  const topicsWithProgress = topics.map(topic => ({
    ...topic.toObject(),
    completed: completedTopicIds.includes(topic._id.toString())
  }));

  res.status(200).json({
    success: true,
    data: topicsWithProgress
  });
}));

/**
 * @route   GET /api/languages/topics/:topicId
 * @desc    Get single language topic
 * @access  Public
 */
router.get('/topics/:topicId', optionalAuth, asyncHandler(async (req, res) => {
  const topic = await LanguageTopic.findById(req.params.topicId)
    .populate('language', 'name slug');

  if (!topic || !topic.isActive) {
    throw new ApiError('Topic not found', 404);
  }

  // Increment view count
  topic.stats.viewCount += 1;
  await topic.save();

  res.status(200).json({
    success: true,
    data: topic
  });
}));

/**
 * @route   POST /api/languages/topics/:topicId/complete
 * @desc    Mark language topic as complete
 * @access  Private
 */
router.post('/topics/:topicId/complete', protect, asyncHandler(async (req, res) => {
  const { timeSpent } = req.body;

  const topic = await LanguageTopic.findById(req.params.topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const user = await User.findById(req.user.id);
  let learning = user.languageLearning.find(
    ll => ll.language.toString() === topic.language.toString()
  );

  // Auto-start learning if not already
  if (!learning) {
    user.languageLearning.push({
      language: topic.language,
      level: topic.level,
      completedTopics: [],
      progress: 0
    });
    learning = user.languageLearning[user.languageLearning.length - 1];

    // Update language stats
    await ProgrammingLanguage.findByIdAndUpdate(
      topic.language,
      { $inc: { 'stats.learnerCount': 1 } }
    );
  }

  // Check if already completed
  const alreadyCompleted = learning.completedTopics.find(
    ct => ct.topic.toString() === topic._id.toString()
  );

  if (alreadyCompleted) {
    throw new ApiError('Topic already completed', 400);
  }

  // Add to completed topics
  learning.completedTopics.push({
    topic: topic._id,
    completedAt: new Date(),
    timeSpent: timeSpent || 0
  });

  // Calculate progress
  const language = await ProgrammingLanguage.findById(topic.language);
  const totalTopics =
    (language.levels.beginner?.length || 0) +
    (language.levels.intermediate?.length || 0) +
    (language.levels.advanced?.length || 0);

  learning.progress = Math.round(
    (learning.completedTopics.length / totalTopics) * 100
  );

  // Update topic stats
  topic.stats.completionCount += 1;
  await topic.save();

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Topic completed',
    data: {
      progress: learning.progress,
      completedCount: learning.completedTopics.length,
      totalTopics
    }
  });
}));

/**
 * @route   POST /api/languages/topics/:topicId/start-session
 * @desc    Start a time tracking session for language topic
 * @access  Private
 */
router.post('/topics/:topicId/start-session', protect, asyncHandler(async (req, res) => {
  const { activityType = 'watching-video' } = req.body;

  const topic = await LanguageTopic.findById(req.params.topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  // End any active session
  await TimeTrackingSession.updateMany(
    { user: req.user.id, status: 'active' },
    { $set: { status: 'abandoned', endTime: new Date() } }
  );

  // Create new session
  const session = await TimeTrackingSession.create({
    user: req.user.id,
    contentType: 'language-topic',
    topic: topic._id,
    language: topic.language,
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
 * @route   GET /api/languages/my/progress
 * @desc    Get user's language learning progress
 * @access  Private
 */
router.get('/my/progress', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'languageLearning.language',
      select: 'name slug icon color'
    });

  const progress = user.languageLearning.map(ll => ({
    language: ll.language,
    level: ll.level,
    progress: ll.progress,
    completedTopicsCount: ll.completedTopics.length,
    lastStudied: ll.completedTopics.length > 0
      ? ll.completedTopics[ll.completedTopics.length - 1].completedAt
      : null
  }));

  res.status(200).json({
    success: true,
    data: progress
  });
}));

module.exports = router;
