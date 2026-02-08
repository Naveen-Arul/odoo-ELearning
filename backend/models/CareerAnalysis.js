/**
 * SkillForge AI - Career Analysis Schema
 * Stores LeetCode, GitHub, and Resume analysis results
 */

const mongoose = require('mongoose');

const careerAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Analysis type
  type: {
    type: String,
    enum: ['leetcode', 'github', 'resume'],
    required: true
  },

  // LeetCode Analysis
  leetcode: {
    username: String,
    stats: {
      totalSolved: Number,
      easySolved: Number,
      mediumSolved: Number,
      hardSolved: Number,
      totalQuestions: Number,
      acceptanceRate: Number,
      ranking: Number,
      contributionPoints: Number
    },
    recentSubmissions: [{
      title: String,
      difficulty: String,
      status: String,
      timestamp: Date
    }],
    topicWise: [{
      topic: String,
      solved: Number,
      total: Number
    }],
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    calendar: {
      heatmapData: { type: Map, of: Number },
      streak: Number,
      totalActiveDays: Number,
      activeYears: [Number]
    }
  },

  // GitHub Analysis
  github: {
    username: String,
    stats: {
      publicRepos: Number,
      totalStars: Number,
      totalForks: Number,
      followers: Number,
      following: Number,
      totalCommits: Number,
      totalPRs: Number,
      totalIssues: Number
    },
    topRepositories: [{
      name: String,
      description: String,
      language: String,
      stars: Number,
      forks: Number,
      url: String
    }],
    languageBreakdown: [{
      language: String,
      percentage: Number,
      bytes: Number
    }],
    contributionGraph: [{
      date: Date,
      count: Number
    }],
    techStack: [String]
  },

  // Resume Analysis (ATS)
  resume: {
    fileName: String,
    fileUrl: String,
    atsScore: {
      type: Number,
      min: 0,
      max: 100
    },
    sections: {
      contactInfo: { score: Number, feedback: String },
      summary: { score: Number, feedback: String },
      experience: { score: Number, feedback: String },
      education: { score: Number, feedback: String },
      skills: { score: Number, feedback: String },
      projects: { score: Number, feedback: String }
    },
    keywords: {
      found: [String],
      missing: [String],
      recommended: [String]
    },
    formatting: {
      score: Number,
      issues: [String]
    },
    targetRole: String
  },

  // AI-Generated Insights
  aiInsights: {
    score: Number,
    summary: String,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    // LeetCode specific
    requiredTopics: [String],
    focusTopics: [String],
    recommendedProblems: [{
      title: String,
      difficulty: String,
      topic: String,
      url: String
    }],
    // GitHub specific
    projectIdeas: [{
      title: String,
      goal: String,
      tech: [String],
      impact: String
    }],
    actionPlan: [{
      action: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      timeline: String
    }],
    suggestedResources: [{
      title: String,
      type: String,
      url: String
    }]
  },

  // Metadata
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date, // When to refresh analysis

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },

  error: String
}, {
  timestamps: true
});

// Index for queries
careerAnalysisSchema.index({ user: 1, type: 1 });
careerAnalysisSchema.index({ analyzedAt: -1 });

// Static to get latest analysis by type
careerAnalysisSchema.statics.getLatestAnalysis = async function (userId, type) {
  return await this.findOne({
    user: userId,
    type: type,
    status: 'completed'
  }).sort({ analyzedAt: -1 });
};

const CareerAnalysis = mongoose.model('CareerAnalysis', careerAnalysisSchema);

module.exports = CareerAnalysis;
