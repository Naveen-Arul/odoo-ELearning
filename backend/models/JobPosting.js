/**
 * SkillForge AI - Job Posting Model
 * Job listings posted by recruiters
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobPostingSchema = new Schema({
    recruiter: {
        type: Schema.Types.ObjectId,
        ref: 'Recruiter',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    requirements: {
        skills: [String],
        experience: String,
        education: String,
        certifications: [String]
    },
    responsibilities: [String],
    location: {
        city: String,
        state: String,
        country: String,
        remote: {
            type: Boolean,
            default: false
        }
    },
    salary: {
        min: Number,
        max: Number,
        currency: {
            type: String,
            default: 'USD'
        },
        period: {
            type: String,
            enum: ['hourly', 'monthly', 'yearly'],
            default: 'yearly'
        }
    },
    type: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'internship'],
        default: 'full-time'
    },
    category: {
        type: String,
        enum: ['software-engineering', 'data-science', 'devops', 'frontend', 'backend', 'fullstack', 'mobile', 'other'],
        default: 'software-engineering'
    },
    relatedRoadmaps: [{
        type: Schema.Types.ObjectId,
        ref: 'Roadmap'
    }],
    status: {
        type: String,
        enum: ['draft', 'active', 'closed', 'filled'],
        default: 'draft'
    },
    applications: [{
        type: Schema.Types.ObjectId,
        ref: 'JobApplication'
    }],
    stats: {
        views: {
            type: Number,
            default: 0
        },
        applications: {
            type: Number,
            default: 0
        },
        shortlisted: {
            type: Number,
            default: 0
        }
    },
    deadline: Date,
    postedAt: {
        type: Date,
        default: Date.now
    },
    // -- Enhanced Hiring Features --
    rounds: [{
        name: { type: String, required: true },
        type: {
            type: String,
            enum: ['screening', 'test', 'technical', 'hr', 'assignment', 'presentation', 'other'],
            default: 'technical'
        },
        duration: String, // e.g. "45 minutes"
        passingScore: Number,
        evaluationCriteria: String,
        capacity: Number // Max applicants for this specific round
    }],
    maxApplicants: {
        type: Number,
        default: 0 // 0 = unlimited 
    },
    maxApplicantsPerRound: {
        type: Number,
        default: 0 // Default capacity if not specified in round
    },
    emailConfig: {
        triggers: [{
            stage: String, // e.g., 'application_received', 'round_scheduled', 'rejected'
            template: String,
            subject: String,
            delay: { type: Number, default: 0 }, // hours
            active: { type: Boolean, default: true }
        }]
    },
    configuredSkills: [{ // Enhanced skills with importance
        name: String,
        level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
        importance: { type: String, enum: ['mandatory', 'preferred', 'bonus'], default: 'mandatory' }
    }]
}, {
    timestamps: true
});

// Indexes
JobPostingSchema.index({ status: 1, postedAt: -1 });
JobPostingSchema.index({ 'requirements.skills': 1 });
JobPostingSchema.index({ category: 1 });
JobPostingSchema.index({ recruiter: 1 });

module.exports = mongoose.model('JobPosting', JobPostingSchema);
