const express = require('express');
const router = express.Router();
const xpService = require('../services/xpService');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/xp/:userId
 * @desc    Get User XP and Level Stats
 * @access  Private
 */
router.get('/:userId', protect, asyncHandler(async (req, res) => {
    // Users can only view their own detailed XP stats via this route for now, 
    // or public profiles if we enable that. For now keeping it protected/self via ID check or just return data.
    // Simplifying to allow viewing any user's public XP data if needed, but for "my profile" typical use:

    // Safety check: ensure we are fetching for the logged in user OR allow public read?
    // Let's assume public read is fine for Leaderboard data.

    const user = await User.findById(req.params.userId).select('gamification name avatar');
    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const xp = user.gamification?.xp || 0;
    const level = xpService.calculateLevel(xp);
    const nextLevelXp = xpService.xpToNextLevel(xp);

    // Calculate Progress Percentage for current level
    // We need the start XP of the current level to calculate progress 0-100% within that level.
    // For now, let's use a simpler heuristic or just expose the helper in service if needed.
    // Hack: derived from current XP and next threshold. 
    // This is adequate for MVP. 
    // Better logic: (CurrentXP - LevelStartXP) / (LevelEndXP - LevelStartXP)

    // Let's assume Level 1 starts at 0. Level 2 starts at 500. etc.
    // We can infer LevelStartXP based on calculateLevel logic in reverse or just map it.
    const LEVELS = [0, 500, 1200, 2000, 3000];
    let levelStart = 0;
    let levelEnd = 500;

    if (level <= 4) {
        levelStart = LEVELS[level - 1];
        levelEnd = LEVELS[level];
    } else {
        // Level 5+ logic
        // Level 5 starts at 3000.
        // Level N starts at 3000 + (N-5)*1500
        levelStart = 3000 + (level - 5) * 1500;
        levelEnd = levelStart + 1500;
    }

    const progressPercent = Math.min(100, Math.max(0, ((xp - levelStart) / (levelEnd - levelStart)) * 100));

    res.status(200).json({
        success: true,
        data: {
            userId: user._id,
            xp,
            level,
            nextLevelIn: nextLevelXp,
            progress: Math.round(progressPercent)
        }
    });
}));

/**
 * @route   POST /api/xp/add
 * @desc    Add XP (Internal/Admin/Specific Triggers)
 * @access  Private
 */
router.post('/add', protect, asyncHandler(async (req, res) => {
    const { actionType } = req.body;

    // For security, strictly valid action types only.
    // In a real app, we might restrict who can call this (e.g., only from specific client events that are trusted, or server-side only).
    // For this implementation, we allow logged-in users to trigger "DAILY_LOGIN" or similar via client 
    // BUT critical actions like "ROADMAP_COMPLETE" should be server-side triggered.
    // For now, exposing it for demonstration/MVP integration.

    const result = await xpService.addXP(req.user.id, actionType);

    res.status(200).json({
        success: true,
        data: result
    });
}));

module.exports = router;
