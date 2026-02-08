/**
 * SkillForge AI - Test Routes
 * Video-based testing and assessment
 */

const express = require('express');
const router = express.Router();
const TestAttempt = require('../models/TestAttempt');
const Topic = require('../models/Topic');
const Roadmap = require('../models/Roadmap');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/tests/start
 * @desc    Start a new test for a topic
 * @access  Private
 */
router.post('/start', protect, asyncHandler(async (req, res) => {
  const { topicId, roadmapId } = req.body;

  const topic = await Topic.findById(topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const resolvedRoadmapId = roadmapId || topic.roadmap?.toString();
  if (!resolvedRoadmapId) {
    throw new ApiError('Roadmap not found', 404);
  }

  const roadmap = await Roadmap.findById(resolvedRoadmapId);
  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  // Check if user is enrolled in roadmap
  const user = await User.findById(req.user.id);
  const enrollment = user.enrolledRoadmaps.find(
    er => er.roadmap.toString() === resolvedRoadmapId
  );

  if (!enrollment) {
    throw new ApiError('Not enrolled in this roadmap', 400);
  }

  // Get attempt count
  const previousAttempts = await TestAttempt.countDocuments({
    user: req.user.id,
    topic: topicId,
    roadmap: resolvedRoadmapId
  });

  const questionCount = roadmap.testConfig?.questionsPerTest || topic.questionCount || 5;
  const language = user.preferences?.preferredLanguage || topic.language || 'english';

  // Generate questions based on topic content/transcript
  const questions = await generateTestQuestions(topic, questionCount, language);

  // Create test attempt
  const testAttempt = await TestAttempt.create({
    user: req.user.id,
    topic: topicId,
    roadmap: resolvedRoadmapId,
    attemptNumber: previousAttempts + 1,
    questions: questions.map(q => ({
      questionText: q.questionText,
      questionType: q.questionType,
      options: q.options,
      correctAnswer: q.correctAnswer,
      points: 1
    })),
    score: {
      totalQuestions: questions.length,
      passingPercentage: roadmap.testConfig.passingPercentage
    },
    timing: {
      startedAt: new Date()
    },
    status: 'in-progress'
  });

  // Remove correct answers from response
  const safeQuestions = testAttempt.questions.map(q => ({
    _id: q._id,
    questionText: q.questionText,
    questionType: q.questionType,
    options: q.options.map(o => ({ _id: o._id, text: o.text }))
  }));

  res.status(201).json({
    success: true,
    data: {
      attemptId: testAttempt._id,
      attemptNumber: testAttempt.attemptNumber,
      questions: safeQuestions,
      timePerQuestion: roadmap.testConfig.timePerQuestion,
      passingPercentage: roadmap.testConfig.passingPercentage
    }
  });
}));

/**
 * @route   POST /api/tests/:attemptId/submit
 * @desc    Submit test answers
 * @access  Private
 */
router.post('/:attemptId/submit', protect, asyncHandler(async (req, res) => {
  const { answers } = req.body; // Array of { questionId, answer }

  const testAttempt = await TestAttempt.findOne({
    _id: req.params.attemptId,
    user: req.user.id,
    status: 'in-progress'
  });

  if (!testAttempt) {
    throw new ApiError('Test attempt not found or already completed', 404);
  }

  const user = await User.findById(req.user.id);
  const language = user?.preferences?.preferredLanguage || 'english';

  // Build AI evaluation payload
  const evalQuestions = testAttempt.questions.map((q) => ({
    questionText: q.questionText,
    questionType: q.questionType,
    options: (q.options || []).map((o) => o.text)
  }));

  const answersById = new Map(answers.map((a) => [a.questionId, a.answer]));
  const evalAnswers = testAttempt.questions.map((q) => {
    const raw = answersById.get(q._id.toString()) || '';
    if (q.questionType === 'multiple-choice') {
      const selectedOption = q.options.find((o) => o._id.toString() === raw);
      return selectedOption?.text || '';
    }
    return raw;
  });

  const aiResults = await aiService.evaluateTestWithAI({
    questions: evalQuestions,
    answers: evalAnswers,
    language
  });

  // Apply AI evaluation results
  testAttempt.questions.forEach((question, index) => {
    const aiResult = aiResults[index];
    if (!aiResult) return;

    question.userAnswer = aiResult.userAnswer || evalAnswers[index] || '';
    question.correctAnswer = aiResult.correctAnswer || question.correctAnswer;
    question.isCorrect = !!aiResult.isCorrect;

    if (question.questionType === 'multiple-choice' && question.options?.length) {
      question.options = question.options.map((opt) => ({
        ...opt,
        isCorrect: opt.text === question.correctAnswer
      }));
    }
  });

  // Calculate score
  testAttempt.calculateScore();
  testAttempt.timing.completedAt = new Date();
  testAttempt.timing.timeSpent = Math.round(
    (testAttempt.timing.completedAt - testAttempt.timing.startedAt) / 1000
  );
  testAttempt.status = 'completed';

  // Generate feedback
  testAttempt.feedback = generateTestFeedback(testAttempt);

  await testAttempt.save();

  // If passed, update user progress
  if (testAttempt.score.passed) {
    const user = await User.findById(req.user.id);
    const enrollment = user.enrolledRoadmaps.find(
      er => er.roadmap.toString() === testAttempt.roadmap.toString()
    );

    if (enrollment) {
      // Check if not already completed
      const alreadyCompleted = enrollment.completedTopics.find(
        ct => ct.topic.toString() === testAttempt.topic.toString()
      );

      if (!alreadyCompleted) {
        enrollment.completedTopics.push({
          topic: testAttempt.topic,
          completedAt: new Date(),
          testScore: testAttempt.score.percentage
        });

        // Update progress
        const roadmap = await Roadmap.findById(testAttempt.roadmap);
        enrollment.progress = Math.round(
          (enrollment.completedTopics.length / roadmap.topics.length) * 100
        );

        // Check if roadmap completed
        if (enrollment.progress === 100) {
          enrollment.status = 'completed';
          enrollment.completedAt = new Date();
          roadmap.stats.completionCount += 1;
          await roadmap.save();

          // Award XP for Roadmap Completion
          const xpService = require('../services/xpService');
          try {
            await xpService.addXP(req.user.id, 'ROADMAP_COMPLETE');
          } catch (err) {
            console.error('Failed to award roadmap XP:', err.message);
          }
        }

        await user.save();
      }
    }
  }

  res.status(200).json({
    success: true,
    data: {
      score: testAttempt.score,
      feedback: testAttempt.feedback,
      questions: testAttempt.questions.map(q => ({
        questionText: q.questionText,
        userAnswer: q.userAnswer || '',
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect
      }))
    }
  });
}));

/**
 * @route   GET /api/tests/topic/:topicId/attempts
 * @desc    Get all attempts for a topic
 * @access  Private
 */
router.get('/topic/:topicId/attempts', protect, asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({
    user: req.user.id,
    topic: req.params.topicId,
    status: 'completed'
  })
    .select('attemptNumber score timing.completedAt')
    .sort({ attemptNumber: -1 });

  res.status(200).json({
    success: true,
    data: attempts
  });
}));

