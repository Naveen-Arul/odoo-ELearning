/**
 * SkillForge AI - Assessments Routes
 * Project submissions and peer reviews
 */

const express = require('express');
const router = express.Router();
const ProjectSubmission = require('../models/ProjectSubmission');
const PeerReview = require('../models/PeerReview');
const SkillBadge = require('../models/SkillBadge');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

const bannedPatterns = [
  /\b(?:hate|abuse|kill|terror|porn|nsfw)\b/i
];

const hasBannedContent = (text = '') => bannedPatterns.some((r) => r.test(text));

/**
 * @route   GET /api/assessments/submissions
 * @desc    Get current user's project submissions
 * @access  Private
 */
router.get('/submissions', protect, asyncHandler(async (req, res) => {
  const submissions = await ProjectSubmission.find({ user: req.user.id })
    .populate('roadmap', 'title')
    .populate('awardedBadge', 'name icon')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: submissions
  });
}));

/**
 * @route   POST /api/assessments/submissions
 * @desc    Create a project submission
 * @access  Private
 */
router.post('/submissions', protect, asyncHandler(async (req, res) => {
  const { roadmapId, title, description, repoUrl, demoUrl } = req.body;

  if (!title) {
    throw new ApiError('Project title is required', 400);
  }

  if (hasBannedContent(`${title} ${description || ''}`)) {
    throw new ApiError('Submission contains disallowed content', 400);
  }

  const submission = await ProjectSubmission.create({
    user: req.user.id,
    roadmap: roadmapId || undefined,
    title,
    description,
    repoUrl,
    demoUrl,
    status: 'submitted'
  });

  res.status(201).json({
    success: true,
    data: submission
  });
}));

/**
 * @route   GET /api/assessments/submissions/:id
 * @desc    Get a submission with reviews
 * @access  Private
 */
router.get('/submissions/:id', protect, asyncHandler(async (req, res) => {
  const submission = await ProjectSubmission.findById(req.params.id)
    .populate('roadmap', 'title')
    .populate('user', 'name')
    .populate('awardedBadge', 'name icon');

  if (!submission) {
    throw new ApiError('Submission not found', 404);
  }

  if (submission.user._id.toString() !== req.user.id) {
    throw new ApiError('Unauthorized', 403);
  }

  const reviews = await PeerReview.find({ submission: submission._id })
    .populate('reviewer', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: {
      submission,
      reviews
    }
  });
}));

/**
 * @route   POST /api/assessments/submissions/:id/reviews
 * @desc    Submit a peer review for a submission
 * @access  Private
 */
router.post('/submissions/:id/reviews', protect, asyncHandler(async (req, res) => {
  const { rating = 5, feedback } = req.body;

  const submission = await ProjectSubmission.findById(req.params.id);
  if (!submission) {
    throw new ApiError('Submission not found', 404);
  }

  if (submission.user.toString() === req.user.id) {
    throw new ApiError('You cannot review your own submission', 400);
  }

  if (hasBannedContent(feedback || '')) {
    throw new ApiError('Review contains disallowed content', 400);
  }

  const existing = await PeerReview.findOne({ submission: submission._id, reviewer: req.user.id });
  if (existing) {
    throw new ApiError('You already reviewed this submission', 400);
  }

  const review = await PeerReview.create({
    submission: submission._id,
    reviewer: req.user.id,
    rating,
    feedback
  });

  res.status(201).json({
    success: true,
    data: review
  });
}));

/**
 * @route   GET /api/assessments/badges
 * @desc    Get current user's badges
 * @access  Private
 */
router.get('/badges', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('badges.badge', 'name icon description');

  res.status(200).json({
    success: true,
    data: user?.badges || []
  });
}));

/**
 * @route   GET /api/assessments/badges/available
 * @desc    Get available badges
 * @access  Public
 */
router.get('/badges/available', asyncHandler(async (req, res) => {
  const badges = await SkillBadge.find({ isActive: true }).sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    data: badges
  });
}));

module.exports = router;
