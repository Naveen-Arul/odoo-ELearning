/**
 * Certificate Routes - Verification and management
 */

const express = require('express');
const router = express.Router();
const Certificate = require('../models/Certificate');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * @route   POST /api/certificates/issue
 * @desc    Issue certificate for roadmap completion
 * @access  Private
 */
router.post('/issue', protect, asyncHandler(async (req, res) => {
    const { roadmapId, metadata } = req.body;

    // Check if already issued
    const existing = await Certificate.findOne({
        user: req.user.id,
        roadmap: roadmapId
    });

    if (existing && !existing.revoked) {
        throw new ApiError('Certificate already issued', 400);
    }

    const certificateId = `SKAI-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const certificate = await Certificate.create({
        user: req.user.id,
        roadmap: roadmapId,
        certificateId,
        metadata,
        verificationUrl: `${process.env.FRONTEND_URL}/verify/${certificateId}`
    });

    await certificate.populate(['user', 'roadmap'], 'name email title');

    res.status(201).json({
        success: true,
        data: certificate
    });
}));

/**
 * @route   GET /api/certificates/verify/:certificateId
 * @desc    Verify certificate authenticity
 * @access  Public
 */
router.get('/verify/:certificateId', asyncHandler(async (req, res) => {
    const certificate = await Certificate.findOne({
        certificateId: req.params.certificateId
    }).populate(['user', 'roadmap'], 'name title');

    if (!certificate) {
        throw new ApiError('Certificate not found', 404);
    }

    if (certificate.revoked) {
        return res.status(200).json({
            success: true,
            valid: false,
            message: 'Certificate has been revoked',
            revokedAt: certificate.revokedAt,
            reason: certificate.revokedReason
        });
    }

    res.status(200).json({
        success: true,
        valid: true,
        data: certificate
    });
}));

/**
 * @route   GET /api/certificates/my
 * @desc    Get user's certificates
 * @access  Private
 */
router.get('/my', protect, asyncHandler(async (req, res) => {
    const certificates = await Certificate.find({
        user: req.user.id,
        revoked: false
    }).populate('roadmap', 'title');

    res.status(200).json({
        success: true,
        data: certificates
    });
}));

module.exports = router;
