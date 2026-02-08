/**
 * SkillForge AI - Daily Study Plan Schema
 * Adaptive daily learning schedule
 */

const mongoose = require('mongoose');

const dailyStudyPlanSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Date for this plan
  date: {
    type: Date,
    required: true
  },

  // Source roadmap
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap'
  },

  // Planned study time (in minutes)
  plannedTime: {
    type: Number,
    required: true
  },

  // Assigned topics for the day
  assignedTopics: [{
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    estimatedDuration: Number, // minutes
    priority: {
      type: Number,
      default: 1 // 1 = highest
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'skipped'],
      default: 'pending'
    },
    completedAt: Date,
    actualTimeSpent: Number, // minutes
    isRolledOver: {
      type: Boolean,
      default: false
    },
    rolledOverFrom: Date // Original date if rolled over
  }],

  // Language topics (separate from roadmap)
  languageTopics: [{
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LanguageTopic'
    },
    estimatedDuration: Number,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'skipped'],
      default: 'pending'
    },
    completedAt: Date,
    actualTimeSpent: Number
  }],

  // Summary stats
  summary: {
    totalTopics: {
      type: Number,
      default: 0
    },
    completedTopics: {
      type: Number,
      default: 0
    },
    totalPlannedMinutes: {
      type: Number,
      default: 0
    },
    actualMinutesSpent: {
      type: Number,
      default: 0
    },
    completionPercentage: {
      type: Number,
      default: 0
    }
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'partial', 'missed'],
    default: 'pending'
  },

  // Notes
  notes: String,

  // AI suggestions for the day
  aiSuggestions: [{
    message: String,
    type: {
      type: String,
      enum: ['tip', 'motivation', 'reminder', 'warning']
    }
  }],

  // Generated timestamp
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for user + date (unique daily plan per user)
dailyStudyPlanSchema.index({ user: 1, date: 1 }, { unique: true });

// Method to update completion stats
dailyStudyPlanSchema.methods.updateStats = function() {
  const allTopics = [...this.assignedTopics, ...this.languageTopics];
  this.summary.totalTopics = allTopics.length;
  this.summary.completedTopics = allTopics.filter(t => t.status === 'completed').length;
  this.summary.totalPlannedMinutes = allTopics.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  this.summary.actualMinutesSpent = allTopics.reduce((sum, t) => sum + (t.actualTimeSpent || 0), 0);

  if (this.summary.totalTopics > 0) {
    this.summary.completionPercentage = Math.round(
      (this.summary.completedTopics / this.summary.totalTopics) * 100
    );
  }

  // Update overall status
  if (this.summary.completionPercentage === 100) {
    this.status = 'completed';
  } else if (this.summary.completionPercentage > 0) {
    this.status = 'partial';
  } else if (new Date() > new Date(this.date).setHours(23, 59, 59)) {
    this.status = 'missed';
  }

  return this;
};

// Static method to get or create today's plan
dailyStudyPlanSchema.statics.getTodayPlan = async function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let plan = await this.findOne({ user: userId, date: today })
    .populate('assignedTopics.topic')
    .populate('languageTopics.topic')
    .populate('roadmap');

  return plan;
};

const DailyStudyPlan = mongoose.model('DailyStudyPlan', dailyStudyPlanSchema);

module.exports = DailyStudyPlan;
