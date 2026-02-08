/**
 * Adaptive Difficulty Service
 * Adjusts content difficulty based on user performance
 */

/**
 * Calculate user's performance score based on recent activity
 * @param {Object} user - User object with studyTime and enrolled roadmaps
 * @returns {Object} Performance metrics
 */
export function calculatePerformanceMetrics(user) {
    // Get last 7 days of study data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentStudy = user.studyTime?.filter(st =>
        new Date(st.date) >= sevenDaysAgo
    ) || [];

    // Calculate metrics
    const totalMinutes = recentStudy.reduce((sum, st) => sum + st.minutes, 0);
    const totalTopicsCompleted = recentStudy.reduce((sum, st) => sum + (st.topicsCompleted || 0), 0);
    const avgMinutesPerDay = totalMinutes / 7;
    const consistency = recentStudy.length / 7; // What % of days user studied

    // Calculate test performance from enrolled roadmaps
    let totalTests = 0;
    let totalScore = 0;

    user.enrolledRoadmaps?.forEach(enrollment => {
        enrollment.completedTopics?.forEach(ct => {
            if (ct.testScore !== undefined && ct.testScore !== null) {
                totalTests++;
                totalScore += ct.testScore;
            }
        });
    });

    const avgTestScore = totalTests > 0 ? totalScore / totalTests : 50;

    // Overall performance score (0-100)
    const performanceScore = Math.round(
        (avgTestScore * 0.5) + // 50% weight on test scores
        (Math.min(avgMinutesPerDay / 60, 1) * 100 * 0.3) + // 30% on study time
        (consistency * 100 * 0.2) // 20% on consistency
    );

    return {
        performanceScore,
        avgTestScore,
        avgMinutesPerDay,
        consistency,
        totalTopicsCompleted,
        level: getPerformanceLevel(performanceScore)
    };
}

/**
 * Get performance level from score
 */
function getPerformanceLevel(score) {
    if (score >= 80) return 'advanced';
    if (score >= 60) return 'intermediate';
    if (score >= 40) return 'beginner';
    return 'novice';
}

/**
 * Recommend difficulty level for next topic/test
 * @param {Object} metrics - Performance metrics
 * @param {String} currentDifficulty - Current difficulty setting
 * @returns {String} Recommended difficulty
 */
export function recommendDifficulty(metrics, currentDifficulty = 'medium') {
    const { performanceScore, avgTestScore } = metrics;

    // If user is doing very well, suggest harder content
    if (performanceScore >= 85 && avgTestScore >= 85) {
        return 'hard';
    }

    // If user is doing well, suggest medium-hard content
    if (performanceScore >= 70 && avgTestScore >= 75) {
        return currentDifficulty === 'easy' ? 'medium' : 'hard';
    }

    // If user is struggling, suggest easier content
    if (performanceScore < 40 || avgTestScore < 50) {
        return 'easy';
    }

    // Default to medium
    return 'medium';
}

/**
 * Sort topics by adaptive difficulty
 * Places easier/harder topics based on user performance
 */
export function sortTopicsByAdaptiveDifficulty(topics, userMetrics) {
    const recommendedDiff = recommendDifficulty(userMetrics);

    // Prioritize topics matching recommended difficulty
    return [...topics].sort((a, b) => {
        const aDiff = a.difficulty || 'medium';
        const bDiff = b.difficulty || 'medium';

        // Perfect match gets highest priority
        if (aDiff === recommendedDiff && bDiff !== recommendedDiff) return -1;
        if (bDiff === recommendedDiff && aDiff !== recommendedDiff) return 1;

        // Otherwise maintain original order
        return 0;
    });
}

/**
 * Get personalized study plan settings
 */
export function getAdaptiveStudySettings(userMetrics) {
    const { performanceScore, avgMinutesPerDay } = userMetrics;

    // Adjust topics per day based on performance and capacity
    let topicsPerDay = 3; // default

    if (avgMinutesPerDay >= 120 && performanceScore >= 70) {
        topicsPerDay = 5; // High performer with time
    } else if (avgMinutesPerDay >= 60 && performanceScore >= 60) {
        topicsPerDay = 4; // Good performer
    } else if (performanceScore < 40) {
        topicsPerDay = 2; // Struggling, reduce load
    }

    return {
        topicsPerDay,
        recommendedDifficulty: recommendDifficulty(userMetrics),
        estimatedMinutesPerTopic: performanceScore >= 70 ? 30 : 45,
        shouldReviewPrevious: performanceScore < 60
    };
}
