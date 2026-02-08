/**
 * SkillForge AI - AI Chat Session Schema
 * Records AI mentor, tutor, and interviewer conversations
 */

const mongoose = require('mongoose');

const aiChatSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Session type
  type: {
    type: String,
    enum: ['teacher', 'tutor', 'mentor', 'interviewer'],
    required: true
  },

  // Context
  context: {
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic'
    },
    roadmap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap'
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    language: String, // User's preferred language
    additionalContext: String
  },

  // Conversation messages
  messages: [{
    role: {
      type: String,
      enum: ['system', 'user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      tokensUsed: Number,
      model: String
    }
  }],

  // For interviewer type
  interviewData: {
    role: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard']
    },
    topics: [String],
    questionsAsked: [{
      question: String,
      userAnswer: String,
      feedback: String,
      score: Number
    }],
    overallScore: Number,
    overallFeedback: String
  },

  // Session stats
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    totalTokens: {
      type: Number,
      default: 0
    },
    duration: Number // in minutes
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },

  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date
}, {
  timestamps: true
});

// Index for queries
aiChatSessionSchema.index({ user: 1, type: 1 });
aiChatSessionSchema.index({ createdAt: -1 });
aiChatSessionSchema.index({ 'context.topic': 1 });

// Method to add message
aiChatSessionSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  this.stats.totalMessages = this.messages.length;
  if (metadata.tokensUsed) {
    this.stats.totalTokens += metadata.tokensUsed;
  }
  return this;
};

// Method to end session
aiChatSessionSchema.methods.endSession = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  this.stats.duration = Math.round((this.endedAt - this.startedAt) / 60000);
  return this;
};

const AIChatSession = mongoose.model('AIChatSession', aiChatSessionSchema);

module.exports = AIChatSession;
