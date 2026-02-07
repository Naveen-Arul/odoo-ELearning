const Course = require('../models/Course');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

// @desc    Create a new course
// @route   POST /api/courses
// @access  Admin, Instructor
const createCourse = async (req, res) => {
    try {
        const {
            title,
            description,
            thumbnail,
            category_id,
            visibility,
            access_rule,
            price,
            currency,
            duration_hours,
            level,
            language,
            tags
        } = req.body;

        // Validate required fields
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Course title is required'
            });
        }

        // Create course with current user as instructor
        const courseData = {
            title,
            description,
            thumbnail,
            category_id,
            instructor_id: req.user.id,
            visibility: visibility || 'everyone',
            access_rule: access_rule || 'open',
            price: price || 0,
            currency: currency || 'USD',
            duration_hours: duration_hours || 0,
            level: level || 'all_levels',
            language: language || 'English'
        };

        const course = await Course.create(courseData);

        // Add tags if provided
        if (tags && tags.length > 0) {
            await Course.addTags(course.id, tags);
        }

        // Fetch the complete course with relations
        const newCourse = await Course.findById(course.id);
        const courseTags = await Course.getTags(course.id);

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: {
                ...newCourse,
                tags: courseTags
            }
        });
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create course',
            error: error.message
        });
    }
};

// @desc    Get all courses (with filters)
// @route   GET /api/courses
// @access  Admin (all), Instructor (own)
const getCourses = async (req, res) => {
    try {
        const {
            category_id,
            visibility,
            access_rule,
            is_published,
            level,
            search,
            page,
            limit,
            sort_by,
            sort_order
        } = req.query;

        let filters = {
            category_id,
            visibility,
            access_rule,
            is_published: is_published === 'true' ? true : is_published === 'false' ? false : undefined,
            level,
            search,
            page: page || 1,
            limit: limit || 10,
            sort_by,
            sort_order
        };

        // If instructor, only show their courses
        if (req.user.role === 'instructor') {
            filters.instructor_id = req.user.id;
        }

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
        console.error('Get courses error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch courses',
            error: error.message
        });
    }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Admin, Instructor (own)
const getCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission - instructors can only view their own courses
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this course'
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
        console.error('Get course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course',
            error: error.message
        });
    }
};

// @desc    Get course with lessons
// @route   GET /api/courses/:id/full
// @access  Admin, Instructor (own)
const getCourseWithLessons = async (req, res) => {
    try {
        const course = await Course.findWithLessons(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this course'
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
        console.error('Get course with lessons error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch course',
            error: error.message
        });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Admin, Instructor (own)
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this course'
            });
        }

        const {
            title,
            description,
            thumbnail,
            category_id,
            visibility,
            access_rule,
            price,
            currency,
            duration_hours,
            level,
            language,
            tags
        } = req.body;

        // Update course
        await Course.update(req.params.id, {
            title,
            description,
            thumbnail,
            category_id,
            visibility,
            access_rule,
            price,
            currency,
            duration_hours,
            level,
            language
        });

        // Update tags if provided
        if (tags !== undefined) {
            await Course.updateTags(req.params.id, tags);
        }

        // Fetch updated course
        const updatedCourse = await Course.findById(req.params.id);
        const courseTags = await Course.getTags(req.params.id);

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: {
                ...updatedCourse,
                tags: courseTags
            }
        });
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update course',
            error: error.message
        });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Admin, Instructor (own)
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this course'
            });
        }

        await Course.delete(req.params.id);

        res.json({
            success: true,
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete course',
            error: error.message
        });
    }
};

// @desc    Publish course
// @route   PUT /api/courses/:id/publish
// @access  Admin, Instructor (own)
const publishCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to publish this course'
            });
        }

        await Course.publish(req.params.id);

        res.json({
            success: true,
            message: 'Course published successfully'
        });
    } catch (error) {
        console.error('Publish course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish course',
            error: error.message
        });
    }
};

// @desc    Unpublish course
// @route   PUT /api/courses/:id/unpublish
// @access  Admin, Instructor (own)
const unpublishCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'Course not found'
            });
        }

        // Check permission
        if (req.user.role === 'instructor' && course.instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to unpublish this course'
            });
        }

        await Course.unpublish(req.params.id);

        res.json({
            success: true,
            message: 'Course unpublished successfully'
        });
    } catch (error) {
        console.error('Unpublish course error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to unpublish course',
            error: error.message
        });
    }
};

// @desc    Get course statistics
// @route   GET /api/courses/stats
// @access  Admin (all), Instructor (own)
const getCourseStats = async (req, res) => {
    try {
        const instructorId = req.user.role === 'instructor' ? req.user.id : null;
        const stats = await Course.getStats(instructorId);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Get course stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// ==========================================
// CATEGORY ENDPOINTS
// ==========================================

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
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
};

// @desc    Get categories with subcategories
// @route   GET /api/categories/tree
// @access  Public
const getCategoriesTree = async (req, res) => {
    try {
        const categories = await Category.findWithSubcategories();
        res.json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('Get categories tree error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch categories',
            error: error.message
        });
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Admin
const createCategory = async (req, res) => {
    try {
        const { name, description, icon, parent_id } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Category name is required'
            });
        }

        const category = await Category.create({ name, description, icon, parent_id });

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    } catch (error) {
        console.error('Create category error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create category',
            error: error.message
        });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Admin
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await Category.update(req.params.id, req.body);
        const updated = await Category.findById(req.params.id);

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update category',
            error: error.message
        });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category not found'
            });
        }

        await Category.delete(req.params.id);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete category',
            error: error.message
        });
    }
};

// ==========================================
// TAG ENDPOINTS
// ==========================================

// @desc    Get all tags
// @route   GET /api/tags
// @access  Public
const getTags = async (req, res) => {
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
};

// @desc    Get popular tags
// @route   GET /api/tags/popular
// @access  Public
const getPopularTags = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const tags = await Tag.findPopular(limit);
        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('Get popular tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tags',
            error: error.message
        });
    }
};

// @desc    Search tags
// @route   GET /api/tags/search
// @access  Public
const searchTags = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.json({ success: true, data: [] });
        }
        const tags = await Tag.search(q);
        res.json({
            success: true,
            data: tags
        });
    } catch (error) {
        console.error('Search tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search tags',
            error: error.message
        });
    }
};

// @desc    Create tag
// @route   POST /api/tags
// @access  Admin
const createTag = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tag name is required'
            });
        }

        const tag = await Tag.create({ name });

        res.status(201).json({
            success: true,
            message: 'Tag created successfully',
            data: tag
        });
    } catch (error) {
        console.error('Create tag error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Tag already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create tag',
            error: error.message
        });
    }
};

// @desc    Delete tag
// @route   DELETE /api/tags/:id
// @access  Admin
const deleteTag = async (req, res) => {
    try {
        const tag = await Tag.findById(req.params.id);

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Tag not found'
            });
        }

        await Tag.delete(req.params.id);

        res.json({
            success: true,
            message: 'Tag deleted successfully'
        });
    } catch (error) {
        console.error('Delete tag error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete tag',
            error: error.message
        });
    }
};

module.exports = {
    // Courses
    createCourse,
    getCourses,
    getCourse,
    getCourseWithLessons,
    updateCourse,
    deleteCourse,
    publishCourse,
    unpublishCourse,
    getCourseStats,
    // Categories
    getCategories,
    getCategoriesTree,
    createCategory,
    updateCategory,
    deleteCategory,
    // Tags
    getTags,
    getPopularTags,
    searchTags,
    createTag,
    deleteTag
};
