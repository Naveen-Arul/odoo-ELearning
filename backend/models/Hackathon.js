/**
 * Hackathon Model - Community project hackathons
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HackathonSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    description: String,
    organizer: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    theme: String,
    prizes: [{
        rank: Number,
        prize: String,
        amount: Number
    }],
    participants: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        team: String,
        registeredAt: {
            type: Date,
            default: Date.now
        }
    }],
    submissions: [{
        team: String,
        members: [{
            type: Schema.Types.ObjectId,
            ref: 'User'
        }],
        projectTitle: String,
        description: String,
        githubUrl: String,
        liveUrl: String,
        submittedAt: {
            type: Date,
            default: Date.now
        },
        score: Number
    }],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'ended'],
        default: 'upcoming'
    },
    maxParticipants: Number
}, {
    timestamps: true
});

// Indexes
HackathonSchema.index({ status: 1, startDate: -1 });

module.exports = mongoose.model('Hackathon', HackathonSchema);
