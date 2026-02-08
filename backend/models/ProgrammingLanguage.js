/**
 * SkillForge AI - Programming Language Schema
 * For the "Learn Languages" section (separate from roadmaps)
 */

const mongoose = require('mongoose');

const programmingLanguageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Language name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  logo: {
    type: String, // URL or path to uploaded logo image
    default: ''
  },
  color: {
    type: String,
    default: '#3B82F6' // Default blue
  },

  // Topics organized by levels
  levels: {
    beginner: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LanguageTopic'
    }],
    intermediate: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LanguageTopic'
    }],
    advanced: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LanguageTopic'
    }]
  },

  // Use cases
  useCases: [{
    type: String
  }],

  // Related languages
  relatedLanguages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgrammingLanguage'
  }],

  // Statistics
  stats: {
    learnerCount: {
      type: Number,
      default: 0
    },
    completionCount: {
      type: Number,
      default: 0
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save to generate slug
programmingLanguageSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

const ProgrammingLanguage = mongoose.model('ProgrammingLanguage', programmingLanguageSchema);

module.exports = ProgrammingLanguage;
