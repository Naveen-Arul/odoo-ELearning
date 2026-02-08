/**
 * SkillForge AI - Skill Badge Schema
 * Credible assessment badges
 */

const mongoose = require('mongoose');

const skillBadgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Badge name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '🏅'
  },
  criteria: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const SkillBadge = mongoose.model('SkillBadge', skillBadgeSchema);

module.exports = SkillBadge;
