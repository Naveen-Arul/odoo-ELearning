/**
 * SkillForge AI - Skill Matching Service
 * Advanced skill matching and scoring for job applications
 */

const User = require('../models/User');
const JobPosting = require('../models/JobPosting');

/**
 * Default scoring weights
 */
const DEFAULT_WEIGHTS = {
    skills: 0.50,        // 50% weight for skills match
    experience: 0.30,    // 30% weight for experience level
    certifications: 0.20 // 20% weight for certifications
};

/**
 * Calculate skill match score for a job application
 * @param {Object} user - User document with populated roadmaps
 * @param {Object} job - Job posting document
 * @param {Object} weights - Optional custom weights
 * @returns {Object} Score details including overall score and breakdown
 */
async function calculateMatchScore(user, job, weights = DEFAULT_WEIGHTS) {
    // Extract user's skills from completed roadmaps and topics
    const userSkills = extractUserSkills(user);

    // Extract required skills from job
    const requiredSkills = job.requirements?.skills || [];

    // Calculate skills score
    const skillsScore = calculateSkillsScore(userSkills, requiredSkills);

    // Calculate experience score
    const experienceScore = calculateExperienceScore(user, job);

    // Calculate certifications score
    const certificationsScore = calculateCertificationsScore(user, job);

    // Calculate weighted overall score
    const overallScore = Math.round(
        (skillsScore.percentage * weights.skills) +
        (experienceScore.percentage * weights.experience) +
        (certificationsScore.percentage * weights.certifications)
    );

    return {
        overall: overallScore,
        breakdown: {
            skills: {
                score: skillsScore.percentage,
                weight: weights.skills,
                contribution: Math.round(skillsScore.percentage * weights.skills),
                matched: skillsScore.matched,
                missing: skillsScore.missing,
                total: skillsScore.total
            },
            experience: {
                score: experienceScore.percentage,
                weight: weights.experience,
                contribution: Math.round(experienceScore.percentage * weights.experience),
                userLevel: experienceScore.userLevel,
                requiredLevel: experienceScore.requiredLevel
            },
            certifications: {
                score: certificationsScore.percentage,
                weight: weights.certifications,
                contribution: Math.round(certificationsScore.percentage * weights.certifications),
                matched: certificationsScore.matched,
                total: certificationsScore.total
            }
        },
        skillGaps: skillsScore.missing,
        recommendations: generateRecommendations(skillsScore.missing, user)
    };
}

/**
 * Extract all skills from user's learning progress
 */
function extractUserSkills(user) {
    const skills = new Set();

    // Add skills from completed roadmap topics
    if (user.enrolledRoadmaps && Array.isArray(user.enrolledRoadmaps)) {
        user.enrolledRoadmaps.forEach(enrollment => {
            if (enrollment.roadmap) {
                // Add roadmap role/title as a skill
                if (enrollment.roadmap.role) {
                    enrollment.roadmap.role.split(/[,\/\s]+/).forEach(skill => {
                        if (skill.trim()) skills.add(skill.trim().toLowerCase());
                    });
                }

                // Add completed topics as skills
                if (enrollment.completedTopics && Array.isArray(enrollment.completedTopics)) {
                    enrollment.completedTopics.forEach(ct => {
                        if (ct.topic && ct.topic.title) {
                            skills.add(ct.topic.title.toLowerCase());
                        }
                    });
                }
            }
        });
    }

    // Add skills from language learning
    if (user.languageLearning && Array.isArray(user.languageLearning)) {
        user.languageLearning.forEach(lang => {
            if (lang.language && lang.language.name) {
                skills.add(lang.language.name.toLowerCase());
            }

            // Add completed language topics
            if (lang.completedTopics && Array.isArray(lang.completedTopics)) {
                lang.completedTopics.forEach(ct => {
                    if (ct.topic && ct.topic.title) {
                        skills.add(ct.topic.title.toLowerCase());
                    }
                });
            }
        });
    }

    // Add skills from badges
    if (user.badges && Array.isArray(user.badges)) {
        user.badges.forEach(badge => {
            if (badge.badge && badge.badge.name) {
                skills.add(badge.badge.name.toLowerCase());
            }
        });
    }

    return Array.from(skills);
}

/**
 * Calculate skills match score
 */
function calculateSkillsScore(userSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) {
        return {
            percentage: 100,
            matched: [],
            missing: [],
            total: 0
        };
    }

    const matched = [];
    const missing = [];

    requiredSkills.forEach(reqSkill => {
        const normalizedReqSkill = reqSkill.toLowerCase().trim();
        const isMatched = userSkills.some(userSkill => {
            const normalizedUserSkill = userSkill.toLowerCase().trim();
            // Exact match or contains match
            return normalizedUserSkill === normalizedReqSkill ||
                normalizedUserSkill.includes(normalizedReqSkill) ||
                normalizedReqSkill.includes(normalizedUserSkill);
        });

        if (isMatched) {
            matched.push(reqSkill);
        } else {
            missing.push(reqSkill);
        }
    });

    const percentage = Math.round((matched.length / requiredSkills.length) * 100);

    return {
        percentage,
        matched,
        missing,
        total: requiredSkills.length
    };
}

