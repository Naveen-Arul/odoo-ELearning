/**
 * Company Routes - Admin manages companies, companies manage recruiters
 */

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const Recruiter = require('../models/Recruiter');
const { protect, isAdmin, isCompanyAdmin } = require('../middleware/auth');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

// Create middleware to check if user is company admin
const checkCompanyAdmin = asyncHandler(async (req, res, next) => {
    const company = await Company.findById(req.params.id || req.params.companyId);

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    // Check if user is the company admin or a system admin
    if (company.admin.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
        throw new ApiError('Not authorized to manage this company', 403);
    }

    req.company = company;
    next();
});

// ----- ADMIN ROUTES (Create & manage companies) -----

/**
 * @route   POST /api/companies
 * @desc    Create a new company with new admin credentials (Admin only)
 * @access  Admin
 */
router.post('/', protect, isAdmin, asyncHandler(async (req, res) => {
    const {
        name,
        description,
        website,
        industry,
        size,
        location,
        contactInfo,
        adminCredentials // { name, email, password }
    } = req.body;

    // Validate admin credentials
    if (!adminCredentials || !adminCredentials.name || !adminCredentials.email || !adminCredentials.password) {
        throw new ApiError('Admin credentials (name, email, password) are required', 400);
    }

    // Check if company already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
        throw new ApiError('Company with this name already exists', 400);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: adminCredentials.email });
    if (existingUser) {
        throw new ApiError('Email already registered', 400);
    }

    // Create new user for company admin
    const adminUser = await User.create({
        name: adminCredentials.name,
        email: adminCredentials.email,
        password: adminCredentials.password,
        roles: ['company_admin'],
        isActive: true
    });

    // Create company
    const company = await Company.create({
        name,
        description,
        website,
        industry,
        size,
        location,
        contactInfo,
        admin: adminUser._id,
        status: 'active',
        verified: true
    });

    await company.populate('admin', 'name email');

    res.status(201).json({
        success: true,
        data: company,
        message: `Company created successfully. Admin credentials: ${adminCredentials.email}`
    });
}));

/**
 * @route   GET /api/companies
 * @desc    Get all companies (Admin only)
 * @access  Admin
 */
router.get('/', protect, isAdmin, asyncHandler(async (req, res) => {
    const { status, search, limit = 50 } = req.query;

    const query = {};
    if (status) {
        query.status = status;
    }
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { industry: { $regex: search, $options: 'i' } },
            { 'contactInfo.email': { $regex: search, $options: 'i' } }
        ];
    }

    const companies = await Company.find(query)
        .populate('admin', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

    res.status(200).json({
        success: true,
        count: companies.length,
        data: companies
    });
}));

/**
 * @route   GET /api/companies/:id
 * @desc    Get single company
 * @access  Admin or Company Admin
 */
router.get('/:id', protect, asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id)
        .populate('admin', 'name email avatar')
        .populate('recruiters');

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    // Check authorization
    if (!req.user.roles.includes('admin') &&
        company.admin.toString() !== req.user._id.toString()) {
        throw new ApiError('Not authorized', 403);
    }

    res.status(200).json({
        success: true,
        data: company
    });
}));

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company
 * @access  Admin or Company Admin
 */
router.put('/:id', protect, checkCompanyAdmin, asyncHandler(async (req, res) => {
    const { name, description, website, industry, size, location, contactInfo, settings } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (website !== undefined) updateData.website = website;
    if (industry) updateData.industry = industry;
    if (size) updateData.size = size;
    if (location) updateData.location = location;
    if (contactInfo) updateData.contactInfo = contactInfo;
    if (settings) updateData.settings = settings;

    const company = await Company.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('admin', 'name email');

    res.status(200).json({
        success: true,
        data: company
    });
}));

/**
 * @route   PUT /api/companies/:id/status
 * @desc    Update company status (Admin only)
 * @access  Admin
 */
