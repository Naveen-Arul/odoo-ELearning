/**
 * SkillForge AI - Cohort Schema
 * Collaborative learning cohorts
 */

const mongoose = require('mongoose');

const cohortSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Cohort name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  startDate: Date,
  endDate: Date,
  capacity: {
    type: Number,
    default: 30
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Cohort = mongoose.model('Cohort', cohortSchema);

module.exports = Cohort;
