/**
 * Company Model - Companies that hire through the platform
 */

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        trim: true
    },
    industry: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
        default: '1-10'
    },
    location: {
        address: String,
        city: String,
        state: String,
        country: String,
        zipCode: String
    },
    contactInfo: {
        email: {
            type: String,
            required: [true, 'Contact email is required'],
            trim: true,
            lowercase: true
        },
        phone: String,
        linkedin: String,
        twitter: String
    },
    // Company admin user
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Company admin is required']
    },
    // Account status
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'pending'
    },
    verified: {
        type: Boolean,
        default: false
    },
    // Subscription/Plan
    plan: {
        type: String,
        enum: ['free', 'basic', 'premium', 'enterprise'],
        default: 'free'
    },
    // Statistics
    stats: {
        totalRecruiters: {
            type: Number,
            default: 0
        },
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
    },
    // Settings
    settings: {
        allowMultipleRecruiters: {
            type: Boolean,
            default: true
        },
        maxRecruiters: {
            type: Number,
            default: 5
        },
        requireApproval: {
            type: Boolean,
            default: false
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Create slug from name
companySchema.pre('save', function (next) {
    if (this.isModified('name')) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    next();
});

// Virtual for recruiters
companySchema.virtual('recruiters', {
    ref: 'Recruiter',
    localField: '_id',
    foreignField: 'company'
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ slug: 1 });
companySchema.index({ status: 1 });
companySchema.index({ admin: 1 });

module.exports = mongoose.model('Company', companySchema);
