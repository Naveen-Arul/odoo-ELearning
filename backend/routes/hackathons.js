/**
 * Hackathon Routes - Community coding competitions
 */

const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/hackathons
 * @desc    Get all hackathons
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status } = req.query;

    const query = {};
    if (status) query.status = status;

    const hackathons = await Hackathon.find(query)
        .populate('organizer', 'name')
        .sort({ startDate: -1 });

    res.status(200).json({
        success: true,
        data: hackathons
    });
}));

/**
 * @route   POST /api/hackathons
 * @desc    Create hackathon (Admin only)
 * @access  Private/Admin
 */
router.post('/', protect, isAdmin, asyncHandler(async (req, res) => {
    const hackathon = await Hackathon.create({
        ...req.body,
        organizer: req.user.id
    });

    res.status(201).json({
        success: true,
        data: hackathon
    });
}));

/**
 * @route   POST /api/hackathons/:id/register
 * @desc    Register for hackathon
 * @access  Private
 */
router.post('/:id/register', protect, asyncHandler(async (req, res) => {
    const { team } = req.body;

    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
        throw new ApiError('Hackathon not found', 404);
    }

    if (hackathon.participants.some(p => p.user.toString() === req.user.id)) {
        throw new ApiError('Already registered', 400);
    }

    hackathon.participants.push({
        user: req.user.id,
        team
    });

    await hackathon.save();

    res.status(200).json({
        success: true,
        data: hackathon
    });
}));

/**
 * @route   POST /api/hackathons/:id/submit
 * @desc    Submit project
 * @access  Private
 */
router.post('/:id/submit', protect, asyncHandler(async (req, res) => {
    const { team, projectTitle, description, githubUrl, liveUrl } = req.body;

    const hackathon = await Hackathon.findById(req.params.id);

    if (!hackathon) {
        throw new ApiError('Hackathon not found', 404);
    }

    hackathon.submissions.push({
        team,
        members: [req.user.id],
        projectTitle,
        description,
        githubUrl,
        liveUrl
    });

    await hackathon.save();

    res.status(201).json({
        success: true,
        data: hackathon.submissions[hackathon.submissions.length - 1]
    });
}));

module.exports = router;
