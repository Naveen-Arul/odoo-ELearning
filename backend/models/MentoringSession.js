/**
 * SkillForge AI - Mentoring Session Schema
 */

const mongoose = require('mongoose');

const mentoringSessionSchema = new mongoose.Schema({
    mentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MentorProfile',
        required: true
    },
    mentee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    duration: { // in minutes
        type: Number,
        required: true,
        default: 30
    },
    message: { // Initial message from mentee
        type: String,
        trim: true
    },
    topics: [{
        type: String,
        trim: true
    }],
    meetingLink: String,
    notes: String
}, {
    timestamps: true
});

// Index for efficient queries
mentoringSessionSchema.index({ mentor: 1, status: 1 });
mentoringSessionSchema.index({ mentee: 1, status: 1 });
mentoringSessionSchema.index({ scheduledAt: 1 });

const MentoringSession = mongoose.model('MentoringSession', mentoringSessionSchema);

module.exports = MentoringSession;
