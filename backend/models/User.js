/**
 * SkillForge AI - User Schema
 * Defines the user model with authentication, preferences, and progress tracking
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    unique: true,
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  avatar: {
    type: String,
    default: ''
  },

  // Authentication Providers
  authProvider: {
    type: String,
    enum: ['local', 'google', 'github'],
    default: 'local'
  },
  googleId: {
    type: String,
    sparse: true
  },
  githubId: {
    type: String,
    sparse: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },

  // User Preferences
  preferences: {
    targetRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    },
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    dailyStudyTime: {
      type: Number,
      min: [1, 'Minimum study time is 1 hour'],
      max: [24, 'Maximum study time is 24 hours'],
      default: 2
    },
    preferredLanguage: {
      type: String,
      enum: ['english', 'tamil', 'hindi'],
      default: 'english'
    }
  },

  // Professional Profile
  currentStatus: {
    type: String,
    enum: ['Student', 'Working', 'Open to Work', 'Freelancing', 'Looking for Internship'],
    default: 'Student'
  },
  skills: [{
    type: String,
    trim: true
  }],
  projects: [{
    title: { type: String, required: true },
    description: String,
    link: String,
    techStack: [String],
    imageUrl: String,
    startDate: Date,
    endDate: Date,
    isCurrent: Boolean
  }],
  experience: [{
    title: { type: String, required: true }, // Job Title
    company: { type: String, required: true },
    location: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    isCurrent: { type: Boolean, default: false },
    description: String
  }],

  // Roadmap Enrollments (max 3 at a time)
  enrolledRoadmaps: [{
    roadmap: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap'
    },
    status: {
      type: String,
      enum: ['current', 'active', 'completed', 'paused'],
      default: 'active'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedTopics: [{
      topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      },
      completedAt: Date,
      timeSpent: Number, // in minutes
      testScore: Number
    }]
  }],

  // Language Learning Progress (separate from roadmaps)
  languageLearning: [{
    language: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProgrammingLanguage'
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    completedTopics: [{
      topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LanguageTopic'
      },
      completedAt: Date,
      timeSpent: Number
    }],
    progress: {
      type: Number,
      default: 0
    }
  }],

  // Time Tracking
  studyTime: [{
    date: {
      type: Date,
      required: true
    },
    minutes: {
      type: Number,
      default: 0
    },
    topicsCompleted: {
      type: Number,
      default: 0
    },
    sessions: [{
      startTime: Date,
      endTime: Date,
      duration: Number, // in minutes
      topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
      }
    }]
  }],

  // Career Tool Data
  careerData: {
    leetcodeUsername: String,
    githubUsername: String,
    resumeUrl: String,
    lastLeetcodeAnalysis: Date,
    lastGithubAnalysis: Date,
    lastResumeAnalysis: Date,
    readinessScore: {
      overall: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      leetcodeScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      githubScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      resumeScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      weights: {
        leetcode: { type: Number, default: 0.33 },
        github: { type: Number, default: 0.34 },
        resume: { type: Number, default: 0.33 }
      },
      targetRole: String,
      lastCalculated: Date
    }
  },

  // Weekly Goals
  weeklyGoal: {
    targetMinutes: {
      type: Number,
      default: 600, // 10 hours per week default
      min: 0
    },
    targetTopics: {
      type: Number,
      default: 5,
      min: 0
    },
    weekStartDate: {
      type: Date,
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },

  // User Role (admin/student)
  role: {
    type: String,
    enum: ['student', 'admin', 'recruiter', 'company_admin'],
    default: 'student'
  },

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isOnboarded: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Skill Badges (credible assessments)
  badges: [{
    badge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillBadge'
    },
    awardedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: ''
    }
  }],

  // Referral System
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCount: {
    type: Number,
    default: 0
  },

  // Gamification
  gamification: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    points: { type: Number, default: 0 },
    badges: [{
      name: String,
      earnedAt: { type: Date, default: Date.now }
    }],
    powerups: [{
      type: { type: String, enum: ['streak-freeze', 'double-xp'] },
      count: { type: Number, default: 0 },
      expiresAt: Date
    }]
  },

  // Job outcomes tracking
  jobOutcomes: [{
    status: {
      type: String,
      enum: ['applied', 'interviewing', 'offer', 'placed', 'rejected'],
      default: 'applied'
    },
    company: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      default: ''
    },
    salary: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    notes: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    }
  }],
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,

  // Timestamps
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for getting active roadmap count
userSchema.virtual('activeRoadmapCount').get(function () {
  const enrolled = this.enrolledRoadmaps || [];
  return enrolled.filter(r =>
    r.status === 'current' || r.status === 'active'
  ).length;
});

// Virtual for getting current roadmap
userSchema.virtual('currentRoadmap').get(function () {
  const enrolled = this.enrolledRoadmaps || [];
  return enrolled.find(r => r.status === 'current');
});

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can enroll in new roadmap
userSchema.methods.canEnrollNewRoadmap = function () {
  const activeCount = this.enrolledRoadmaps.filter(r =>
    r.status === 'current' || r.status === 'active'
  ).length;
  return activeCount < 3;
};

// Method to get today's study time
userSchema.methods.getTodayStudyTime = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayRecord = this.studyTime.find(st => {
    const recordDate = new Date(st.date);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });

  return todayRecord ? todayRecord.minutes : 0;
};

// Method to calculate profile completion percentage
userSchema.methods.getProfileCompletion = function () {
  const fields = {
    basicInfo: {
      name: !!this.name,
      email: !!this.email,
      avatar: !!this.avatar
    },
    preferences: {
      targetRole: !!this.preferences?.targetRole,
      skillLevel: !!this.preferences?.skillLevel,
      dailyStudyTime: !!this.preferences?.dailyStudyTime
    },
    careerData: {
      leetcodeUsername: !!this.careerData?.leetcodeUsername,
      githubUsername: !!this.careerData?.githubUsername
    },
    learning: {
      hasEnrolledRoadmap: this.enrolledRoadmaps?.length > 0,
      hasCompletedTopic: this.enrolledRoadmaps?.some(r => r.completedTopics?.length > 0)
    }
  };

  const weights = {
    basicInfo: 30,
    preferences: 30,
    careerData: 20,
    learning: 20
  };

  let totalScore = 0;

  // Calculate basic info score
  const basicInfoCompleted = Object.values(fields.basicInfo).filter(Boolean).length;
  totalScore += (basicInfoCompleted / 3) * weights.basicInfo;

  // Calculate preferences score
  const preferencesCompleted = Object.values(fields.preferences).filter(Boolean).length;
  totalScore += (preferencesCompleted / 3) * weights.preferences;

  // Calculate career data score
  const careerDataCompleted = Object.values(fields.careerData).filter(Boolean).length;
  totalScore += (careerDataCompleted / 2) * weights.careerData;

  // Calculate learning score
  const learningCompleted = Object.values(fields.learning).filter(Boolean).length;
  totalScore += (learningCompleted / 2) * weights.learning;

  return {
    percentage: Math.round(totalScore),
    fields,
    missingFields: {
      basicInfo: Object.keys(fields.basicInfo).filter(k => !fields.basicInfo[k]),
      preferences: Object.keys(fields.preferences).filter(k => !fields.preferences[k]),
      careerData: Object.keys(fields.careerData).filter(k => !fields.careerData[k]),
      learning: Object.keys(fields.learning).filter(k => !fields.learning[k])
    }
  };
};

// Index for efficient queries
userSchema.index({ 'enrolledRoadmaps.roadmap': 1 });
userSchema.index({ 'studyTime.date': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
