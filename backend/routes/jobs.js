/**
 * SkillForge AI - Job Posting Routes
 * Job listings and applications
 */

const express = require('express');
const router = express.Router();
const JobPosting = require('../models/JobPosting');
const JobApplication = require('../models/JobApplication');
const Recruiter = require('../models/Recruiter');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/jobs
 * @desc    Get all job postings with filters
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
    const { category, type, location, remote, skills, page = 1, limit = 20, sort = 'recent' } = req.query;

    const query = { status: 'active' };
    if (category) query.category = category;
    if (type) query.type = type;
    if (location) query['location.city'] = new RegExp(location, 'i');
    if (remote === 'true') query['location.remote'] = true;
    if (skills) query['requirements.skills'] = { $in: skills.split(',') };

    let sortOption = {};
    switch (sort) {
        case 'recent':
            sortOption = { postedAt: -1 };
            break;
        case 'salary':
            sortOption = { 'salary.max': -1 };
            break;
        default:
            sortOption = { postedAt: -1 };
    }

    const jobs = await JobPosting.find(query)
        .populate('recruiter', 'company')
        .populate('relatedRoadmaps', 'title')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    const total = await JobPosting.countDocuments(query);

    res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   POST /api/jobs
 * @desc    Create job posting (Recruiter only)
 * @access  Private
 */
router.post('/', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id, status: 'active' }).populate('company');

    if (!recruiter) {
        throw new ApiError('Active recruiter account required', 403);
    }

    const jobData = {
        ...req.body,
        recruiter: recruiter._id,
        company: recruiter.company.name
    };

    const job = await JobPosting.create(jobData);

    // Update recruiter
    recruiter.jobsPosted.push(job._id);
    recruiter.stats.totalJobsPosted += 1;
    await recruiter.save();

    res.status(201).json({
        success: true,
        data: job
    });
}));

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job posting
 * @access  Public
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const job = await JobPosting.findById(req.params.id)
        .populate('recruiter', 'company contactInfo')
        .populate('relatedRoadmaps', 'title description');

    if (!job) {
        throw new ApiError('Job not found', 404);
    }

    // Increment views
    job.stats.views += 1;
    await job.save();

    res.status(200).json({
        success: true,
        data: job
    });
}));

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update job posting
 * @access  Private (Recruiter only)
 */
router.put('/:id', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
        throw new ApiError('Recruiter account required', 403);
    }

    const job = await JobPosting.findOne({ _id: req.params.id, recruiter: recruiter._id });

    if (!job) {
        throw new ApiError('Job not found or unauthorized', 404);
    }

    const allowedUpdates = ['title', 'description', 'requirements', 'responsibilities', 'location', 'salary', 'type', 'status', 'deadline'];
    allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
            job[field] = req.body[field];
        }
    });

    await job.save();

    res.status(200).json({
        success: true,
        data: job
    });
}));

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job posting
 * @access  Private (Recruiter only)
 */
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
        throw new ApiError('Recruiter account required', 403);
    }

    const job = await JobPosting.findOne({ _id: req.params.id, recruiter: recruiter._id });

    if (!job) {
        throw new ApiError('Job not found or unauthorized', 404);
    }

    await job.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Job deleted'
    });
}));

/**
 * @route   GET /api/jobs/:id/match-preview
 * @desc    Get skill match preview before applying
 * @access  Private
 */
router.get('/:id/match-preview', protect, asyncHandler(async (req, res) => {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
        throw new ApiError('Job not found', 404);
    }

    // Get user with all populated data for skill matching
    const user = await User.findById(req.user.id)
        .populate('enrolledRoadmaps.roadmap')
        .populate('enrolledRoadmaps.completedTopics.topic')
        .populate('languageLearning.language')
        .populate('languageLearning.completedTopics.topic')
        .populate('badges.badge');

    // Use advanced skill matching service
    const skillMatcher = require('../services/skillMatcher');
    const matchResult = await skillMatcher.calculateMatchScore(user, job);

    res.status(200).json({
        success: true,
        data: matchResult
    });
}));

/**
 * @route   POST /api/jobs/:id/apply
 * @desc    Apply to a job
 * @access  Private
 */
