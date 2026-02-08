const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const Recruiter = require('../models/Recruiter');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/company
 * @desc    Create a new Company and Company Admin
 * @access  Private (Admin only)
 */
router.post('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const {
        companyName,
        description,
        website,
        industry,
        size,
        location,
        adminName,
        adminEmail,
        adminPassword
    } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Check if user email already exists
        let user = await User.findOne({ email: adminEmail }).session(session);
        if (user) {
            throw new ApiError('User with this email already exists', 400);
        }

        // 2. Create Company Admin User
        user = await User.create([{
            name: adminName,
            email: adminEmail,
            password: adminPassword,
            role: 'company_admin',
            isActive: true, // Auto-activate
            isOnboarded: true // Skip onboarding for admin-created users
        }], { session });

        const companyAdmin = user[0];

        // 3. Create Company
        const company = await Company.create([{
            name: companyName,
            description,
            website,
            industry,
            size,
            location,
            admin: companyAdmin._id,
            status: 'active',
            verified: true,
            contactInfo: {
                email: adminEmail // Default to admin email
            }
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: {
                company: company[0],
                admin: companyAdmin
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

/**
 * @route   GET /api/company
 * @desc    Get all companies
 * @access  Private (Admin only)
 */
router.get('/', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const companies = await Company.find()
        .populate('admin', 'name email')
        .populate('recruiters');

    res.status(200).json({
        success: true,
        count: companies.length,
        data: companies
    });
}));

/**
 * @route   POST /api/company/recruiter
 * @desc    Create a new Recruiter for the current company
 * @access  Private (Company Admin only)
 */
router.post('/recruiter', protect, authorize('company_admin'), asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        position,
        contactInfo
    } = req.body;

    // 1. Find the company managed by this admin
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
        throw new ApiError('No company found for this admin', 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Create Recruiter User
        let user = await User.findOne({ email }).session(session);
        if (user) {
            throw new ApiError('User with this email already exists', 400);
        }

        user = await User.create([{
            name,
            email,
            password,
            role: 'recruiter',
            isActive: true,
            isOnboarded: true
        }], { session });

        const recruiterUser = user[0];

        // 3. Create Recruiter Profile
        const recruiter = await Recruiter.create([{
            user: recruiterUser._id,
            company: company._id,
            contactInfo: {
                ...contactInfo,
                email: email // Ensure email matches
            },
            status: 'active',
            verified: true
        }], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            data: {
                recruiter: recruiter[0],
                user: recruiterUser
            }
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

/**
 * @route   GET /api/company/my-company
 * @desc    Get details of the company managed by current admin
 * @access  Private (Company Admin only)
 */
router.get('/my-company', protect, authorize('company_admin'), asyncHandler(async (req, res) => {
    const company = await Company.findOne({ admin: req.user.id })
        .populate({
            path: 'recruiters',
            populate: {
                path: 'user',
                select: 'name email avatar'
            }
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
 * @route   PUT /api/company/:id
 * @desc    Update company details
 * @access  Private (Admin only)
 */
router.put('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const {
        companyName,
        description,
        website,
        industry,
        size,
        location,
        status
    } = req.body;

    let company = await Company.findById(req.params.id);

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    // Update fields
    if (companyName) company.name = companyName;
    if (description) company.description = description;
    if (website) company.website = website;
    if (industry) company.industry = industry;
    if (size) company.size = size;
    if (location) company.location = location;
    if (status) company.status = status;

    await company.save();

    res.status(200).json({
        success: true,
        data: company
    });
}));

/**
 * @route   DELETE /api/company/:id
 * @desc    Delete company and its admin/recruiters
 * @access  Private (Admin only)
 */
router.delete('/:id', protect, authorize('admin'), asyncHandler(async (req, res) => {
    const company = await Company.findById(req.params.id);

    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Delete Company Admin User
        await User.findByIdAndDelete(company.admin).session(session);

        // 2. Delete Recruiters and their Users
        const recruiters = await Recruiter.find({ company: company._id }).session(session);
        for (const recruiter of recruiters) {
            await User.findByIdAndDelete(recruiter.user).session(session);
            await Recruiter.findByIdAndDelete(recruiter._id).session(session);
        }

        // 3. Delete Company
        await Company.findByIdAndDelete(company._id).session(session);

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Company and associated accounts deleted'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

/**
 * @route   DELETE /api/company/recruiter/:id
 * @desc    Delete a recruiter (Company Admin only)
 * @access  Private (Company Admin only)
 */
router.delete('/recruiter/:id', protect, authorize('company_admin'), asyncHandler(async (req, res) => {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
        throw new ApiError('Recruiter not found', 404);
    }

    // Check if this recruiter belongs to the admin's company
    const company = await Company.findOne({ admin: req.user.id });
    if (!company) {
        throw new ApiError('Company not found', 404);
    }

    if (recruiter.company.toString() !== company._id.toString()) {
        throw new ApiError('Not authorized to delete this recruiter', 403);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await User.findByIdAndDelete(recruiter.user).session(session);
        await Recruiter.findByIdAndDelete(recruiter._id).session(session);

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Recruiter deleted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}));

module.exports = router;
