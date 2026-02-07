const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

// @desc    Get published courses for learners (public)
// @route   GET /api/public/courses
// @access  Public
router.get('/courses', async (req, res) => {
    try {
        const {
            category_id,
            level,
            search,
            page = 1,
            limit = 12,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        // Only get published courses
        const filters = {
            is_published: true,
            category_id,
            level,
            search,
            page,
            limit,
            sort_by,
            sort_order
        };

        const result = await Course.findAll(filters);

        // Get tags for each course
        const coursesWithTags = await Promise.all(
            result.courses.map(async (course) => {
                const tags = await Course.getTags(course.id);
                return { ...course, tags };
            })
        );

        res.json({
            success: true,
            data: {
                courses: coursesWithTags,
                pagination: result.pagination
            }
        });
    } catch (error) {
        console.error('Get public courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses',
            error: error.message
        });
    }
});

// @desc    Get single published course details (public)
// @route   GET /api/public/courses/:id
// @access  Public
router.get('/courses/:id', async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Only show published courses
        if (!course.is_published) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        const tags = await Course.getTags(course.id);

        res.json({
            success: true,
            data: {
                ...course,
                tags
            }
        });
    } catch (error) {
        console.error('Get public course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course',
            error: error.message
        });
    }
});

// @desc    Get all categories (public)
// @route   GET /api/public/categories
// @access  Public
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.findAll();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
});

// @desc    Get all tags (public)
// @route   GET /api/public/tags
// @access  Public
router.get('/tags', async (req, res) => {
    try {
        const tags = await Tag.findAll();
        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('Get tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tags',
            error: error.message
        });
    }
});

module.exports = router;
