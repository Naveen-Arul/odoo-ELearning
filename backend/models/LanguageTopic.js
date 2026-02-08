/**
 * SkillForge AI - Language Topic Schema
 * Topics within the "Learn Languages" section
 */

const mongoose = require('mongoose');

const languageTopicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Topic title is required'],
    trim: true
  },
  slug: {
    type: String,
    lowercase: true
  },
  description: {
    type: String,
    required: true
  },

  // Parent language
  language: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgrammingLanguage',
    required: true
  },

  // Level
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },

  // Order within level
  order: {
    type: Number,
    default: 0
  },

  // YouTube Video Links (multi-language)
  videoLinks: {
    english: {
      url: String,
      videoId: String,
      title: String,
      duration: Number
    },
    tamil: {
      url: String,
      videoId: String,
      title: String,
      duration: Number
    },
    hindi: {
      url: String,
      videoId: String,
      title: String,
      duration: Number
    }
  },

  // Documentation
  documentation: {
    title: String,
    content: String,
    fileUrl: String,
    sourceUrl: String,
    codeExamples: [{
      title: String,
      code: String,
      explanation: String
    }]
  },

  // Estimated Duration (minutes)
  estimatedDuration: {
    type: Number,
    default: 30
  },

  // Key Concepts
  keyConcepts: [{
    type: String
  }],

  // Statistics
  stats: {
    viewCount: {
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

// Pre-save to generate slug and extract video IDs
languageTopicSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  if (this.videoLinks) {
    ['english', 'tamil', 'hindi'].forEach(lang => {
      if (this.videoLinks[lang]?.url) {
        this.videoLinks[lang].videoId = extractVideoId(this.videoLinks[lang].url);
      }
    });
  }

  next();
});

languageTopicSchema.index({ language: 1, level: 1, order: 1 });

const LanguageTopic = mongoose.model('LanguageTopic', languageTopicSchema);

module.exports = LanguageTopic;
