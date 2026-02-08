/**
 * Analytics Routes - Advanced insights and predictions
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/analytics/skill-radar
 * @desc    Get skill progress radar chart data
 * @access  Private
 */
router.get('/skill-radar', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('enrolledRoadmaps.roadmap');

    const skillCategories = {};

    user.enrolledRoadmaps?.forEach(er => {
        if (er.roadmap && er.completedTopics) {
            const skills = er.roadmap.role?.split(/[,\/\s]+/) || [];
            skills.forEach(skill => {
                if (!skillCategories[skill]) {
                    skillCategories[skill] = { completed: 0, total: 0 };
                }
                skillCategories[skill].total += 1;
                if (er.completedTopics.length > 0) {
                    skillCategories[skill].completed += 1;
                }
            });
        }
    });

    const radarData = Object.keys(skillCategories).map(skill => ({
        skill,
        score: Math.round((skillCategories[skill].completed / skillCategories[skill].total) * 100)
    }));

    res.status(200).json({
        success: true,
        data: radarData
    });
}));

/**
 * @route   GET /api/analytics/learning-style
 * @desc    Detect learning style based on behavior
 * @access  Private
 */
router.get('/learning-style', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    const totalStudyMinutes = user.studyTime?.reduce((sum, st) => sum + st.minutes, 0) || 0;
    const avgMinutesPerDay = totalStudyMinutes / Math.max(user.studyTime?.length || 1, 1);

    // Simple heuristic-based detection
    let learningStyle = 'Mixed';

    if (avgMinutesPerDay > 120) {
        learningStyle = 'Intensive';
    } else if (avgMinutesPerDay > 60) {
        learningStyle = 'Regular';
    } else {
        learningStyle = 'Casual';
    }

    const preferences = {
        videoLearning: user.preferences?.preferVideoLearning !== false,
        practiceOriented: (user.enrolledRoadmaps?.reduce((sum, er) => sum + (er.completedTopics?.length || 0), 0) || 0) > 5,
        consistency: (user.studyTime?.length || 0) / 30 // Percentage of days studied in last month
    };

    res.status(200).json({
        success: true,
        data: {
            learningStyle,
            avgMinutesPerDay,
            preferences
        }
    });
}));

/**
 * @route   GET /api/analytics/predictive-completion
 * @desc    Predict roadmap completion time
 * @access  Private
 */
router.get('/predictive-completion/:roadmapId', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('enrolledRoadmaps.roadmap');

    const enrollment = user.enrolledRoadmaps?.find(er =>
        er.roadmap?._id.toString() === req.params.roadmapId
    );

    if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found' });
    }

    const totalTopics = enrollment.roadmap?.topics?.length || 1;
    const completedTopics = enrollment.completedTopics?.length || 0;
    const remainingTopics = totalTopics - completedTopics;

    // Calculate average time per topic (last 7 days)
    const recentStudy = user.studyTime?.slice(-7) || [];
    const avgMinutesPerDay = recentStudy.reduce((sum, st) => sum + st.minutes, 0) / 7;
    const avgTopicsPerDay = recentStudy.reduce((sum, st) => sum + (st.topicsCompleted || 0), 0) / 7;

    const estimatedDays = avgTopicsPerDay > 0
        ? Math.ceil(remainingTopics / avgTopicsPerDay)
        : Math.ceil(remainingTopics / 1); // Fallback: 1 topic per day

    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);

    res.status(200).json({
        success: true,
        data: {
            totalTopics,
            completedTopics,
            remainingTopics,
            estimatedDays,
            estimatedCompletion: completionDate,
            avgMinutesPerDay,
            avgTopicsPerDay
        }
    });
}));

/**
 * @route   GET /api/analytics/drop-off-risk
 * @desc    Detect risk of user dropping off
 * @access  Private
 */
router.get('/drop-off-risk', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    const last7Days = user.studyTime?.slice(-7) || [];
    const studiedDays = last7Days.filter(st => st.minutes > 0).length;

    let riskLevel = 'Low';
    let riskScore = 0;

    // Risk factors
    if (studiedDays === 0) {
        riskLevel = 'Critical';
        riskScore = 100;
    } else if (studiedDays <= 2) {
        riskLevel = 'High';
        riskScore = 75;
    } else if (studiedDays <= 4) {
        riskLevel = 'Medium';
        riskScore = 50;
    } else {
        riskLevel = 'Low';
        riskScore = 25;
    }

    const recommendations = [];
    if (riskScore > 50) {
        recommendations.push('Set a daily reminder');
        recommendations.push('Join a study group');
        recommendations.push('Reduce daily study goal');
    }

    res.status(200).json({
        success: true,
        data: {
            riskLevel,
            riskScore,
            studiedDays,
            recommendations
        }
    });
}));

module.exports = router;
