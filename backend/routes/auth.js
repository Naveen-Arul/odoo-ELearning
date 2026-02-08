/**
 * SkillForge AI - Authentication Routes
 * Handles user registration, login, OAuth, and token management
 */

const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, generateToken, sendTokenResponse } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const emailService = require('../services/emailService');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const { name, email, password, preferences } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError('Email already registered', 400);
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ name: name });
  if (existingUsername) {
    throw new ApiError('Username already taken. Please choose another one.', 400);
  }

  // Validate target role if provided
  if (preferences?.targetRole) {
    const roleExists = await Role.isValidRole(preferences.targetRole);
    if (!roleExists) {
      throw new ApiError('Invalid target role selected', 400);
    }
  }

  // Create user
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    authProvider: 'local',
    preferences: {
      ...preferences,
      skillLevel: preferences?.skillLevel || 'beginner',
      dailyStudyTime: preferences?.dailyStudyTime || 2,
      preferredLanguage: preferences?.preferredLanguage || 'english'
    }
  });

  sendTokenResponse(user, 201, res, 'Registration successful');
}));

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and include password
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new ApiError('Username or password is wrong', 401);
  }

  // Check if user registered with OAuth
  if (user.authProvider !== 'local' && !user.password) {
    throw new ApiError(`Please login using ${user.authProvider}`, 401);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError('Username or password is wrong', 401);
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ApiError('Account is deactivated', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Award XP for daily login
  // We check if it's a new day effectively by comparing lastActive or by just trusting the service to handle frequency?
  // The service doesn't handle frequency limitation yet. 
  // Let's rely on the fact that 'login' happens explicitly. 
  // Ideally we should check if XP was already awarded today.
  // For MVP, we'll just award it on login.
  const xpService = require('../services/xpService');
  try {
    await xpService.addXP(user._id, 'DAILY_LOGIN');
  } catch (err) {
    console.error('Failed to award daily login XP:', err.message);
  }

  sendTokenResponse(user, 200, res, 'Login successful');
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate('preferences.targetRole')
    .populate('enrolledRoadmaps.roadmap');

  if (!user.isOnboarded && user.preferences?.skillLevel && user.preferences?.preferredLanguage) {
    user.isOnboarded = true;
    await user.save();
  }

  res.status(200).json({
    success: true,
    data: user
  });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear cookie
 * @access  Private
 */
router.post('/logout', protect, asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
}));

/**
 * @route   PUT /api/auth/password
 * @desc    Update password
 * @access  Private
 */
router.put('/password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (user.password) {
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new ApiError('Current password is incorrect', 401);
    }
  }

  // Validate new password
  if (!newPassword || newPassword.length < 8) {
    throw new ApiError('New password must be at least 8 characters', 400);
  }

  user.password = newPassword;
  await user.save();

  sendTokenResponse(user, 200, res, 'Password updated successfully');
}));

/**
 * @route   GET /api/auth/google
 * @desc    Google OAuth login
 * @access  Public
 */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  asyncHandler(async (req, res) => {
    const token = generateToken(req.user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
  })
);

/**
 * @route   GET /api/auth/github
 * @desc    GitHub OAuth login
 * @access  Public
 */
router.get('/github',
  passport.authenticate('github', { scope: ['user:email', 'read:user'] })
);

/**
 * @route   GET /api/auth/github/callback
 * @desc    GitHub OAuth callback
 * @access  Public
 */
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login', session: false }),
  asyncHandler(async (req, res) => {
    const token = generateToken(req.user._id);

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/oauth-callback?token=${token}`);
  })
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', protect, asyncHandler(async (req, res) => {
  const token = generateToken(req.user._id);

  res.status(200).json({
    success: true,
    token
  });
}));

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset link
 * @access  Public
 */
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError('Email is required', 400);
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.'
    });
  }

  if (user.authProvider && user.authProvider !== 'local') {
    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset link has been sent.'
    });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetLink = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;

  const subject = 'Reset your SkillForge AI password';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Password Reset</h2>
      <p>Hello ${user.name || 'there'},</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  const result = await emailService.sendEmail({
    to: user.email,
    subject,
    html,
    text: `Reset your password: ${resetLink}`
  });

  if (!result.success) {
    throw new ApiError(result.error || 'Failed to send reset email', 500);
  }

  res.status(200).json({
    success: true,
    message: 'Password reset email sent.'
  });
}));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new ApiError('Token and password are required', 400);
  }

  if (password.length < 8) {
    throw new ApiError('Password must be at least 8 characters', 400);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() }
  }).select('+password');

  if (!user) {
    throw new ApiError('Reset token is invalid or expired', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful. You can now log in.'
  });
}));

module.exports = router;
