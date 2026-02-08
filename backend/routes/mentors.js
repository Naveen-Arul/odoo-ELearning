/**
 * SkillForge AI - Mentor Routes
 * Mentor marketplace
 */

const express = require('express');
const router = express.Router();
const MentorProfile = require('../models/MentorProfile');
const MentoringSession = require('../models/MentoringSession');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const { objectIdValidation } = require('../middleware/validation');

const bannedPatterns = [
  /\b(?:hate|abuse|kill|terror|porn|nsfw)\b/i
];

const hasBannedContent = (text = '') => bannedPatterns.some((r) => r.test(text));

/**
 * @route   GET /api/mentors
 * @desc    List approved mentors
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const mentors = await MentorProfile.find({ status: 'approved' })
    .populate('user', 'name avatar')
    .sort({ approvedAt: -1 });

  res.status(200).json({
    success: true,
    data: mentors
  });
}));

/**
 * @route   GET /api/mentors/me
 * @desc    Get current user's mentor application
 * @access  Private
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
  const profile = await MentorProfile.findOne({ user: req.user.id });

  res.status(200).json({
    success: true,
    data: profile || null
  });
}));

/**
 * @route   POST /api/mentors/apply
 * @desc    Apply to be a mentor
 * @access  Private
 */
router.post('/apply', protect, asyncHandler(async (req, res) => {
  const { bio, skills = [], ratePerHour = 0 } = req.body;

  if (hasBannedContent(`${bio || ''} ${(skills || []).join(' ')}`)) {
    throw new ApiError('Application contains disallowed content', 400);
  }

  let profile = await MentorProfile.findOne({ user: req.user.id });
  if (profile) {
    profile.bio = bio || profile.bio;
    profile.skills = skills.length ? skills : profile.skills;
    profile.ratePerHour = ratePerHour || profile.ratePerHour;
    profile.status = 'pending';
    await profile.save();
  } else {
    profile = await MentorProfile.create({
      user: req.user.id,
      bio,
      skills,
      ratePerHour,
      status: 'pending'
    });
  }

  res.status(201).json({
    success: true,
    data: profile
  });
}));

/**
 * @route   POST /api/mentors/:id/book
 * @desc    Book a session with a mentor
 * @access  Private
 */
router.post('/:id/book', protect, objectIdValidation('id'), asyncHandler(async (req, res) => {
  const { scheduledAt, duration = 30, message, topics = [] } = req.body;

  const mentorProfile = await MentorProfile.findById(req.params.id);
  if (!mentorProfile || mentorProfile.status !== 'approved') {
    throw new ApiError('Mentor not found or unavailable', 404);
  }

  // Prevent booking with self
  if (mentorProfile.user.toString() === req.user.id) {
    throw new ApiError('Cannot book a session with yourself', 400);
  }

  const session = await MentoringSession.create({
    mentor: mentorProfile._id,
    mentee: req.user.id,
    scheduledAt,
    duration,
    message,
    topics,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    message: 'Booking request sent successfully',
    data: session
  });
}));

/**
 * @route   GET /api/mentors/requests
 * @desc    Get incoming session requests for the current mentor
 * @access  Private
 */
router.get('/requests', protect, asyncHandler(async (req, res) => {
  const mentorProfile = await MentorProfile.findOne({ user: req.user.id });

  if (!mentorProfile) {
    // If user is not updates, just return empty list or specific error? 
    // Return empty to specific UI handling
    return res.status(200).json({ success: true, data: [] });
  }

  const requests = await MentoringSession.find({ mentor: mentorProfile._id })
    .populate('mentee', 'name avatar email')
    .sort({ scheduledAt: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    data: requests
  });
}));

/**
 * @route   PUT /api/mentors/requests/:requestId
 * @desc    Update session request status (accept/reject)
 * @access  Private
 */
router.put('/requests/:requestId', protect, objectIdValidation('requestId'), asyncHandler(async (req, res) => {
  const { status, meetingLink } = req.body;

  if (!['accepted', 'rejected', 'completed', 'cancelled'].includes(status)) {
    throw new ApiError('Invalid status', 400);
  }

  const session = await MentoringSession.findById(req.params.requestId);
  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  // Verify ownership (must be the mentor)
  const mentorProfile = await MentorProfile.findOne({ user: req.user.id });
  if (!mentorProfile || session.mentor.toString() !== mentorProfile._id.toString()) {
    throw new ApiError('Not authorized to access this session', 403);
  }

  session.status = status;
  if (meetingLink) {
    session.meetingLink = meetingLink;
  }

  await session.save();

  res.status(200).json({
    success: true,
    message: `Session ${status}`,
    data: session
  });
}));

module.exports = router;
