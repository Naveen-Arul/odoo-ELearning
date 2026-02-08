/**
 * SkillForge AI - LeetCode Submission Model
 * Tracks individual LeetCode problem submissions for activity heatmap
 */

const mongoose = require('mongoose');

const leetCodeSubmissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Problem details
    problemId: {
        type: String,
        required: true
    },
    problemTitle: {
        type: String,
        required: true
    },
    problemSlug: String,

    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        required: true
    },

    // Submission details
    status: {
        type: String,
        enum: ['accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compile_error'],
        default: 'accepted'
    },

    language: String,
    runtime: String,
    memory: String,

    // Timestamp
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
leetCodeSubmissionSchema.index({ user: 1, submittedAt: -1 });
leetCodeSubmissionSchema.index({ user: 1, problemId: 1 });

// Static method to get heatmap data for a user
leetCodeSubmissionSchema.statics.getHeatmapData = async function (userId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const submissions = await this.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                submittedAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    // Convert to object format
    const heatmapData = {};
    submissions.forEach(s => {
        heatmapData[s._id] = s.count;
    });

    return heatmapData;
};

// Static method to calculate streak stats
leetCodeSubmissionSchema.statics.getStreakStats = async function (userId, year) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Get all unique submission dates
    const submissions = await this.aggregate([
        {
            $match: {
                user: new mongoose.Types.ObjectId(userId),
                submittedAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    const activeDays = submissions.length;
    const totalSubmissions = submissions.reduce((sum, s) => sum + s.count, 0);

    // Calculate streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = submissions.map(s => new Date(s._id));

    // Sort dates
    dates.sort((a, b) => a - b);

    // Calculate max streak
    for (let i = 0; i < dates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const diff = (dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                tempStreak++;
            } else {
                maxStreak = Math.max(maxStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    maxStreak = Math.max(maxStreak, tempStreak);

    // Calculate current streak (from today backwards)
    if (dates.length > 0) {
        const lastDate = dates[dates.length - 1];
        lastDate.setHours(0, 0, 0, 0);

        const diffFromToday = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

        if (diffFromToday <= 1) {
            // Active today or yesterday
            currentStreak = 1;
            for (let i = dates.length - 2; i >= 0; i--) {
                const diff = (dates[i + 1] - dates[i]) / (1000 * 60 * 60 * 24);
                if (diff === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }
        }
    }

    return {
        totalSubmissions,
        activeDays,
        currentStreak,
        maxStreak
    };
};

const LeetCodeSubmission = mongoose.model('LeetCodeSubmission', leetCodeSubmissionSchema);

module.exports = LeetCodeSubmission;
