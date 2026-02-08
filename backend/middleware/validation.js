/**
 * SkillForge AI - Validation Middleware
 * Request validation using express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate request and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * User registration validation
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  body('preferences.skillLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid skill level'),

  body('preferences.dailyStudyTime')
    .optional()
    .isInt({ min: 1, max: 24 }).withMessage('Daily study time must be between 1 and 24 hours'),

  body('preferences.preferredLanguage')
    .optional()
    .isIn(['english', 'tamil', 'hindi']).withMessage('Invalid preferred language'),

  validate
];

/**
 * Login validation
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),

  body('password')
    .notEmpty().withMessage('Password is required'),

  validate
];

/**
 * Update preferences validation
 */
const preferencesValidation = [
  body('targetRole')
    .optional()
    .isMongoId().withMessage('Invalid role ID'),

  body('skillLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid skill level'),

  body('dailyStudyTime')
    .optional()
    .isInt({ min: 1, max: 24 }).withMessage('Daily study time must be between 1 and 24 hours'),

  body('preferredLanguage')
    .optional()
    .isIn(['english', 'tamil', 'hindi']).withMessage('Invalid preferred language'),

  validate
];

/**
 * Roadmap validation
 */
const roadmapValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isMongoId().withMessage('Invalid role ID'),

  body('skillLevel')
    .notEmpty().withMessage('Skill level is required')
    .isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid skill level'),

  body('testConfig.passingPercentage')
    .optional()
    .isInt({ min: 0, max: 100 }).withMessage('Passing percentage must be between 0 and 100'),

  validate
];

/**
 * Topic validation
 */
const topicValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required'),

  body('documentation.content')
    .notEmpty().withMessage('Documentation content is required'),

  body('estimatedDuration')
    .notEmpty().withMessage('Estimated duration is required')
    .isInt({ min: 1 }).withMessage('Duration must be at least 1 minute'),

  body('videoLinks.english.url')
    .optional()
    .isURL().withMessage('Invalid YouTube URL for English'),

  body('videoLinks.tamil.url')
    .optional()
    .isURL().withMessage('Invalid YouTube URL for Tamil'),

  body('videoLinks.hindi.url')
    .optional()
    .isURL().withMessage('Invalid YouTube URL for Hindi'),

  validate
];

/**
 * Role validation
 */
const roleValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Role name is required'),

  body('description')
    .trim()
    .notEmpty().withMessage('Role description is required'),

  body('category')
    .optional()
    .isIn(['development', 'data', 'security', 'cloud', 'design', 'management', 'other'])
    .withMessage('Invalid category'),

  validate
];

/**
 * MongoDB ObjectId validation
 */
const objectIdValidation = (paramName) => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`),

  validate
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  preferencesValidation,
  roadmapValidation,
  topicValidation,
  roleValidation,
  objectIdValidation
};
