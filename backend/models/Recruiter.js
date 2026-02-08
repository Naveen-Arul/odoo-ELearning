/**
 * SkillForge AI - Recruiter Model
 * Company recruiters who post jobs
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecruiterSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    company: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    contactInfo: {
        email: String,
        phone: String,
        linkedin: String
    },
    verified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'suspended'],
        default: 'pending'
    },
    jobsPosted: [{
        type: Schema.Types.ObjectId,
        ref: 'JobPosting'
    }],
    subscription: {
        plan: {
            type: String,
            enum: ['free', 'basic', 'premium'],
            default: 'free'
        },
        expiresAt: Date
    },
    stats: {
        totalJobsPosted: {
            type: Number,
            default: 0
        },
        totalApplications: {
            type: Number,
            default: 0
        },
        totalHires: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes
RecruiterSchema.index({ 'company.name': 1 });
RecruiterSchema.index({ status: 1 });
RecruiterSchema.index({ verified: 1 });

module.exports = mongoose.model('Recruiter', RecruiterSchema);
