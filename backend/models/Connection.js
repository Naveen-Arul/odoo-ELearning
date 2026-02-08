/**
 * Connection Model - Follow/Friend system
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ConnectionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    follower: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'blocked'],
        default: 'accepted'
    },
    type: {
        type: String,
        enum: ['follow', 'friend'],
        default: 'follow'
    }
}, {
    timestamps: true
});

// Indexes
ConnectionSchema.index({ user: 1, follower: 1 }, { unique: true });
ConnectionSchema.index({ follower: 1 });

module.exports = mongoose.model('Connection', ConnectionSchema);
