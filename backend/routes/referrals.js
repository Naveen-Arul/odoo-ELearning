const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// @route   POST /api/referrals/generate
// @desc    Generate or retrieve referral code for the current user
// @access  Private
router.post('/generate', protect, asyncHandler(async (req, res) => {
    let user = await User.findById(req.user.id);

    if (!user.referralCode) {
        // Generate a 8-char random alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        user.referralCode = code;
        await user.save();
    }

    res.status(200).json({
        success: true,
        data: {
            referralCode: user.referralCode,
            link: `${process.env.CLIENT_URL || 'http://localhost:3000'}/register?ref=${user.referralCode}`
        }
    });
}));

// @route   GET /api/referrals/stats
// @desc    Get referral statistics for users
// @access  Private
router.get('/stats', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    // Find users referred by this user
    const referrals = await User.find({ referredBy: req.user.id })
        .select('name avatar createdAt')
        .sort('-createdAt');

    res.status(200).json({
        success: true,
        data: {
            referralCode: user.referralCode,
            count: user.referralCount || 0,
            referrals
        }
    });
}));

// @route   POST /api/referrals/redeem
// @desc    Redeem a referral code (typically called during onboarding)
// @access  Private
router.post('/redeem', protect, asyncHandler(async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
    }

    const user = await User.findById(req.user.id);
    if (user.referredBy) {
        return res.status(400).json({ success: false, message: 'Already referred by someone' });
    }

    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) {
        return res.status(404).json({ success: false, message: 'Invalid referral code' });
    }

    if (referrer._id.toString() === user._id.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot refer yourself' });
    }

    // Link users
    user.referredBy = referrer._id;
    await user.save();

    // Increment referrer count
    referrer.referralCount = (referrer.referralCount || 0) + 1;
    await referrer.save();

    res.status(200).json({
        success: true,
        message: 'Referral code redeemed successfully'
    });
}));

module.exports = router;
