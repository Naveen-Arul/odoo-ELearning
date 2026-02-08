/**
 * SkillForge AI - Community Routes
 * Discussion forum and community features
 */

const express = require('express');
const router = express.Router();
const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/community/posts
 * @desc    Get all posts with filters
 * @access  Public
 */
router.get('/posts', asyncHandler(async (req, res) => {
    const { category, tag, sort = 'recent', page = 1, limit = 20 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (tag) query.tags = tag;

    let sortOption = {};
    switch (sort) {
        case 'recent':
            sortOption = { lastActivityAt: -1 };
            break;
        case 'popular':
            sortOption = { views: -1 };
            break;
        case 'votes':
            // Will sort by computed vote score in aggregation
            break;
        default:
            sortOption = { createdAt: -1 };
    }

    const posts = await CommunityPost.find(query)
        .populate('author', 'name email')
        .populate('relatedRoadmap', 'title')
        .populate('relatedTopic', 'title')
        .sort(sortOption)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    const total = await CommunityPost.countDocuments(query);

    // Calculate vote scores
    const postsWithScores = posts.map(post => ({
        ...post,
        voteScore: (post.upvotes?.length || 0) - (post.downvotes?.length || 0),
        commentCount: post.comments?.length || 0
    }));

    res.status(200).json({
        success: true,
        data: postsWithScores,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
}));

/**
 * @route   POST /api/community/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post('/posts', protect, asyncHandler(async (req, res) => {
    const { title, content, category, tags, relatedRoadmap, relatedTopic } = req.body;

    const post = await CommunityPost.create({
        author: req.user.id,
        title,
        content,
        category: category || 'discussion',
        tags: tags || [],
        relatedRoadmap,
        relatedTopic
    });

    await post.populate('author', 'name email');

    res.status(201).json({
        success: true,
        data: post
    });
}));

/**
 * @route   GET /api/community/posts/:id
 * @desc    Get single post with comments
 * @access  Public
 */
router.get('/posts/:id', asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id)
        .populate('author', 'name email')
        .populate('comments.author', 'name email')
        .populate('relatedRoadmap', 'title')
        .populate('relatedTopic', 'title');

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.status(200).json({
        success: true,
        data: post
    });
}));

/**
 * @route   POST /api/community/posts/:id/comments
 * @desc    Add comment to post
 * @access  Private
 */
router.post('/posts/:id/comments', protect, asyncHandler(async (req, res) => {
    const { content } = req.body;

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (post.isLocked) {
        throw new ApiError('Post is locked', 403);
    }

    await post.addComment(req.user.id, content);
    await post.populate('comments.author', 'name email');

    res.status(201).json({
        success: true,
        data: post.comments[post.comments.length - 1]
    });
}));

/**
 * @route   POST /api/community/posts/:id/upvote
 * @desc    Upvote a post
 * @access  Private
 */
router.post('/posts/:id/upvote', protect, asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    await post.upvote(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            voteScore: (post.upvotes?.length || 0) - (post.downvotes?.length || 0)
        }
    });
}));

/**
 * @route   POST /api/community/posts/:id/downvote
 * @desc    Downvote a post
 * @access  Private
 */
router.post('/posts/:id/downvote', protect, asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    await post.downvote(req.user.id);

    res.status(200).json({
        success: true,
        data: {
            voteScore: (post.upvotes?.length || 0) - (post.downvotes?.length || 0)
        }
    });
}));

/**
 * @route   DELETE /api/community/posts/:id
 * @desc    Delete a post (author only)
 * @access  Private
 */
router.delete('/posts/:id', protect, asyncHandler(async (req, res) => {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
        throw new ApiError('Post not found', 404);
    }

    if (post.author.toString() !== req.user.id) {
        throw new ApiError('Not authorized to delete this post', 403);
    }

    await post.deleteOne();

    res.status(200).json({
        success: true,
        message: 'Post deleted'
    });
}));

module.exports = router;
