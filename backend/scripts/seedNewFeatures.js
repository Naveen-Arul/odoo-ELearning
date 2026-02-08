/**
 * Seed sample data for new features (assessments + collaboration)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const SkillBadge = require('../models/SkillBadge');
const ProjectSubmission = require('../models/ProjectSubmission');
const PeerReview = require('../models/PeerReview');
const Cohort = require('../models/Cohort');
const MentorProfile = require('../models/MentorProfile');

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not configured');
  }

  await mongoose.connect(MONGODB_URI);

  const users = await User.find().limit(3);
  if (users.length < 1) {
    throw new Error('No users found to seed data');
  }

  const [user1, user2] = users;

  let badge = await SkillBadge.findOne({ name: 'Project Pro' });
  if (!badge) {
    badge = await SkillBadge.create({
      name: 'Project Pro',
      description: 'Awarded for completing a project review',
      icon: '🏅',
      criteria: 'Approved project submission',
      isActive: true
    });
  }

  let mentor = await MentorProfile.findOne({ user: user2?._id || user1._id });
  if (!mentor) {
    mentor = await MentorProfile.create({
      user: user2?._id || user1._id,
      bio: 'Experienced mentor in full-stack development.',
      skills: ['JavaScript', 'Node.js', 'React'],
      ratePerHour: 0,
      status: 'approved',
      approvedAt: new Date()
    });
  }

  let cohort = await Cohort.findOne({ name: 'January Bootcamp' });
  if (!cohort) {
    cohort = await Cohort.create({
      name: 'January Bootcamp',
      description: 'Group learning cohort for January',
      mentor: mentor.user,
      capacity: 30,
      members: [user1._id],
      isActive: true
    });
  }

  const submission = await ProjectSubmission.create({
    user: user1._id,
    title: 'Sample Portfolio',
    description: 'A portfolio site built with React and Node.js',
    repoUrl: 'https://github.com/example/portfolio',
    demoUrl: 'https://example.com/portfolio',
    status: 'submitted'
  });

  user1.jobOutcomes = user1.jobOutcomes || [];
  user1.jobOutcomes.push({
    status: 'interviewing',
    company: 'Sample Co',
    role: 'Frontend Developer',
    source: 'Referral',
    location: 'Remote',
    notes: 'Phone screen scheduled'
  });
  await user1.save();

  if (user2) {
    await PeerReview.create({
      submission: submission._id,
      reviewer: user2._id,
      rating: 5,
      feedback: 'Great structure and clean UI.'
    });
  }

  console.log('✅ Seeded new feature sample data');
  console.log('Badge:', badge.name);
  console.log('Mentor:', mentor._id.toString());
  console.log('Cohort:', cohort.name);
  console.log('Submission:', submission._id.toString());

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
