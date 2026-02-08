/**
 * SkillForge AI - Peer Review Schema
 */

const mongoose = require('mongoose');

const peerReviewSchema = new mongoose.Schema({
  submission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectSubmission',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5
  },
  feedback: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const PeerReview = mongoose.model('PeerReview', peerReviewSchema);

module.exports = PeerReview;
