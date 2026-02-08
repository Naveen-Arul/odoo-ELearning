/**
 * SkillForge AI - Topic Schema
 * Defines learning topics within roadmaps
 */

const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  // Basic Information
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
    required: [true, 'Topic description is required']
  },

  // Parent roadmap
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap',
    required: [true, 'Roadmap is required']
  },

  // Order within roadmap
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
      duration: Number // in minutes
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

  // Company Documentation
  documentation: {
    title: String,
    content: {
      type: String,
      required: [true, 'Documentation content is required']
    },
    fileUrl: String, // Optional uploaded file
    sourceUrl: String, // Original source link
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Estimated Completion Duration (in minutes)
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },

  // Learning Objectives
  objectives: [{
    type: String
  }],

  // Key Concepts covered
  keyConcepts: [{
    type: String
  }],

  // Difficulty within the roadmap
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },

  // Related Topics
  relatedTopics: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Topic'
  }],

  // AI-Generated Content Cache
  aiCache: {
    summary: String,
    keyPoints: [String],
    transcript: String, // Video transcript for test generation
    lastGenerated: Date
  },

  // Statistics
  stats: {
    viewCount: {
      type: Number,
      default: 0
    },
    completionCount: {
      type: Number,
      default: 0
    },
    averageTimeSpent: {
      type: Number,
      default: 0
    },
    averageTestScore: {
      type: Number,
      default: 0
    }
  },

  // Admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware to generate slug and extract video IDs
topicSchema.pre('save', function(next) {
  // Generate slug
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Extract YouTube video IDs
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

// Method to get video for specific language
topicSchema.methods.getVideo = function(language) {
  const langVideo = this.videoLinks[language];
  if (langVideo && langVideo.url) {
    return langVideo;
  }
  // Fallback to English
  return this.videoLinks.english;
};

// Index for queries
topicSchema.index({ roadmap: 1, order: 1 });
topicSchema.index({ slug: 1 });
topicSchema.index({ order: 1 });

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
