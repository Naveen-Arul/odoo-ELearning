const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    profileImage: {
        type: String,
        default: ''
    },
    targetRole: {
        type: String,
        default: 'Explorer'
    },
    overallScore: {
        type: Number,
        default: 0
    },
    xp: {
        type: Number,
        default: 0,
        index: true // Indexed for fast Leaderboard sorting
    },
    level: {
        type: Number,
        default: 1
    },
    badges: [{
        name: { type: String, required: true },
        icon: { type: String, required: true },
        description: { type: String },
        unlockedAt: { type: Date, default: Date.now }
    }],
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
