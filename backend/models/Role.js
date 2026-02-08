/**
 * SkillForge AI - Role Schema
 * Defines career roles available in the platform
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
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
    required: [true, 'Role description is required']
  },
  icon: {
    type: String,
    default: 'default-role-icon'
  },
  category: {
    type: String,
    enum: ['development', 'data', 'security', 'cloud', 'design', 'management', 'other'],
    default: 'development'
  },

  // Alternative names/spellings for typo correction
  aliases: [{
    type: String,
    lowercase: true
  }],

  // Keywords for search and suggestions
  keywords: [{
    type: String,
    lowercase: true
  }],

  // Average salary range (for display)
  salaryRange: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },

  // Demand level in market
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very-high'],
    default: 'medium'
  },

  // Related roles for suggestions
  relatedRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],

  // Stats
  enrollmentCount: {
    type: Number,
    default: 0
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

// Pre-save middleware to generate slug
roleSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Static method to search roles with typo tolerance
roleSchema.statics.searchRoles = async function(query) {
  const normalizedQuery = query.toLowerCase().trim();

  // First try exact match
  let roles = await this.find({
    $or: [
      { name: new RegExp(normalizedQuery, 'i') },
      { aliases: normalizedQuery },
      { keywords: normalizedQuery }
    ],
    isActive: true
  }).limit(10);

  // If no results, try fuzzy matching
  if (roles.length === 0) {
    roles = await this.find({
      $or: [
        { name: new RegExp(normalizedQuery.split('').join('.*'), 'i') },
        { keywords: new RegExp(normalizedQuery.substring(0, 3), 'i') }
      ],
      isActive: true
    }).limit(10);
  }

  return roles;
};

// Static method to validate role
roleSchema.statics.isValidRole = async function(roleId) {
  const role = await this.findById(roleId);
  return role && role.isActive;
};

// Index for search
roleSchema.index({ name: 'text', keywords: 'text', aliases: 'text' });
roleSchema.index({ category: 1 });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;
