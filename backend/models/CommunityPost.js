/**
 * SkillForge AI - Community Post Model
 * Discussion posts with comments and voting
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 2000
    },
    upvotes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    isEdited: {
        type: Boolean,
        default: false
    }
});

const CommunityPostSchema = new Schema({
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 10000
    },
    category: {
        type: String,
        enum: ['question', 'discussion', 'resource', 'achievement', 'other'],
        default: 'discussion'
    },
    tags: [{
        type: String,
        maxlength: 30
    }],
    relatedRoadmap: {
        type: Schema.Types.ObjectId,
        ref: 'Roadmap'
    },
    relatedTopic: {
        type: Schema.Types.ObjectId,
        ref: 'Topic'
    },
    upvotes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotes: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [CommentSchema],
    views: {
        type: Number,
        default: 0
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    isSolved: {
        type: Boolean,
        default: false
    },
    bestAnswer: {
        type: Schema.Types.ObjectId
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: Date,
    lastActivityAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
CommunityPostSchema.index({ category: 1, createdAt: -1 });
CommunityPostSchema.index({ author: 1, createdAt: -1 });
CommunityPostSchema.index({ tags: 1 });
CommunityPostSchema.index({ lastActivityAt: -1 });
CommunityPostSchema.index({ 'upvotes': 1 });

// Virtual for vote score
CommunityPostSchema.virtual('voteScore').get(function () {
    return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

// Methods
CommunityPostSchema.methods.addComment = function (userId, content) {
    this.comments.push({
        author: userId,
        content,
        createdAt: new Date()
    });
    this.lastActivityAt = new Date();
    return this.save();
};

CommunityPostSchema.methods.upvote = function (userId) {
    const upvoteIndex = this.upvotes.indexOf(userId);
    const downvoteIndex = this.downvotes.indexOf(userId);

    // Remove from downvotes if exists
    if (downvoteIndex > -1) {
        this.downvotes.splice(downvoteIndex, 1);
    }

    // Toggle upvote
    if (upvoteIndex > -1) {
        this.upvotes.splice(upvoteIndex, 1);
    } else {
        this.upvotes.push(userId);
    }

    return this.save();
};

CommunityPostSchema.methods.downvote = function (userId) {
    const upvoteIndex = this.upvotes.indexOf(userId);
    const downvoteIndex = this.downvotes.indexOf(userId);

    // Remove from upvotes if exists
    if (upvoteIndex > -1) {
        this.upvotes.splice(upvoteIndex, 1);
    }

    // Toggle downvote
    if (downvoteIndex > -1) {
        this.downvotes.splice(downvoteIndex, 1);
    } else {
        this.downvotes.push(userId);
    }

    return this.save();
};

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
