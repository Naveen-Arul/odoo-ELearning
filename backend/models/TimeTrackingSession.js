/**
 * SkillForge AI - Time Tracking Session Schema
 * Tracks individual study sessions
 */

const mongoose = require('mongoose');

const timeTrackingSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // What is being studied
  contentType: {
    type: String,
    enum: ['roadmap-topic', 'language-topic'],
    required: true
  },

  topic: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'contentType' === 'roadmap-topic' ? 'Topic' : 'LanguageTopic'
  },

  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap'
  },

  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgrammingLanguage'
  },

  // Session timing
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },

  endTime: Date,

  // Duration in minutes
  duration: {
    type: Number,
    default: 0
  },

  // Pause tracking
  pauses: [{
    pausedAt: Date,
    resumedAt: Date,
    reason: {
      type: String,
      enum: ['tab-change', 'page-exit', 'manual', 'idle', 'other'],
      default: 'other'
    }
  }],

  totalPauseTime: {
    type: Number, // in seconds
    default: 0
  },

  // Session status
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'abandoned'],
    default: 'active'
  },

  // Activity type
  activityType: {
    type: String,
    enum: ['watching-video', 'reading-docs', 'ai-teaching', 'taking-test', 'reviewing'],
    default: 'watching-video'
  },

  // Completion
  completed: {
    type: Boolean,
    default: false
  },

  // Notes
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
timeTrackingSessionSchema.index({ user: 1, createdAt: -1 });
timeTrackingSessionSchema.index({ user: 1, topic: 1 });
timeTrackingSessionSchema.index({ startTime: 1 });

// Method to calculate duration
timeTrackingSessionSchema.methods.calculateDuration = function() {
  if (this.endTime) {
    const totalMs = this.endTime - this.startTime;
    const pauseMs = this.totalPauseTime * 1000;
    this.duration = Math.round((totalMs - pauseMs) / 60000); // Convert to minutes
  }
  return this.duration;
};

// Method to pause session
timeTrackingSessionSchema.methods.pause = function(reason = 'manual') {
  if (this.status === 'active') {
    this.pauses.push({ pausedAt: new Date(), reason });
    this.status = 'paused';
  }
  return this;
};

// Method to resume session
timeTrackingSessionSchema.methods.resume = function() {
  if (this.status === 'paused' && this.pauses.length > 0) {
    const lastPause = this.pauses[this.pauses.length - 1];
    if (!lastPause.resumedAt) {
      lastPause.resumedAt = new Date();
      this.totalPauseTime += Math.round((lastPause.resumedAt - lastPause.pausedAt) / 1000);
    }
    this.status = 'active';
  }
  return this;
};

// Method to end session
timeTrackingSessionSchema.methods.end = function(completed = true) {
  this.endTime = new Date();
  this.status = 'completed';
  this.completed = completed;
  this.calculateDuration();
  return this;
};

// Static to get user's sessions for a date
timeTrackingSessionSchema.statics.getSessionsForDate = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return await this.find({
    user: userId,
    startTime: { $gte: startOfDay, $lte: endOfDay }
  }).populate('topic');
};

// Static to get total study time for a date
timeTrackingSessionSchema.statics.getTotalTimeForDate = async function(userId, date) {
  const sessions = await this.getSessionsForDate(userId, date);
  return sessions.reduce((total, session) => total + (session.duration || 0), 0);
};

const TimeTrackingSession = mongoose.model('TimeTrackingSession', timeTrackingSessionSchema);

module.exports = TimeTrackingSession;
