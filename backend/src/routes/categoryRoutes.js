const express = require('express');
const router = express.Router();
const {
    getCategories,
    getCategoriesTree,
    createCategory,
    updateCategory,
    deleteCategory
} = require('../controllers/courseController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getCategories);
router.get('/tree', getCategoriesTree);

// Admin only routes
router.post('/', protect, restrictTo('admin'), createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

module.exports = router;
