const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Import Models
const User = require('../models/User');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const TestAttempt = require('../models/TestAttempt');
const AIChatSession = require('../models/AIChatSession');
const Role = require('../models/Role'); // Needed for Roadmap creation

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    bold: "\x1b[1m"
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

const runTests = async () => {
    try {
        log("🔄 Connecting to Database...", colors.blue);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillforge');
        log("✅ Database Connected\n", colors.green);

        // ============================================
        // TEST 1: Admin -> User Data Flow
        // ============================================
        log("🧪 TEST 1: Verifying Admin -> User Data Flow", colors.bold);

        // 1.1 Simulate Admin Creating Content
        const testSlug = `test-roadmap-${Date.now()}`;
        const testTopicTitle = `Test Topic ${Date.now()}`;

        // Create a dummy role if needed
        let role = await Role.findOne();
        if (!role) {
            role = await Role.create({ name: 'Test Role', slug: 'test-role', isActive: true });
        }

        const newRoadmap = await Roadmap.create({
            title: `Admin Created Roadmap ${Date.now()}`,
            slug: testSlug,
            description: 'A roadmap created by admin to test visibility',
            role: role._id,
            skillLevel: 'beginner',
            isPublished: true, // IMPORTANT: Admin sets this to true
            isActive: true
        });

        const newTopic = await Topic.create({
            title: testTopicTitle,
            roadmap: newRoadmap._id,
            description: 'Topic description',
            documentation: {
                content: '# Topic content here',
                title: 'Doc Title'
            },
            estimatedDuration: 30, // Required field
            videoLinks: { english: { url: 'http://youtube.com/test' } },
            isActive: true
        });

        // Link topic to roadmap
        newRoadmap.topics = [newTopic._id];
        await newRoadmap.save();

        log(`   [Admin Action] Created Roadmap: ${newRoadmap.title}`, colors.yellow);

        // 1.2 Simulate User Fetching Content (mimicking the route logic)
        const userVisibleRoadmaps = await Roadmap.find({
            isPublished: true,
            isActive: true,
            _id: newRoadmap._id // Specific check for our map
        });

        if (userVisibleRoadmaps.length > 0 && userVisibleRoadmaps[0].title === newRoadmap.title) {
            log(`   [User View] ✅ Success: Roadmap is visible to users`, colors.green);
        } else {
            log(`   [User View] ❌ Failure: Roadmap not found in query`, colors.red);
        }


        // ============================================
        // TEST 2: User Progress & Persistence (Watch Time, Tests)
        // ============================================
        log("\n🧪 TEST 2: Verifying User Progress Persistence", colors.bold);

        // 2.1 Create a Test User
        const testUserEmail = `testuser${Date.now()}@example.com`;
        const user = await User.create({
            name: 'Test User',
            email: testUserEmail,
            password: 'password123',
            preferences: { targetRole: role._id }
        });

        // 2.2 Simulate Enrollment
        user.enrolledRoadmaps.push({
            roadmap: newRoadmap._id,
            status: 'current',
            enrolledAt: new Date(),
            completedTopics: []
        });
        await user.save();
        log(`   [User Action] Enrolled in roadmap`, colors.yellow);

        // 2.3 Simulate Taking a Test (Passing)
        const attempt = await TestAttempt.create({
            user: user._id,
            topic: newTopic._id,
            roadmap: newRoadmap._id,
            questions: [{
                questionText: 'TestQ',
                questionType: 'multiple-choice',
                options: [{ text: 'A', isCorrect: true }],
                correctAnswer: 'A',
                userAnswer: 'A',
                isCorrect: true,
                points: 1
            }],
            score: { passed: true, percentage: 85, totalQuestions: 10, correctAnswers: 8 },
            status: 'completed',
            timing: { timeSpent: 120 } // 120 seconds for test
        });
        log(`   [User Action] Passed test with 85%`, colors.yellow);

        // 2.4 Simulate Watching Video (Completing Topic with Time Spent)
        const watchTimeMinutes = 45;
        const enrollment = user.enrolledRoadmaps.find(er => er.roadmap.toString() === newRoadmap._id.toString());
        enrollment.completedTopics.push({
            topic: newTopic._id,
            completedAt: new Date(),
            testScore: 85,
            timeSpent: watchTimeMinutes // Persisting watch time
        });
        await user.save();
        log(`   [User Action] Completed topic with ${watchTimeMinutes} min watch time`, colors.yellow);

        // 2.5 Verify Persistence
        const fetchedUser = await User.findOne({ email: testUserEmail });
        const fetchedEnrollment = fetchedUser.enrolledRoadmaps[0];
        const completedTopic = fetchedEnrollment.completedTopics[0];

        if (completedTopic && completedTopic.timeSpent === watchTimeMinutes) {
            log(`   [DB Verification] ✅ Success: Watch time (${completedTopic.timeSpent}m) persisted correctly`, colors.green);
        } else {
            log(`   [DB Verification] ❌ Failure: Watch time mismatch`, colors.red);
        }

        const fetchedAttempt = await TestAttempt.findById(attempt._id);
        if (fetchedAttempt && fetchedAttempt.score.percentage === 85) {
            log(`   [DB Verification] ✅ Success: Test result (85%) persisted correctly`, colors.green);
        } else {
            log(`   [DB Verification] ❌ Failure: Test result mismatch`, colors.red);
        }


        // ============================================
        // TEST 3: AI Session Persistence
        // ============================================
        log("\n🧪 TEST 3: Verifying AI Session Persistence", colors.bold);

        // 3.1 Simulate AI Chat
        const session = await AIChatSession.create({
            user: user._id,
            type: 'tutor',
            messages: [
                { role: 'user', content: 'Explain React hooks' },
                { role: 'assistant', content: 'Hooks are functions...' }
            ],
            context: { topic: newTopic._id }
        });
        log(`   [User Action] Chat with AI Tutor`, colors.yellow);

        // 3.2 Verify Persistence
        const fetchedSession = await AIChatSession.findById(session._id);
        if (fetchedSession && fetchedSession.messages.length === 2 && fetchedSession.type === 'tutor') {
            log(`   [DB Verification] ✅ Success: AI Session persisted correctly`, colors.green);
        } else {
            log(`   [DB Verification] ❌ Failure: AI Session mismatch`, colors.red);
        }

        // Cleanup
        log("\n🧹 Cleaning up test data...", colors.blue);
        await User.deleteOne({ _id: user._id });
        await Roadmap.deleteOne({ _id: newRoadmap._id });
        await Topic.deleteOne({ _id: newTopic._id });
        await TestAttempt.deleteOne({ _id: attempt._id });
        await AIChatSession.deleteOne({ _id: session._id });
        log("✅ Cleanup complete", colors.green);

    } catch (error) {
        log(`❌ Error: ${error.message}`, colors.red);
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runTests();
