/**
 * SkillForge AI - Recruiter Routes
 * Recruiter management and operations
 */

const express = require('express');
const router = express.Router();
const Recruiter = require('../models/Recruiter');
const JobPosting = require('../models/JobPosting');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/recruiters/create
 * @desc    Create recruiter account (Admin only)
 * @access  Private/Admin
 */
router.post('/create', protect, isAdmin, asyncHandler(async (req, res) => {
    const { userId, company, contactInfo } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError('User not found', 404);
    }

    // Check if already a recruiter
    const existing = await Recruiter.findOne({ user: userId });
    if (existing) {
        throw new ApiError('User already has a recruiter account', 400);
    }

    const recruiter = await Recruiter.create({
        user: userId,
        company,
        contactInfo,
        status: 'active',
        verified: true
    });

    // Update user role
    await User.findByIdAndUpdate(userId, {
        $push: { roles: { $each: ['recruiter'], $position: 0 } }
    });

    await recruiter.populate('user', 'name email');

    res.status(201).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   POST /api/recruiters/apply
 * @desc    Apply to become a recruiter
 * @access  Private
 */
router.post('/apply', protect, asyncHandler(async (req, res) => {
    const { company, contactInfo } = req.body;

    // Check if already a recruiter
    const existing = await Recruiter.findOne({ user: req.user.id });
    if (existing) {
        throw new ApiError('You already have a recruiter account', 400);
    }

    const recruiter = await Recruiter.create({
        user: req.user.id,
        company,
        contactInfo,
        status: 'pending'
    });

    await recruiter.populate('user', 'name email');

    res.status(201).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   GET /api/recruiters/me
 * @desc    Get current recruiter profile
 * @access  Private
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id })
        .populate('user', 'name email')
        .populate('jobsPosted');

    if (!recruiter) {
        throw new ApiError('Recruiter profile not found', 404);
    }

    res.status(200).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   PUT /api/recruiters/me
 * @desc    Update recruiter profile
 * @access  Private
 */
router.put('/me', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
        throw new ApiError('Recruiter profile not found', 404);
    }

    const { contactInfo } = req.body;

    // Only contactInfo can be updated by recruiter
    // Company reference is managed by company admin
    if (contactInfo) {
        recruiter.contactInfo = { ...recruiter.contactInfo.toObject(), ...contactInfo };
    }

    await recruiter.save();
    await recruiter.populate('user', 'name email');
    await recruiter.populate('company', 'name industry');

    res.status(200).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   GET /api/recruiters
 * @desc    Get all recruiters (Admin only)
 * @access  Private/Admin
 */
router.get('/', protect, isAdmin, asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const recruiters = await Recruiter.find(query)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Recruiter.countDocuments(query);

    res.status(200).json({
        success: true,
        data: recruiters,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   PUT /api/recruiters/:id/approve
 * @desc    Approve recruiter application
 * @access  Private/Admin
 */
router.put('/:id/approve', protect, isAdmin, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
        throw new ApiError('Recruiter not found', 404);
    }

    recruiter.status = 'active';
    recruiter.verified = true;
    await recruiter.save();

    // Update user role
    await User.findByIdAndUpdate(recruiter.user, {
        $push: { roles: { $each: ['recruiter'], $position: 0 } }
    });

    res.status(200).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   PUT /api/recruiters/:id/suspend
 * @desc    Suspend recruiter account
 * @access  Private/Admin
 */
router.put('/:id/suspend', protect, isAdmin, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
        throw new ApiError('Recruiter not found', 404);
    }

    recruiter.status = 'suspended';
    await recruiter.save();

    res.status(200).json({
        success: true,
        message: 'Recruiter suspended'
    });
}));

/**
 * @route   DELETE /api/recruiters/:id
 * @desc    Delete recruiter account
 * @access  Private/Admin
 */
router.delete('/:id', protect, isAdmin, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
        throw new ApiError('Recruiter not found', 404);
    }

    // Delete all associated job postings
    await JobPosting.deleteMany({ recruiter: recruiter._id });

    await recruiter.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Recruiter deleted'
    });
}));

/**
 * @route   GET /api/recruiters/dashboard-stats
 * @desc    Get aggregated stats for recruiter dashboard
 * @access  Private
 */
router.get('/dashboard-stats', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });
    if (!recruiter) throw new ApiError('Recruiter required', 403);

    const JobApplication = require('../models/JobApplication');

    // 1. Get all jobs by this recruiter
    const jobs = await JobPosting.find({ recruiter: recruiter._id }).select('_id status title');
    const jobIds = jobs.map(j => j._id);

    // 2. Aggregate applications
    const stats = await JobApplication.aggregate([
        { $match: { job: { $in: jobIds } } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);

    // 3. Map to pipeline
    const pipeline = {
        applied: 0,
        shortlisted: 0,
        interview: 0,
        offer: 0,
        hired: 0,
        rejected: 0
    };

    let totalApplications = 0;

    stats.forEach(s => {
        totalApplications += s.count;
        switch (s._id) {
            case 'submitted':
            case 'under-review':
                pipeline.applied += s.count;
                break;
            case 'shortlisted':
                pipeline.shortlisted += s.count;
                break;
            case 'interview-scheduled':
                pipeline.interview += s.count;
                break;
            case 'offer-sent':
                pipeline.offer += s.count;
                break;
            case 'accepted':
                pipeline.hired += s.count;
                break;
            case 'rejected':
                pipeline.rejected += s.count;
                break;
        }
    });

    // 4. Get active vs closed jobs config
    const activeJobs = jobs.filter(j => j.status === 'active').length;
    const closedJobs = jobs.filter(j => j.status === 'closed' || j.status === 'filled').length;

    // 5. Recent Activity (simple version: last 5 apps)
    const recentActivity = await JobApplication.find({ job: { $in: jobIds } })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('applicant', 'name')
        .populate('job', 'title');

    res.status(200).json({
        success: true,
        data: {
            overview: {
                totalJobs: jobs.length,
                activeJobs,
                closedJobs,
                totalApplications,
                hired: pipeline.hired
            },
            pipeline,
            recentActivity
        }
    });
}));

module.exports = router;
