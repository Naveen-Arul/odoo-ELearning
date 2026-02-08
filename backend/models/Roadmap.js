/**
 * SkillForge AI - Roadmap Schema
 * Defines role-based learning roadmaps
 */

const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Roadmap title is required'],
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Roadmap description is required']
  },

  // Associated Role
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: [true, 'Associated role is required']
  },

  // Skill Level
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: [true, 'Skill level is required']
  },

  // Thumbnail/Cover Image
  thumbnail: {
    type: String,
    default: ''
  },

  // Ordered Topics
  topics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],

  // Estimated Duration (in hours)
  estimatedDuration: {
    type: Number,
    default: 0
  },

  // Test Configuration
  testConfig: {
    passingPercentage: {
      type: Number,
      default: 50,
      min: 0,
      max: 100
    },
    questionsPerTest: {
      type: Number,
      default: 5
    },
    timePerQuestion: {
      type: Number, // in seconds
      default: 60
    }
  },

  // Prerequisites
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap'
  }],

  // Tags for filtering
  tags: [{
    type: String,
    lowercase: true
  }],

  // Statistics
  stats: {
    enrollmentCount: {
      type: Number,
      default: 0
    },
    completionCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },

  // Course completion reviews
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Admin/Creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Status
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },

  publishedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for topic count
roadmapSchema.virtual('topicCount').get(function() {
  return this.topics ? this.topics.length : 0;
});

// Virtual for completion rate
roadmapSchema.virtual('completionRate').get(function() {
  if (this.stats.enrollmentCount === 0) return 0;
  return ((this.stats.completionCount / this.stats.enrollmentCount) * 100).toFixed(2);
});

// Pre-save middleware to generate slug
roadmapSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Method to calculate total duration from topics
roadmapSchema.methods.calculateDuration = async function() {
  const Topic = mongoose.model('Topic');
  const topics = await Topic.find({ _id: { $in: this.topics } });
  this.estimatedDuration = topics.reduce((total, topic) => total + (topic.estimatedDuration || 0), 0);
  return this.estimatedDuration;
};

// Index for queries
roadmapSchema.index({ role: 1, skillLevel: 1 });
roadmapSchema.index({ isPublished: 1, isActive: 1 });
roadmapSchema.index({ tags: 1 });

const Roadmap = mongoose.model('Roadmap', roadmapSchema);

module.exports = Roadmap;
