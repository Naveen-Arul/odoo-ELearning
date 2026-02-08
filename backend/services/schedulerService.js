/**
 * SkillForge AI - Scheduler Service
 * Automated tasks using node-cron
 */

const cron = require('node-cron');
const User = require('../models/User');
const DailyStudyPlan = require('../models/DailyStudyPlan');

class SchedulerService {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  initialize() {
    console.log('📅 Initializing scheduler service...');

    // Daily study plan generation - Every day at midnight
    this.scheduleDailyPlanGeneration();

    console.log('✅ Scheduler service initialized with', this.jobs.length, 'jobs');
  }

  /**
   * Schedule daily study plan generation
   * Runs at midnight every day
   */
  scheduleDailyPlanGeneration() {
    const job = cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Running daily plan generation...');

      try {
        const users = await User.find({
          isActive: true,
          'enrolledRoadmaps.0': { $exists: true } // Has at least one enrolled roadmap
        }).select('_id name preferences enrolledRoadmaps');

        let generated = 0;
        let errors = 0;

        for (const user of users) {
          try {
            // Check if plan already exists for today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const existingPlan = await DailyStudyPlan.findOne({
              user: user._id,
              date: {
                $gte: today,
                $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
              }
            });

            if (existingPlan) continue;

            // Generate new plan
            await this.generateDailyPlan(user);
            generated++;
          } catch (error) {
            console.error(`Error generating plan for user ${user._id}:`, error.message);
            errors++;
          }
        }

        console.log(`✅ Daily plans generated: ${generated}, Errors: ${errors}`);
      } catch (error) {
        console.error('Daily plan generation failed:', error.message);
      }
    }, {
      timezone: 'UTC'
    });

    this.jobs.push(job);
  }


  /**
   * Generate daily study plan for a user
   */
  async generateDailyPlan(user) {
    const DailyStudyPlan = require('../models/DailyStudyPlan');
    const Topic = require('../models/Topic');

    // Get current roadmap
    const currentRoadmap = user.enrolledRoadmaps.find(r => r.isCurrent);
    if (!currentRoadmap) return null;

    // Get incomplete topics from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayPlan = await DailyStudyPlan.findOne({
      user: user._id,
      date: {
        $gte: yesterday,
        $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    // Get rolled over topics
    const rolledOverTopics = yesterdayPlan?.assignedTopics
      .filter(t => t.status !== 'completed')
      .map(t => t.topic) || [];

    // Calculate available time
    const dailyStudyTime = user.preferences?.dailyStudyTime || 60; // minutes

    // Get next topics from roadmap
    const completedTopicIds = currentRoadmap.completedTopics || [];
    const Roadmap = require('../models/Roadmap');
    const roadmap = await Roadmap.findById(currentRoadmap.roadmap)
      .populate('topics');

    if (!roadmap) return null;

    const pendingTopics = roadmap.topics.filter(
      t => !completedTopicIds.includes(t._id.toString())
    );

    // Assign topics based on available time
    const assignedTopics = [];
    let totalTime = 0;

    // First, add rolled over topics
    for (const topicId of rolledOverTopics) {
      const topic = await Topic.findById(topicId);
      if (topic && totalTime + topic.estimatedDuration <= dailyStudyTime) {
        assignedTopics.push({
          topic: topic._id,
          estimatedDuration: topic.estimatedDuration,
          status: 'pending',
          isRolledOver: true
        });
        totalTime += topic.estimatedDuration;
      }
    }

    // Then add new topics
    for (const topic of pendingTopics) {
      if (totalTime >= dailyStudyTime) break;

      // Skip if already in assigned
      if (assignedTopics.some(t => t.topic.toString() === topic._id.toString())) {
        continue;
      }

      assignedTopics.push({
        topic: topic._id,
        estimatedDuration: topic.estimatedDuration,
        status: 'pending',
        isRolledOver: false
      });
      totalTime += topic.estimatedDuration;
    }

    // Create the plan
    const plan = await DailyStudyPlan.create({
      user: user._id,
      date: new Date(),
      assignedTopics,
      plannedTime: totalTime,
      rolledOverFrom: rolledOverTopics.length > 0 ? yesterdayPlan?._id : null,
      summary: {
        totalTopics: assignedTopics.length,
        completedTopics: 0,
        completionPercentage: 0,
        isCompleted: false
      }
    });

    return plan;
  }

  /**
   * Get current hour in a specific timezone
   */
  getHourInTimezone(timezone) {
    try {
      const date = new Date();
      const options = { hour: 'numeric', hour12: false, timeZone: timezone };
      return parseInt(new Intl.DateTimeFormat('en-US', options).format(date));
    } catch (error) {
      return new Date().getUTCHours();
    }
  }

  getTimePartsInTimezone(timezone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      });
      const parts = formatter.formatToParts(new Date());
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
      return { hour, minute };
    } catch (error) {
      const now = new Date();
      return { hour: now.getUTCHours(), minute: now.getUTCMinutes() };
    }
  }

  getDateKeyInTimezone(date, timezone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: timezone
      }).format(date);
    } catch (error) {
      return date.toISOString().slice(0, 10);
    }
  }

  stopAll() {
    for (const job of this.jobs) {
      job.stop();
    }
    this.jobs = [];
    console.log('🛑 All scheduled jobs stopped');
  }
}

module.exports = new SchedulerService();
