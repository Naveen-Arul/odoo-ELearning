/**
 * SkillForge AI - Roles Routes
 * Career role management and search
 */

const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const Roadmap = require('../models/Roadmap');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');
const { roleValidation, objectIdValidation } = require('../middleware/validation');

/**
 * @route   GET /api/roles
 * @desc    Get all active roles
 * @access  Public
 */
router.get('/', asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  let roles;

  if (search) {
    roles = await Role.searchRoles(search);
  } else {
    roles = await Role.find(query)
      .select('name slug description icon category demandLevel enrollmentCount')
      .sort({ enrollmentCount: -1 });
  }

  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
}));

/**
 * @route   GET /api/roles/suggestions
 * @desc    Get role suggestions with typo correction
 * @access  Public
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(200).json({
      success: true,
      data: []
    });
  }

  const suggestions = await Role.searchRoles(q);

  res.status(200).json({
    success: true,
    data: suggestions.map(role => ({
      _id: role._id,
      name: role.name,
      slug: role.slug,
      category: role.category
    }))
  });
}));

/**
 * @route   GET /api/roles/validate/:name
 * @desc    Validate if a role name is valid
 * @access  Public
 */
router.get('/validate/:name', asyncHandler(async (req, res) => {
  const roleName = req.params.name.toLowerCase().trim();

  const role = await Role.findOne({
    $or: [
      { name: new RegExp(`^${roleName}$`, 'i') },
      { slug: roleName },
      { aliases: roleName }
    ],
    isActive: true
  });

  if (role) {
    return res.status(200).json({
      success: true,
      valid: true,
      data: {
        _id: role._id,
        name: role.name,
        slug: role.slug
      }
    });
  }

  // Try to find similar roles for suggestion
  const similarRoles = await Role.searchRoles(roleName);

  res.status(200).json({
    success: true,
    valid: false,
    suggestions: similarRoles.map(r => ({
      _id: r._id,
      name: r.name,
      slug: r.slug
    }))
  });
}));

/**
 * @route   GET /api/roles/:id
 * @desc    Get single role with roadmaps
 * @access  Public
 */
router.get('/:id', objectIdValidation('id'), asyncHandler(async (req, res) => {
  const role = await Role.findById(req.params.id)
    .populate('relatedRoles', 'name slug');

  if (!role || !role.isActive) {
    throw new ApiError('Role not found', 404);
  }

  // Get roadmaps for this role
  const roadmaps = await Roadmap.find({
    role: role._id,
    isPublished: true,
    isActive: true
  }).select('title slug skillLevel estimatedDuration stats.enrollmentCount');

  res.status(200).json({
    success: true,
    data: {
      role,
      roadmaps
    }
  });
}));

/**
 * @route   GET /api/roles/categories/list
 * @desc    Get all role categories
 * @access  Public
 */
router.get('/categories/list', asyncHandler(async (req, res) => {
  const categories = await Role.distinct('category', { isActive: true });

  const categoryCounts = await Role.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const categoryData = categories.map(cat => ({
    name: cat,
    count: categoryCounts.find(c => c._id === cat)?.count || 0
  }));

  res.status(200).json({
    success: true,
    data: categoryData
  });
}));

module.exports = router;
