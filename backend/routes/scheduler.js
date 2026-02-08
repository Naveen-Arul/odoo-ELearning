/**
 * SkillForge AI - Scheduler Routes
 * External scheduler triggers (Option A)
 */

const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const authorizeScheduler = (req, res, next) => {
  const token = req.header('x-scheduler-token')
    || (req.header('authorization') || '').replace('Bearer ', '');

  if (!process.env.SCHEDULER_TOKEN) {
    return next(new ApiError('Scheduler token not configured', 500));
  }

  if (!token || token !== process.env.SCHEDULER_TOKEN) {
    return next(new ApiError('Unauthorized', 401));
  }

  return next();
};

/**
 * @route   POST /api/scheduler/test-email
 * @desc    Send a test email
 * @access  Private (token)
 */
router.post('/test-email', authorizeScheduler, asyncHandler(async (req, res) => {
  const { to } = req.body || {};

  if (!to) {
    throw new ApiError('Recipient email is required', 400);
  }

  const subject = '✅ SkillForge AI Test Email';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>SkillForge AI Test Email</h2>
      <p>If you received this, your email settings are working correctly.</p>
      <p>Time: ${new Date().toISOString()}</p>
    </div>
  `;

  const result = await emailService.sendEmail({
    to,
    subject,
    html,
    text: 'SkillForge AI test email.'
  });

  if (!result.success) {
    throw new ApiError(result.error || 'Failed to send test email', 500);
  }

  res.status(200).json({
    success: true,
    data: { messageId: result.messageId }
  });
}));

module.exports = router;