router.put('/:id/status', protect, isAdmin, asyncHandler(async (req, res) => {
    const { status } = req.body;

    const company = await Company.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
    ).populate('admin', 'name email');

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    res.status(200).json({
        success: true,
        data: company
    });
}));

/**
 * @route   DELETE /api/companies/:id
 * @desc    Delete company (Admin only)
 * @access  Admin
 */
router.delete('/:id', protect, isAdmin, asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    // Delete all recruiters associated with this company
    await Recruiter.deleteMany({ company: company._id });

    await company.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Company deleted successfully'
    });
}));

// ----- COMPANY ADMIN ROUTES (Manage recruiters) -----

/**
 * @route   GET /api/companies/me
 * @desc    Get my company (Company Admin)
 * @access  Company Admin
 */
router.get('/me/profile', protect, asyncHandler(async (req, res) => {
    const company = await Company.findOne({ admin: req.user._id })
        .populate('admin', 'name email avatar')
        .populate({
            path: 'recruiters',
            populate: { path: 'user', select: 'name email avatar' }
        });

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    res.status(200).json({
        success: true,
        data: company
    });
}));

/**
 * @route   GET /api/companies/:companyId/recruiters
 * @desc    Get all recruiters for a company
 * @access  Company Admin
 */
router.get('/:companyId/recruiters', protect, checkCompanyAdmin, asyncHandler(async (req, res) => {
    const recruiters = await Recruiter.find({ company: req.params.companyId })
        .populate('user', 'name email avatar')
        .populate('company', 'name')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: recruiters.length,
        data: recruiters
    });
}));

/**
 * @route   POST /api/companies/:companyId/recruiters
 * @desc    Create a recruiter for the company
 * @access  Company Admin
 */
router.post('/:companyId/recruiters', protect, checkCompanyAdmin, asyncHandler(async (req, res) => {
    const { userId, contactInfo } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError('User not found', 404);
    }

    // Check if user is already a recruiter
    const existingRecruiter = await Recruiter.findOne({ user: userId });
    if (existingRecruiter) {
        throw new ApiError('User is already a recruiter', 400);
    }

    // Check company recruiter limits
    const recruiterCount = await Recruiter.countDocuments({ company: req.company._id });
    if (recruiterCount >= req.company.settings.maxRecruiters) {
        throw new ApiError(`Maximum recruiter limit reached (${req.company.settings.maxRecruiters})`, 400);
    }

    // Create recruiter
    const recruiter = await Recruiter.create({
        user: userId,
        company: req.company._id,
        contactInfo,
        status: 'active',
        verified: true
    });

    // Update user roles
    if (!user.roles.includes('recruiter')) {
        user.roles.push('recruiter');
        await user.save();
    }

    // Update company stats
    req.company.stats.totalRecruiters += 1;
    await req.company.save();

    await recruiter.populate(['user', 'company']);

    res.status(201).json({
        success: true,
        data: recruiter
    });
}));

/**
 * @route   DELETE /api/companies/:companyId/recruiters/:recruiterId
 * @desc    Remove a recruiter from the company
 * @access  Company Admin
 */
router.delete('/:companyId/recruiters/:recruiterId', protect, checkCompanyAdmin, asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findOne({
        _id: req.params.recruiterId,
        company: req.params.companyId
    });

    if (!recruiter) {
        throw new ApiError('Recruiter not found', 404);
    }

    // Remove recruiter role from user
    const user = await User.findById(recruiter.user);
    if (user) {
        user.roles = user.roles.filter(role => role !== 'recruiter');
        await user.save();
    }

    await recruiter.deleteOne();

    // Update company stats
    req.company.stats.totalRecruiters = Math.max(0, req.company.stats.totalRecruiters - 1);
    await req.company.save();

    res.status(200).json({
        success: true,
        message: 'Recruiter removed successfully'
    });
}));

module.exports = router;
