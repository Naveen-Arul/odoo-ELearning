const express = require('express');
const router = express.Router();
const {
    getTags,
    getPopularTags,
    searchTags,
    createTag,
    deleteTag
} = require('../controllers/courseController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getTags);
router.get('/popular', getPopularTags);
router.get('/search', searchTags);

// Admin only routes
router.post('/', protect, restrictTo('admin'), createTag);
router.delete('/:id', protect, restrictTo('admin'), deleteTag);

module.exports = router;
