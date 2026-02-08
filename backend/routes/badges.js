const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/Leaderboard');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/badges/:userId
 * @desc    Get all badges for a specific user
 * @access  Public
 */
router.get('/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const leaderboardEntry = await Leaderboard.findOne({ userId });

    if (!leaderboardEntry) {
        // If not found in leaderboard, check User model or return empty
        // Returning empty array is safer than 404 for UI
        return res.status(200).json({
            success: true,
            data: []
        });
    }

    res.status(200).json({
        success: true,
        data: leaderboardEntry.badges || []
    });
}));

module.exports = router;
