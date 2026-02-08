/**
 * StudyRoom Model - Group study rooms with collaborative features
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudyRoomSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    roomId: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    targetRole: {
        type: String,
        default: 'All'
    },
    description: String,
    creator: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['owner', 'moderator', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],
    topic: {
        type: Schema.Types.ObjectId,
        ref: 'Topic'
    },
    roadmap: {
        type: Schema.Types.ObjectId,
        ref: 'Roadmap'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    maxMembers: {
        type: Number,
        default: 10
    },
    status: {
        type: String,
        enum: ['active', 'ended', 'scheduled'],
        default: 'active'
    },
    scheduledFor: Date,
    whiteboardData: {
        type: Schema.Types.Mixed,
        default: {}
    },
    messages: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    stats: {
        totalMessages: {
            type: Number,
            default: 0
        },
        totalDuration: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Indexes
StudyRoomSchema.index({ status: 1, isPublic: 1 });
StudyRoomSchema.index({ 'members.user': 1 });

module.exports = mongoose.model('StudyRoom', StudyRoomSchema);