/**
 * Calculate experience level score
 */
function calculateExperienceScore(user, job) {
    const requiredExp = job.requirements?.experience?.toLowerCase() || '';
    const userLevel = user.preferences?.skillLevel || 'beginner';

    // Calculate total study time and completed topics as experience indicators
    const totalStudyMinutes = user.studyTime?.reduce((sum, day) => sum + (day.minutes || 0), 0) || 0;
    const totalStudyHours = totalStudyMinutes / 60;

    const totalCompletedTopics = user.enrolledRoadmaps?.reduce((sum, enrollment) => {
        return sum + (enrollment.completedTopics?.length || 0);
    }, 0) || 0;

    // Experience level mapping
    const experienceLevels = {
        'beginner': 0,
        'entry': 1,
        'junior': 1,
        'intermediate': 2,
        'mid': 2,
        'senior': 3,
        'advanced': 3,
        'expert': 4,
        'lead': 4
    };

    // Determine user's effective experience level based on learning progress
    let effectiveUserLevel = 0;
    if (userLevel === 'beginner' && (totalStudyHours > 100 || totalCompletedTopics > 20)) {
        effectiveUserLevel = 1; // Upgrade to intermediate
    } else if (userLevel === 'intermediate' && (totalStudyHours > 300 || totalCompletedTopics > 50)) {
        effectiveUserLevel = 2; // Upgrade to advanced
    } else {
        effectiveUserLevel = experienceLevels[userLevel] || 0;
    }

    // Parse required experience level
    let requiredLevel = 1; // Default to entry level
    for (const [key, value] of Object.entries(experienceLevels)) {
        if (requiredExp.includes(key)) {
            requiredLevel = value;
            break;
        }
    }

    // Calculate score
    let percentage = 0;
    if (effectiveUserLevel >= requiredLevel) {
        percentage = 100; // Meets or exceeds requirement
    } else if (effectiveUserLevel === requiredLevel - 1) {
        percentage = 70; // One level below
    } else if (effectiveUserLevel === requiredLevel - 2) {
        percentage = 40; // Two levels below
    } else {
        percentage = 20; // Significantly below
    }

    return {
        percentage,
        userLevel,
        effectiveLevel: effectiveUserLevel,
        requiredLevel,
        studyHours: Math.round(totalStudyHours),
        completedTopics: totalCompletedTopics
    };
}

/**
 * Calculate certifications score
 */
function calculateCertificationsScore(user, job) {
    const requiredCerts = job.requirements?.certifications || [];

    if (requiredCerts.length === 0) {
        return {
            percentage: 100,
            matched: [],
            total: 0
        };
    }

    // Extract user's certifications/badges
    const userCerts = user.badges?.map(b => b.badge?.name?.toLowerCase()) || [];

    const matched = requiredCerts.filter(reqCert => {
        const normalizedReqCert = reqCert.toLowerCase();
        return userCerts.some(userCert =>
            userCert?.includes(normalizedReqCert) || normalizedReqCert.includes(userCert)
        );
    });

    const percentage = Math.round((matched.length / requiredCerts.length) * 100);

    return {
        percentage,
        matched,
        total: requiredCerts.length
    };
}

/**
 * Generate learning recommendations based on skill gaps
 */
function generateRecommendations(missingSkills, user) {
    const recommendations = [];

    missingSkills.forEach(skill => {
        recommendations.push({
            skill,
            type: 'skill_gap',
            suggestion: `Consider learning ${skill} to improve your match`,
            action: 'Browse roadmaps and courses related to this skill'
        });
    });

    return recommendations;
}

/**
 * Batch calculate match scores for multiple users
 */
async function batchCalculateScores(userIds, jobId) {
    const job = await JobPosting.findById(jobId);
    if (!job) {
        throw new Error('Job not found');
    }

    const results = [];

    for (const userId of userIds) {
        const user = await User.findById(userId)
            .populate('enrolledRoadmaps.roadmap')
            .populate('enrolledRoadmaps.completedTopics.topic')
            .populate('languageLearning.language')
            .populate('languageLearning.completedTopics.topic')
            .populate('badges.badge');

        if (user) {
            const score = await calculateMatchScore(user, job);
            results.push({
                userId: user._id,
                userName: user.name,
                email: user.email,
                score
            });
        }
    }

    // Sort by overall score descending
    results.sort((a, b) => b.score.overall - a.score.overall);

    return results;
}

module.exports = {
    calculateMatchScore,
    batchCalculateScores,
    extractUserSkills,
    DEFAULT_WEIGHTS
};
