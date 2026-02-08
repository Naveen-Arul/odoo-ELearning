/**
 * SkillForge AI - Job Application Model
 * Student applications to job postings
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobApplicationSchema = new Schema({
    job: {
        type: Schema.Types.ObjectId,
        ref: 'JobPosting',
        required: true
    },
    applicant: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resume: {
        url: String,
        uploadedAt: Date
    },
    coverLetter: String,
    answers: [{
        question: String,
        answer: String
    }],
    status: {
        type: String,
        enum: ['submitted', 'under-review', 'shortlisted', 'interview-scheduled', 'offer-sent', 'rejected', 'accepted'],
        default: 'submitted'
    },
    timeline: [{
        status: String,
        date: Date,
        note: String
    }],
    matchScore: {
        type: Number,
        min: 0,
        max: 100
    },
    skillAnalysis: {
        breakdown: {
            skills: {
                score: Number,
                weight: Number,
                contribution: Number,
                matched: [String],
                missing: [String],
                total: Number
            },
            experience: {
                score: Number,
                weight: Number,
                contribution: Number,
                userLevel: String,
                requiredLevel: Number
            },
            certifications: {
                score: Number,
                weight: Number,
                contribution: Number,
                matched: [String],
                total: Number
            }
        },
        skillGaps: [String],
        recommendations: [{
            skill: String,
            type: String,
            suggestion: String,
            action: String
        }]
    },
    recruiterNotes: String,
    appliedAt: {
        type: Date,
        default: Date.now
    },
    // -- Enhanced Hiring Features --
    currentRound: {
        roundIndex: { type: Number, default: 0 }, // Index in JobPosting.rounds array
        status: {
            type: String,
            enum: ['pending', 'scheduled', 'in-progress', 'completed', 'passed', 'failed'],
            default: 'pending'
        },
        scheduledAt: Date, // For interviews/tests
        meetingLink: String
    },
    roundHistory: [{
        roundIndex: Number,
        name: String,
        score: Number,
        feedback: String,
        completedAt: Date,
        status: String,
        interviewer: String // Name or ID
    }]
}, {
    timestamps: true
});

// Indexes
JobApplicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
JobApplicationSchema.index({ applicant: 1, status: 1 });
JobApplicationSchema.index({ job: 1, status: 1 });
JobApplicationSchema.index({ matchScore: -1 });

module.exports = mongoose.model('JobApplication', JobApplicationSchema);
