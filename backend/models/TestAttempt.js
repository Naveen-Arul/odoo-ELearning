/**
 * SkillForge AI - Test Attempt Schema
 * Records of student test attempts
 */

const mongoose = require('mongoose');

const testAttemptSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Topic reference
  topic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic',
    required: true
  },

  // Roadmap reference
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: true
  },

  // Attempt number (1, 2, 3...)
  attemptNumber: {
    type: Number,
    default: 1
  },

  // Questions and answers
  questions: [{
    questionText: {
      type: String,
      required: true
    },
    questionType: {
      type: String,
      enum: ['multiple-choice', 'true-false', 'short-answer'],
      default: 'multiple-choice'
    },
    options: [{
      text: String,
      isCorrect: Boolean
    }],
    correctAnswer: String,
    userAnswer: String,
    isCorrect: Boolean,
    points: {
      type: Number,
      default: 1
    },
    earnedPoints: {
      type: Number,
      default: 0
    }
  }],

  // Scoring
  score: {
    totalQuestions: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    passed: {
      type: Boolean,
      default: false
    },
    passingPercentage: {
      type: Number,
      default: 50
    }
  },

  // Timing
  timing: {
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    timeSpent: Number // in seconds
  },

  // Status
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },

  // AI-generated feedback
  feedback: {
    summary: String,
    strengths: [String],
    improvements: [String],
    suggestions: [String]
  }
}, {
  timestamps: true
});

// Index for queries
testAttemptSchema.index({ user: 1, topic: 1 });
testAttemptSchema.index({ user: 1, roadmap: 1 });
testAttemptSchema.index({ createdAt: -1 });

// Method to calculate score
testAttemptSchema.methods.calculateScore = function() {
  let correctCount = 0;

  this.questions.forEach(q => {
    if (q.isCorrect) {
      correctCount++;
      q.earnedPoints = q.points;
    }
  });

  this.score.correctAnswers = correctCount;
  this.score.percentage = Math.round((correctCount / this.score.totalQuestions) * 100);
  this.score.passed = this.score.percentage >= this.score.passingPercentage;

  return this;
};

// Static to get user's best attempt for a topic
testAttemptSchema.statics.getBestAttempt = async function(userId, topicId) {
  return await this.findOne({
    user: userId,
    topic: topicId,
    status: 'completed'
  }).sort({ 'score.percentage': -1 });
};

// Static to check if user passed topic
testAttemptSchema.statics.hasPassedTopic = async function(userId, topicId) {
  const attempt = await this.findOne({
    user: userId,
    topic: topicId,
    status: 'completed',
    'score.passed': true
  });
  return !!attempt;
};

const TestAttempt = mongoose.model('TestAttempt', testAttemptSchema);

module.exports = TestAttempt;
