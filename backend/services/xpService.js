const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

const XP_REWARDS = {
    ROADMAP_COMPLETE: 500,
    INTERVIEW_SESSION: 100,
    RESUME_UPLOAD: 200,
    GITHUB_REPO: 50,
    LEETCODE_CONNECT: 100,
    DAILY_LOGIN: 20
};

// Level Thresholds
// Level 1: 0-499
// Level 2: 500-1199
// Level 3: 1200-1999
// Level 4: 2000-2999
// Level 5: 3000+
// After Level 5: Every 1500 XP = +1 Level
const LEVELS = [0, 500, 1200, 2000, 3000];

const calculateLevel = (xp) => {
    if (xp < LEVELS[1]) return 1;
    if (xp < LEVELS[2]) return 2;
    if (xp < LEVELS[3]) return 3;
    if (xp < LEVELS[4]) return 4;

    // Level 5 and beyond
    // Base XP for Level 5 is 3000.
    // Additional XP = xp - 3000.
    // Each additional level needs 1500 XP.
    // Level = 5 + floor((xp - 3000) / 1500)
    const extraXp = xp - LEVELS[4];
    const extraLevels = Math.floor(extraXp / 1500);
    return 5 + extraLevels;
};

const xpToNextLevel = (xp) => {
    if (xp < LEVELS[1]) return LEVELS[1] - xp;
    if (xp < LEVELS[2]) return LEVELS[2] - xp;
    if (xp < LEVELS[3]) return LEVELS[3] - xp;
    if (xp < LEVELS[4]) return LEVELS[4] - xp;

    // For Level 5+
    // Next threshold is 3000 + (extraLevels + 1) * 1500
    const extraXp = xp - LEVELS[4];
    const completedExtraLevels = Math.floor(extraXp / 1500);
    const nextThreshold = LEVELS[4] + ((completedExtraLevels + 1) * 1500);
    return nextThreshold - xp;
};

/**
 * Add XP to a user and update Leaderboard
 * @param {string} userId 
 * @param {string} actionType - One of keys in XP_REWARDS
 * @returns {Promise<Object>} Updated stats
 */
const addXP = async (userId, actionType) => {
    const amount = XP_REWARDS[actionType];
    if (!amount) throw new Error('Invalid XP Action Type');

    const user = await User.findById(userId).populate('preferences.targetRole');
    if (!user) throw new Error('User not found');

    // Initialize gamification if missing
    if (!user.gamification) {
        user.gamification = { xp: 0, level: 1, points: 0, badges: [] };
    }

    // Add XP
    user.gamification.xp += amount;

    // Check Level Up
    const oldLevel = user.gamification.level;
    const newLevel = calculateLevel(user.gamification.xp);

    let leveledUp = false;
    if (newLevel > oldLevel) {
        user.gamification.level = newLevel;
        leveledUp = true;
    }

    await user.save();

    // Update Leaderboard
    await Leaderboard.findOneAndUpdate(
        { userId: user._id },
        {
            userId: user._id,
            name: user.name,
            profileImage: user.avatar,
            targetRole: user.preferences?.targetRole?.name || 'Explorer',
            overallScore: user.careerData?.readinessScore?.overall || 0,
            xp: user.gamification.xp,
            level: user.gamification.level,
            updatedAt: new Date()
        },
        { upsert: true, new: true }
    );

    // Check for Badges
    const badgeService = require('./badgeService');

    // Map XP action to Badge Context
    const triggerMap = {
        'GITHUB_REPO': 'GITHUB',
        'RESUME_UPLOAD': 'RESUME',
        'INTERVIEW_SESSION': 'INTERVIEW',
        'ROADMAP_COMPLETE': 'ROADMAP'
    };

    const triggerContext = triggerMap[actionType] || 'LEVEL'; // Default to checking level badges

    // Check specific context AND always check LEVEL (in case XP gain caused level up)
    const newBadges = await badgeService.checkAndUnlockBadges(userId, triggerContext);

    // If context wasn't LEVEL, we might still want to check LEVEL if they leveled up?
    // badgeService 'LEVEL' check is cheap. Let's do it if leveledUp is true.
    if (leveledUp && triggerContext !== 'LEVEL') {
        const levelBadges = await badgeService.checkAndUnlockBadges(userId, 'LEVEL');
        newBadges.push(...levelBadges);
    }

    // Return explicitly for frontend notifications
    const result = {
        xp: user.gamification.xp,
        level: user.gamification.level,
        xpAdded: amount,
        leveledUp,
        nextLevelIn: xpToNextLevel(user.gamification.xp),
        newBadges
    };

    // Emit socket event for real-time frontend updates
    try {
        const { getIO } = require('../config/socket');
        const io = getIO();
        io.to(userId.toString()).emit('gamification_update', result);
    } catch (error) {
        console.error('Socket emission failed for gamification:', error.message);
    }

    return result;
};

module.exports = {
    addXP,
    calculateLevel,
    xpToNextLevel,
    XP_REWARDS
};
