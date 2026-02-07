const express = require('express');
const router = express.Router();
const {
    createCourse,
    getCourses,
    getCourse,
    getCourseWithLessons,
    updateCourse,
    deleteCourse,
    publishCourse,
    unpublishCourse,
    getCourseStats,
    getCategories,
    getCategoriesTree,
    createCategory,
    updateCategory,
    deleteCategory,
    getTags,
    getPopularTags,
    searchTags,
    createTag,
    deleteTag
} = require('../controllers/courseController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ==========================================
// COURSE ROUTES
// ==========================================

// Stats route (must be before :id routes)
router.get('/stats', protect, restrictTo('admin', 'instructor'), getCourseStats);

// CRUD routes
router.route('/')
    .get(protect, restrictTo('admin', 'instructor'), getCourses)
    .post(protect, restrictTo('admin', 'instructor'), createCourse);

router.route('/:id')
    .get(protect, restrictTo('admin', 'instructor'), getCourse)
    .put(protect, restrictTo('admin', 'instructor'), updateCourse)
    .delete(protect, restrictTo('admin', 'instructor'), deleteCourse);

// Get course with lessons
router.get('/:id/full', protect, restrictTo('admin', 'instructor'), getCourseWithLessons);

// Publish/Unpublish
router.put('/:id/publish', protect, restrictTo('admin', 'instructor'), publishCourse);
router.put('/:id/unpublish', protect, restrictTo('admin', 'instructor'), unpublishCourse);

module.exports = router;
