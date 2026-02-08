/**
 * Certificate Model - Verified certificates for completed roadmaps
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CertificateSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    roadmap: {
        type: Schema.Types.ObjectId,
        ref: 'Roadmap',
        required: true
    },
    certificateId: {
        type: String,
        unique: true,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    expiryDate: Date,
    verificationUrl: String,
    metadata: {
        completionTime: Number,
        totalTopics: Number,
        averageScore: Number
    },
    revoked: {
        type: Boolean,
        default: false
    },
    revokedAt: Date,
    revokedReason: String
}, {
    timestamps: true
});

// Indexes
CertificateSchema.index({ certificateId: 1 });
CertificateSchema.index({ user: 1, roadmap: 1 });

module.exports = mongoose.model('Certificate', CertificateSchema);
