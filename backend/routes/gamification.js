/**
 * Gamification Routes - Challenges, XP, Levels, Power-ups
 */

const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/gamification/challenges/daily
 * @desc    Get today's daily challenges
 * @access  Private
 */
router.get('/challenges/daily', protect, asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const challenges = await Challenge.find({
        type: 'daily',
        startDate: { $lte: today },
        endDate: { $gte: today }
    });

    // Add user's progress to each challenge
    const user = await User.findById(req.user.id);

    const challengesWithProgress = challenges.map(challenge => {
        const userChallenge = challenge.activeUsers.find(
            au => au.user.toString() === req.user.id
        );

        return {
            ...challenge.toObject(),
            userProgress: userChallenge ? userChallenge.progress : 0,
            userCompleted: userChallenge ? userChallenge.completed : false
        };
    });

    res.status(200).json({
        success: true,
        data: challengesWithProgress
    });
}));

/**
 * @route   POST /api/gamification/challenges/create
 * @desc    Create new challenge (Admin only)
 * @access  Private/Admin
 */
router.post('/challenges/create', protect, isAdmin, asyncHandler(async (req, res) => {
    const challenge = await Challenge.create(req.body);

    res.status(201).json({
        success: true,
        data: challenge
    });
}));

/**
 * @route   POST /api/gamification/challenges/:id/join
 * @desc    Join a challenge
 * @access  Private
 */
router.post('/challenges/:id/join', protect, asyncHandler(async (req, res) => {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
        throw new ApiError('Challenge not found', 404);
    }

    if (challenge.activeUsers.some(au => au.user.toString() === req.user.id)) {
        throw new ApiError('Already joined this challenge', 400);
    }

    challenge.activeUsers.push({ user: req.user.id, progress: 0 });
    await challenge.save();

    res.status(200).json({
        success: true,
        data: challenge
    });
}));

/**
 * @route   PUT /api/gamification/challenges/:id/progress
 * @desc    Update challenge progress
 * @access  Private
 */
router.put('/challenges/:id/progress', protect, asyncHandler(async (req, res) => {
    const { progress } = req.body;

    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
        throw new ApiError('Challenge not found', 404);
    }

    const userChallenge = challenge.activeUsers.find(
        au => au.user.toString() === req.user.id
    );

    if (!userChallenge) {
        throw new ApiError('Not participating in this challenge', 400);
    }

    userChallenge.progress = progress;

    // Check if completed
    if (progress >= challenge.criteria.target && !userChallenge.completed) {
        userChallenge.completed = true;
        userChallenge.completedAt = new Date();

        // Award rewards
        const user = await User.findById(req.user.id);
        if (!user.gamification) {
            user.gamification = { xp: 0, level: 1, points: 0, badges: [], powerups: [] };
        }
        user.gamification.xp = (user.gamification.xp || 0) + (challenge.rewards.xp || 0);
        user.gamification.points = (user.gamification.points || 0) + (challenge.rewards.points || 0);

        if (challenge.rewards.badge) {
            user.gamification.badges = user.gamification.badges || [];
            user.gamification.badges.push({
                name: challenge.rewards.badge,
                earnedAt: new Date()
            });
        }

        if (challenge.rewards.powerup) {
            user.gamification.powerups = user.gamification.powerups || [];
            user.gamification.powerups.push({
                type: challenge.rewards.powerup,
                count: 1,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            });
        }

        // Calculate level from XP
        const newLevel = Math.floor(Math.sqrt(user.gamification.xp / 100)) + 1;
        user.gamification.level = newLevel;

        await user.save();
    }

    await challenge.save();

    res.status(200).json({
        success: true,
        data: challenge
    });
}));

/**
 * @route   GET /api/gamification/xp
 * @desc    Get user XP and level info
 * @access  Private
 */
router.get('/xp', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    const gamification = user.gamification || { xp: 0, level: 1, points: 0 };

    // Calculate XP needed for next level
    const currentLevelXP = (gamification.level - 1) ** 2 * 100;
    const nextLevelXP = gamification.level ** 2 * 100;
    const xpToNextLevel = nextLevelXP - gamification.xp;
    const progressToNextLevel = ((gamification.xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    res.status(200).json({
        success: true,
        data: {
            xp: gamification.xp,
            level: gamification.level,
            points: gamification.points,
            xpToNextLevel,
            progressToNextLevel: Math.round(progressToNextLevel),
            badges: gamification.badges || [],
            powerups: gamification.powerups || []
        }
    });
}));

/**
 * @route   POST /api/gamification/streak/freeze
 * @desc    Use streak freeze power-up
 * @access  Private
 */
router.post('/streak/freeze', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user.gamification || !user.gamification.powerups) {
        throw new ApiError('No power-ups available', 400);
    }

    const freezePowerup = user.gamification.powerups.find(
        p => p.type === 'streak-freeze' && p.count > 0
    );

    if (!freezePowerup) {
        throw new ApiError('No streak freeze power-ups available', 400);
    }

    // Use the power-up
    freezePowerup.count -= 1;

    // Apply streak protection for 1 day
    user.streakProtection = {
        active: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    await user.save();

    res.status(200).json({
        success: true,
        message: 'Streak freeze activated for 24 hours',
        data: user.streakProtection
    });
}));

/**
 * @route   GET /api/gamification/rankings
 * @desc    Get public user rankings
 * @access  Public
 */
router.get('/rankings', asyncHandler(async (req, res) => {
    const { type = 'xp', limit = 100 } = req.query;

    let sortField = 'gamification.xp';
    if (type === 'points') sortField = 'gamification.points';
    if (type === 'streak') sortField = 'currentStreak';

    const rankings = await User.find({ isActive: true })
        .select('name email gamification currentStreak')
        .sort({ [sortField]: -1 })
        .limit(parseInt(limit))
        .lean();

    const formattedRankings = rankings.map((user, index) => ({
        rank: index + 1,
        name: user.name,
        email: user.email,
        xp: user.gamification?.xp || 0,
        level: user.gamification?.level || 1,
        points: user.gamification?.points || 0,
        streak: user.currentStreak || 0,
        badges: user.gamification?.badges?.length || 0
    }));

    res.status(200).json({
        success: true,
        data: formattedRankings
    });
}));

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get user's achievements and badges
 * @access  Private
 */
router.get('/achievements', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    const achievements = {
        badges: user.gamification?.badges || [],
        totalXP: user.gamification?.xp || 0,
        currentLevel: user.gamification?.level || 1,
        totalPoints: user.gamification?.points || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        totalStudyTime: user.studyTime?.reduce((sum, st) => sum + st.minutes, 0) || 0,
        completedRoadmaps: user.enrolledRoadmaps?.filter(er => er.status === 'completed').length || 0
    };

    res.status(200).json({
        success: true,
        data: achievements
    });
}));

module.exports = router;