router.post('/:id/apply', protect, asyncHandler(async (req, res) => {
    const job = await JobPosting.findById(req.params.id);

    if (!job) {
        throw new ApiError('Job not found', 404);
    }

    if (job.status !== 'active') {
        throw new ApiError('Job is not accepting applications', 400);
    }

    // Check application limit
    if (job.maxApplicants > 0) {
        const currentApplications = await JobApplication.countDocuments({ job: job._id });
        if (currentApplications >= job.maxApplicants) {
            throw new ApiError('This job has reached its maximum application limit', 400);
        }
    }

    // Check if already applied
    const existingApp = await JobApplication.findOne({
        job: job._id,
        applicant: req.user.id
    });

    if (existingApp) {
        throw new ApiError('You have already applied to this job', 400);
    }

    const { resume, coverLetter, answers } = req.body;

    // Get user with all populated data for skill matching
    const user = await User.findById(req.user.id)
        .populate('enrolledRoadmaps.roadmap')
        .populate('enrolledRoadmaps.completedTopics.topic')
        .populate('languageLearning.language')
        .populate('languageLearning.completedTopics.topic')
        .populate('badges.badge');

    // Use advanced skill matching service
    const skillMatcher = require('../services/skillMatcher');
    const matchResult = await skillMatcher.calculateMatchScore(user, job);

    const application = await JobApplication.create({
        job: job._id,
        applicant: req.user.id,
        resume,
        coverLetter,
        answers,
        matchScore: matchResult.overall,
        skillAnalysis: {
            breakdown: matchResult.breakdown,
            skillGaps: matchResult.skillGaps,
            recommendations: matchResult.recommendations
        },
        timeline: [{
            status: 'submitted',
            date: new Date(),
            note: `Application submitted with ${matchResult.overall}% match score`
        }]
    });

    // Update job stats
    job.applications.push(application._id);
    job.stats.applications += 1;
    await job.save();

    // Update recruiter stats
    await Recruiter.findByIdAndUpdate(job.recruiter, {
        $inc: { 'stats.totalApplications': 1 }
    });

    await application.populate('applicant', 'name email');

    res.status(201).json({
        success: true,
        data: application,
        matchAnalysis: matchResult
    });
}));

/**
 * @route   GET /api/jobs/my/applications
 * @desc    Get user's job applications
 * @access  Private
 */
router.get('/my/applications', protect, asyncHandler(async (req, res) => {
    const applications = await JobApplication.find({ applicant: req.user.id })
        .populate('job', 'title company location type')
        .sort({ appliedAt: -1 });

    res.status(200).json({
        success: true,
        data: applications
    });
}));

/**
 * @route   GET /api/jobs/:id/applications
 * @desc    Get applications for a job (Recruiter only)
 * @access  Private
 */
router.get('/:id/applications', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
        throw new ApiError('Recruiter account required', 403);
    }

    const job = await JobPosting.findOne({ _id: req.params.id, recruiter: recruiter._id });

    if (!job) {
        throw new ApiError('Job not found or unauthorized', 404);
    }

    const applications = await JobApplication.find({ job: job._id })
        .populate('applicant', 'name email careerData')
        .sort({ matchScore: -1, appliedAt: -1 });

    res.status(200).json({
        success: true,
        data: applications
    });
}));

/**
 * @route   PUT /api/jobs/applications/:id/status
 * @desc    Update application status (Recruiter only)
 * @access  Private
 */
router.put('/applications/:id/status', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
        throw new ApiError('Recruiter account required', 403);
    }

    const application = await JobApplication.findById(req.params.id).populate('job');

    if (!application) {
        throw new ApiError('Application not found', 404);
    }

    if (application.job.recruiter.toString() !== recruiter._id.toString()) {
        throw new ApiError('Unauthorized', 403);
    }

    const { status, note } = req.body;

    application.status = status;
    application.timeline.push({
        status,
        date: new Date(),
        note
    });

    if (status === 'shortlisted') {
        application.job.stats.shortlisted += 1;
        await application.job.save();
    }

    await application.save();

    res.status(200).json({
        success: true,
        data: application
    });
}));

/**
     * @route   PUT /api/jobs/applications/:id/move-round
     * @desc    Move applicant to next/specific round
     * @access  Private (Recruiter only)
     */
