/**
 * SkillForge AI - Models Index
 * Exports all database models
 */

const User = require('./User');
const Role = require('./Role');
const Roadmap = require('./Roadmap');
const Topic = require('./Topic');
const ProgrammingLanguage = require('./ProgrammingLanguage');
const LanguageTopic = require('./LanguageTopic');
const DailyStudyPlan = require('./DailyStudyPlan');
const TestAttempt = require('./TestAttempt');
const TimeTrackingSession = require('./TimeTrackingSession');
const CareerAnalysis = require('./CareerAnalysis');
const AIChatSession = require('./AIChatSession');
const SkillBadge = require('./SkillBadge');
const ProjectSubmission = require('./ProjectSubmission');
const PeerReview = require('./PeerReview');
const Cohort = require('./Cohort');
const MentorProfile = require('./MentorProfile');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Role,
  Roadmap,
  Topic,
  ProgrammingLanguage,
  LanguageTopic,
  DailyStudyPlan,
  TestAttempt,
  TimeTrackingSession,
  CareerAnalysis,
  AIChatSession,
  SkillBadge,
  ProjectSubmission,
  PeerReview,
  Cohort,
  MentorProfile,
  AuditLog
};
