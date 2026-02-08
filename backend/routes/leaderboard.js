const express = require('express');
const router = express.Router();
const Leaderboard = require('../models/Leaderboard');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/leaderboard/top/:limit
 * @desc    Get top users sorted by Level > OverallScore > XP
 * @access  Public
 */
router.get('/top/:limit?', asyncHandler(async (req, res) => {
    const limit = parseInt(req.params.limit || req.query.limit || 50);

    const leaderboard = await Leaderboard.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $match: {
                'userDetails.role': 'student'
            }
        },
        {
            $sort: { level: -1, overallScore: -1, xp: -1 }
        },
        {
            $limit: limit
        },
        {
            $project: {
                rank: 0, // rank is calculated dynamically below
                userDetails: 0 // remove joined user details to keep response clean
            }
        }
    ]);

    // Add rank index
    const rankedData = leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1
    }));

    res.status(200).json({
        success: true,
        data: rankedData
    });
}));

/**
 * @route   GET /api/leaderboard/rank/:userId
 * @desc    Get specific user's rank
 * @access  Private
 */
router.get('/rank/:userId', protect, asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Find the user's entry
    const userEntry = await Leaderboard.findOne({ userId });

    if (!userEntry) {
        throw new ApiError('User not found on leaderboard', 404);
    }

    // Calculate rank: count users with better stats
    // Better means: Higher Level OR (Same Level AND Higher Score) OR (Same Level AND Same Score AND Higher XP)
    const betterCount = await Leaderboard.countDocuments({
        $or: [
            { level: { $gt: userEntry.level } },
            { level: userEntry.level, overallScore: { $gt: userEntry.overallScore } },
            { level: userEntry.level, overallScore: userEntry.overallScore, xp: { $gt: userEntry.xp } }
        ]
    });

    const rank = betterCount + 1;

    res.status(200).json({
        success: true,
        data: {
            ...userEntry.toObject(),
            rank
        }
    });
}));

/**
 * @route   GET /api/leaderboard/my-rank
 * @desc    Get current user's rank (Alias for /rank/:myId)
 * @access  Private
 */
router.get('/my-rank', protect, asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Find the user's entry
    const userEntry = await Leaderboard.findOne({ userId });

    if (!userEntry) {
        // If not found, they might be new. Return a default or 404. 
        // Let's return a "Unranked" state or defaults.
        return res.status(200).json({
            success: true,
            data: {
                rank: '-',
                level: 1,
                xp: 0,
                overallScore: 0,
                name: req.user.name || 'User',
                targetRole: 'Explorer'
            }
        });
    }

    const betterCount = await Leaderboard.countDocuments({
        $or: [
            { level: { $gt: userEntry.level } },
            { level: userEntry.level, overallScore: { $gt: userEntry.overallScore } },
            { level: userEntry.level, overallScore: userEntry.overallScore, xp: { $gt: userEntry.xp } }
        ]
    });

    const rank = betterCount + 1;

    res.status(200).json({
        success: true,
        data: {
            ...userEntry.toObject(),
            rank
        }
    });
}));

// Fallback for root /api/leaderboard
router.get('/', asyncHandler(async (req, res) => {
    // Redirect logic or same as /top/50
    const limit = 50;
    const leaderboard = await Leaderboard.find({})
        .sort({ level: -1, overallScore: -1, xp: -1 })
        .limit(limit);

    const rankedData = leaderboard.map((entry, index) => ({
        ...entry.toObject(),
        rank: index + 1
    }));

    res.status(200).json({
        success: true,
        data: rankedData
    });
}));

module.exports = router;
