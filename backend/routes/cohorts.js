/**
 * SkillForge AI - Cohorts Routes
 * Collaborative learning cohorts
 */

const express = require('express');
const router = express.Router();
const Cohort = require('../models/Cohort');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/cohorts
 * @desc    List active cohorts
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const cohorts = await Cohort.find({ isActive: true })
    .populate('mentor', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: cohorts
  });
}));

/**
 * @route   GET /api/cohorts/my
 * @desc    List cohorts current user joined
 * @access  Private
 */
router.get('/my', protect, asyncHandler(async (req, res) => {
  const cohorts = await Cohort.find({ members: req.user.id })
    .populate('mentor', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    data: cohorts
  });
}));

/**
 * @route   POST /api/cohorts/:id/join
 * @desc    Join a cohort
 * @access  Private
 */
router.post('/:id/join', protect, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findById(req.params.id);
  if (!cohort || !cohort.isActive) {
    throw new ApiError('Cohort not found', 404);
  }

  if (cohort.members.find(m => m.toString() === req.user.id)) {
    throw new ApiError('Already joined', 400);
  }

  if (cohort.capacity && cohort.members.length >= cohort.capacity) {
    throw new ApiError('Cohort is full', 400);
  }

  cohort.members.push(req.user.id);
  await cohort.save();

  res.status(200).json({
    success: true,
    message: 'Joined cohort',
    data: cohort
  });
}));

/**
 * @route   POST /api/cohorts/:id/leave
 * @desc    Leave a cohort
 * @access  Private
 */
router.post('/:id/leave', protect, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findById(req.params.id);
  if (!cohort) {
    throw new ApiError('Cohort not found', 404);
  }

  cohort.members = cohort.members.filter(m => m.toString() !== req.user.id);
  await cohort.save();

  res.status(200).json({
    success: true,
    message: 'Left cohort'
  });
}));

module.exports = router;