router.put('/applications/:id/move-round', protect, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({ user: req.user.id });
    if (!recruiter) throw new ApiError('Recruiter account required', 403);

    const application = await JobApplication.findById(req.params.id)
        .populate({
            path: 'job',
            populate: { path: 'recruiter' } // Ensure we get recruiter
        })
        .populate('applicant', 'name email');

    if (!application) throw new ApiError('Application not found', 404);

    // Verify ownership
    if (application.job.recruiter._id.toString() !== recruiter._id.toString()) {
        throw new ApiError('Unauthorized', 403);
    }

    const { roundIndex, status, feedback, score, scheduledAt, meetingLink } = req.body;
    const job = application.job;
    const previousRoundIndex = application.currentRound ? application.currentRound.roundIndex : -1;

    // Validation: Check round index validity
    if (roundIndex !== undefined) {
        if (roundIndex < 0 || (job.rounds && roundIndex >= job.rounds.length)) {
            throw new ApiError('Invalid round index', 400);
        }

        // Capacity Check 
        if (status !== 'rejected' && job.rounds && job.rounds[roundIndex] && job.rounds[roundIndex].capacity) {
            // Count active applicants in this round
            const activeInRound = await JobApplication.countDocuments({
                job: job._id,
                'currentRound.roundIndex': roundIndex,
                status: { $nin: ['rejected', 'withdrawn'] }
            });
            if (activeInRound >= job.rounds[roundIndex].capacity) {
                // Allow if we are just updating status of someone ALREADY there, but not if moving IN
                if (application.currentRound.roundIndex !== roundIndex) {
                    throw new ApiError(`Round capacity (${job.rounds[roundIndex].capacity}) reached`, 400);
                }
            }
        }
    }

    // Update History
    if (previousRoundIndex >= 0 && job.rounds && job.rounds[previousRoundIndex]) {
        application.roundHistory.push({
            roundIndex: previousRoundIndex,
            name: job.rounds[previousRoundIndex].name,
            score: application.currentRound.score || 0, // capture previous score
            feedback: application.currentRound.feedback || '',
            completedAt: new Date(),
            status: 'completed'
        });
    }

    // Provide default status based on movement
    let newStatus = status || 'in-progress';
    if (!status && roundIndex > previousRoundIndex) newStatus = 'pending';

    // Update Current Round
    if (roundIndex !== undefined) {
        application.currentRound = {
            roundIndex,
            status: newStatus,
            scheduledAt,
            meetingLink
        };
    } else {
        // Just updating status/score of current round
        if (status) application.currentRound.status = status;
        if (scheduledAt) application.currentRound.scheduledAt = scheduledAt;
        if (meetingLink) application.currentRound.meetingLink = meetingLink;
    }

    // Update Global Status if needed (e.g. if rejected or all rounds done)
    if (status === 'rejected') application.status = 'rejected';
    else if (status === 'accepted') application.status = 'accepted';
    else if (job.rounds && roundIndex === job.rounds.length - 1 && status === 'passed') {
        // Passed final round implies accepted or offer stage
        application.status = 'interview-scheduled'; // or custom status
    }

    await application.save();

    // -- Email Automation Trigger --
    const emailService = require('../services/emailService');
    const stage = status === 'rejected' ? 'rejected' :
        (roundIndex > previousRoundIndex ? 'round_upgraded' : 'round_update');

    // Find custom trigger from job
    // Simplified trigger logic for now
    if (job.emailConfig && job.emailConfig.triggers) {
        const trigger = job.emailConfig.triggers.find(t => t.stage === stage && t.active);
        if (trigger) {
            await emailService.sendHiringUpdate({
                to: application.applicant.email,
                subject: trigger.subject,
                template: trigger.template,
                data: {
                    candidateName: application.applicant.name,
                    jobTitle: job.title,
                    companyName: job.company,
                    roundName: (job.rounds && job.rounds[roundIndex]) ? job.rounds[roundIndex].name : 'Update'
                }
            });
        }
    }

    res.status(200).json({
        success: true,
        data: application
    });
}));

/**
 * @route   POST /api/jobs/applications/bulk-action
 * @desc    Perform bulk actions on applicants
 * @access  Private (Recruiter only)
 */
router.post('/applications/bulk-action', protect, asyncHandler(async (req, res) => {
    const { applicationIds, action, data } = req.body; // action: 'move', 'reject', 'email'
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) throw new ApiError('Recruiter required', 403);
    if (!applicationIds || !applicationIds.length) throw new ApiError('No applications selected', 400);

    const inputs = {
        roundIndex: data.roundIndex,
        status: data.status,
        feedback: data.feedback
    };

    let updatedCount = 0;

    // Use loop to handle Logic & Hooks nicely (slower but safer for complex logic like capacity/email)
    // For production with thousands, use bulkWrite, but for ~50 it's fine.
    for (const appId of applicationIds) {
        try {
            const app = await JobApplication.findById(appId).populate('job');
            if (app && app.job.recruiter.equals(recruiter._id)) {
                // Reuse logic? Or simplify.
                // Implementing simplified bulk logic
                if (action === 'move') {
                    app.currentRound = {
                        roundIndex: inputs.roundIndex || (app.currentRound.roundIndex + 1),
                        status: 'pending'
                    };
                } else if (action === 'reject') {
                    app.status = 'rejected';
                    app.currentRound.status = 'failed';
                }

                await app.save();
                updatedCount++;
            }
        } catch (e) { console.error(`Failed to update ${appId}`, e); }
    }

    res.json({ success: true, updated: updatedCount });
}));

module.exports = router;
