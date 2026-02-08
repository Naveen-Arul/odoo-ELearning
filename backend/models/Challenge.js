/**
 * Challenge Model - Daily challenges and achievements
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ChallengeSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    type: {
        type: String,
        enum: ['daily', 'weekly', 'special'],
        default: 'daily'
    },
    criteria: {
        action: {
            type: String,
            enum: ['complete-topics', 'study-minutes', 'test-score', 'streak', 'ai-chat', 'help-peers'],
            required: true
        },
        target: Number,
        timeframe: String
    },
    rewards: {
        xp: {
            type: Number,
            default: 0
        },
        points: {
            type: Number,
            default: 0
        },
        badge: String,
        powerup: String
    },
    startDate: Date,
    endDate: Date,
    activeUsers: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        progress: {
            type: Number,
            default: 0
        },
        completed: {
            type: Boolean,
            default: false
        },
        completedAt: Date
    }],
    recurring: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes
ChallengeSchema.index({ type: 1, startDate: -1 });
ChallengeSchema.index({ 'activeUsers.user': 1 });

module.exports = mongoose.model('Challenge', ChallengeSchema);