/**
 * @route   GET /api/tests/:attemptId
 * @desc    Get specific test attempt details
 * @access  Private
 */
router.get('/:attemptId', protect, asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({
    _id: req.params.attemptId,
    user: req.user.id
  }).populate('topic', 'title slug');

  if (!attempt) {
    throw new ApiError('Test attempt not found', 404);
  }

  res.status(200).json({
    success: true,
    data: attempt
  });
}));

/**
 * @route   GET /api/tests/stats/overview
 * @desc    Get user's test statistics overview
 * @access  Private
 */
router.get('/stats/overview', protect, asyncHandler(async (req, res) => {
  const attempts = await TestAttempt.find({
    user: req.user.id,
    status: 'completed'
  });

  const stats = {
    totalAttempts: attempts.length,
    passedAttempts: attempts.filter(a => a.score.passed).length,
    averageScore: attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.score.percentage, 0) / attempts.length)
      : 0,
    firstAttemptPasses: 0,
    averageTimeSpent: 0
  };

  // Calculate first attempt passes
  const topicFirstAttempts = {};
  for (const attempt of attempts) {
    const topicId = attempt.topic.toString();
    if (!topicFirstAttempts[topicId] || attempt.attemptNumber < topicFirstAttempts[topicId].attemptNumber) {
      topicFirstAttempts[topicId] = attempt;
    }
  }
  stats.firstAttemptPasses = Object.values(topicFirstAttempts).filter(a => a.score.passed).length;

  // Average time
  const attemptsWithTime = attempts.filter(a => a.timing.timeSpent);
  if (attemptsWithTime.length > 0) {
    stats.averageTimeSpent = Math.round(
      attemptsWithTime.reduce((sum, a) => sum + a.timing.timeSpent, 0) / attemptsWithTime.length
    );
  }

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * Generate test questions from topic content
 */
async function generateTestQuestions(topic, count = 5, language = 'english') {
  try {
    return await aiService.generateTestQuestions({
      transcript: null,
      topicTitle: topic.title,
      questionCount: count,
      language
    });
  } catch (error) {
    console.error('AI question generation failed, using title-only fallback:', error.message);
  }

  const templates = [
    {
      questionText: `What best describes "${topic.title}"?`,
      questionType: 'multiple-choice',
      options: [
        { text: 'A related concept', isCorrect: false },
        { text: 'The core concept of the title', isCorrect: true },
        { text: 'An unrelated topic', isCorrect: false },
        { text: 'A peripheral concept', isCorrect: false }
      ],
      correctAnswer: 'The core concept of the title'
    },
    {
      questionText: `Which statement is most likely true about "${topic.title}"?`,
      questionType: 'multiple-choice',
      options: [
        { text: 'It is unrelated to software', isCorrect: false },
        { text: 'It is a foundational concept of the topic', isCorrect: true },
        { text: 'It is purely historical', isCorrect: false },
        { text: 'It is the opposite of the title', isCorrect: false }
      ],
      correctAnswer: 'It is a foundational concept of the topic'
    }
  ];

  const questions = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    questions.push({
      ...template,
      questionText: `Question ${i + 1}: ${template.questionText}`
    });
  }

  return questions;
}

/**
 * Generate test feedback
 */
function generateTestFeedback(testAttempt) {
  const strengths = [];
  const improvements = [];
  const suggestions = [];

  if (testAttempt.score.passed) {
    strengths.push('You demonstrated good understanding of the topic');
    if (testAttempt.score.percentage >= 80) {
      strengths.push('Excellent performance!');
    }
  } else {
    improvements.push('Review the video content more carefully');
    improvements.push('Take notes while watching');
    suggestions.push('Try using the AI Teacher mode for better understanding');
  }

  return {
    summary: testAttempt.score.passed
      ? 'Congratulations! You passed the test.'
      : 'You need to rewatch the video and try again.',
    strengths,
    improvements,
    suggestions
  };
}

module.exports = router;
