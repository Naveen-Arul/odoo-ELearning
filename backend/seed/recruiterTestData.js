/**
 * Recruiter Test Data Seed
 * Creates comprehensive test data for recruiter portal testing
 */

const User = require('../models/User');
const Recruiter = require('../models/Recruiter');
const JobPosting = require('../models/JobPosting');
const JobApplication = require('../models/JobApplication');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const SkillBadge = require('../models/SkillBadge');
const skillMatcher = require('../services/skillMatcher');

/**
 * Create test users with varying skill levels
 */
async function createTestUsers() {
    console.log('Creating test users...');

    const testUsers = [
        {
            name: 'John Developer',
            email: 'john.dev@test.com',
            password: 'password123',
            preferences: {
                skillLevel: 'intermediate',
                dailyStudyTime: 4
            }
        },
        {
            name: 'Sarah Engineer',
            email: 'sarah.eng@test.com',
            password: 'password123',
            preferences: {
                skillLevel: 'advanced',
                dailyStudyTime: 6
            }
        },
        {
            name: 'Mike Junior',
            email: 'mike.junior@test.com',
            password: 'password123',
            preferences: {
                skillLevel: 'beginner',
                dailyStudyTime: 2
            }
        }
    ];

    const createdUsers = [];
    for (const userData of testUsers) {
        const existing = await User.findOne({ email: userData.email });
        if (!existing) {
            const user = await User.create(userData);
            createdUsers.push(user);
        } else {
            createdUsers.push(existing);
        }
    }

    console.log(`✓ Created ${createdUsers.length} test users`);
    return createdUsers;
}

/**
 * Add skills and progress to test users
 */
async function addUserSkillsAndProgress(users) {
    console.log('Adding skills and progress to test users...');

    // Get some roadmaps and topics
    const roadmaps = await Roadmap.find().limit(3);
    const topics = await Topic.find().limit(10);
    const languages = await ProgrammingLanguage.find().limit(3);

    for (let i = 0; i < users.length; i++) {
        const user = users[i];

        // Enroll in roadmaps
        if (roadmaps.length > 0) {
            const enrollmentRoadmap = roadmaps[i % roadmaps.length];
            user.enrolledRoadmaps.push({
                roadmap: enrollmentRoadmap._id,
                status: 'active',
                progress: (i + 1) * 25,
                completedTopics: topics.slice(0, (i + 1) * 2).map(t => ({
                    topic: t._id,
                    completedAt: new Date(),
                    timeSpent: 30 + (i * 10)
                }))
            });
        }

        // Add language learning
        if (languages.length > 0) {
            user.languageLearning.push({
                language: languages[i % languages.length]._id,
                level: i === 0 ? 'intermediate' : i === 1 ? 'advanced' : 'beginner',
                progress: (i + 1) * 30
            });
        }

        // Add study time
        for (let j = 0; j < 7; j++) {
            const date = new Date();
            date.setDate(date.getDate() - j);
            user.studyTime.push({
                date,
                minutes: 60 + (i * 30) + Math.floor(Math.random() * 60),
                topicsCompleted: 1 + i
            });
        }

        await user.save();
    }

    console.log('✓ Added skills and progress to users');
}

/**
 * Create test recruiters
 */
const Company = require('../models/Company');

/**
 * Create test recruiters with companies
 */
async function createTestRecruiters() {
    console.log('Creating test recruiters...');

    const recruiterUsers = [
        {
            name: 'Tech Corp Recruiter',
            email: 'recruiter@techcorp.com',
            password: 'password123',
            role: 'recruiter' // role should be recruiter
        },
        {
            name: 'Startup Talent',
            email: 'hiring@startup.com',
            password: 'password123',
            role: 'recruiter'
        }
    ];

    const companyData = [
        {
            name: 'TechCorp Solutions',
            website: 'https://techcorp.com',
            industry: 'Software Development',
            size: '501-1000',
            location: {
                city: 'San Francisco',
                country: 'USA'
            },
            description: 'Leading software development company',
            contactInfo: {
                email: 'jobs@techcorp.com',
                phone: '+1-555-0100',
                linkedin: 'https://linkedin.com/company/techcorp'
            }
        },
        {
            name: 'StartupHub Inc',
            website: 'https://startuphub.com',
            industry: 'Technology',
            size: '11-50',
            location: {
                city: 'Austin',
                country: 'USA'
            },
            description: 'Innovative startup building next-gen solutions',
            contactInfo: {
                email: 'careers@startuphub.com',
                phone: '+1-555-0200',
                linkedin: 'https://linkedin.com/company/startuphub'
            }
        }
    ];

    const createdRecruiters = [];

    for (let i = 0; i < recruiterUsers.length; i++) {
        // Create user
        let user = await User.findOne({ email: recruiterUsers[i].email });
        if (!user) {
            user = await User.create(recruiterUsers[i]);
        }

        // Create or find company
        let company = await Company.findOne({ name: companyData[i].name });
        if (!company) {
            company = await Company.create({
                ...companyData[i],
                admin: user._id, // Assign this recruiter as admin for test purposes
                status: 'active',
                verified: true
            });
        }

        // Create recruiter profile
        let recruiter = await Recruiter.findOne({ user: user._id });
        if (!recruiter) {
            recruiter = await Recruiter.create({
                user: user._id,
                company: company._id,
                contactInfo: companyData[i].contactInfo,
                status: 'active',
                verified: true
            });
        }

        // Populate company for return
        await recruiter.populate('company');
        createdRecruiters.push(recruiter);
    }

    console.log(`✓ Created ${createdRecruiters.length} test recruiters`);
    return createdRecruiters;
}

/**
 * Create test job postings
 */
async function createTestJobs(recruiters) {
    console.log('Creating test job postings...');

    const jobData = [
        {
            title: 'Senior Full Stack Developer',
            description: 'We are looking for an experienced full stack developer to join our team and build amazing web applications.',
            requirements: {
                skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST API', 'Git'],
                experience: '3-5 years of experience',
                education: 'Bachelor\'s degree in Computer Science or related field',
                certifications: []
            },
            responsibilities: [
                'Design and develop web applications',
                'Write clean, maintainable code',
                'Collaborate with team members',
                'Participate in code reviews'
            ],
            location: {
                city: 'San Francisco',
                state: 'CA',
                country: 'USA',
                remote: true
            },
            salary: {
                min: 120000,
                max: 160000,
                currency: 'USD',
                period: 'yearly'
            },
            type: 'full-time',
            category: 'fullstack',
            status: 'active'
        },
        {
            title: 'Frontend Developer',
            description: 'Join our team to build beautiful, responsive user interfaces.',
            requirements: {
                skills: ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript'],
                experience: '2-4 years',
                education: 'Bachelor\'s degree preferred'
            },
            responsibilities: [
                'Build responsive UIs',
                'Implement designs',
                'Optimize performance'
            ],
            location: {
                city: 'Austin',
                state: 'TX',
                country: 'USA',
                remote: false
            },
            salary: {
                min: 90000,
                max: 130000,
                currency: 'USD',
                period: 'yearly'
            },
            type: 'full-time',
            category: 'frontend',
            status: 'active'
        },
        {
            title: 'Junior Backend Developer',
            description: 'Entry-level position for backend development with mentorship.',
            requirements: {
                skills: ['Python', 'Django', 'SQL', 'Git'],
                experience: '0-2 years',
                education: 'Bachelor\'s degree or bootcamp graduate'
            },
            responsibilities: [
                'Develop backend APIs',
                'Write tests',
                'Learn from senior developers'
            ],
            location: {
                city: 'Remote',
                remote: true
            },
            salary: {
                min: 70000,
                max: 90000,
                currency: 'USD',
                period: 'yearly'
            },
            type: 'full-time',
            category: 'backend',
            status: 'active'
        }
    ];

    const createdJobs = [];

    for (let i = 0; i < jobData.length; i++) {
        const recruiter = recruiters[i % recruiters.length];

        const job = await JobPosting.create({
            ...jobData[i],
            recruiter: recruiter._id,
            company: recruiter.company.name
        });

        // Update recruiter stats
        recruiter.jobsPosted.push(job._id);
        recruiter.stats.totalJobsPosted += 1;
        await recruiter.save();

        createdJobs.push(job);
    }

    console.log(`✓ Created ${createdJobs.length} test job postings`);
    return createdJobs;
}

/**
 * Create test job applications
 */
async function createTestApplications(users, jobs) {
    console.log('Creating test job applications...');

    const createdApplications = [];

    for (const job of jobs) {
        // Each job gets 2-3 applications
        const numApplications = 2 + Math.floor(Math.random() * 2);

        for (let i = 0; i < numApplications && i < users.length; i++) {
            const user = users[i];

            // Get user with populated data
            const populatedUser = await User.findById(user._id)
                .populate('enrolledRoadmaps.roadmap')
                .populate('enrolledRoadmaps.completedTopics.topic')
                .populate('languageLearning.language')
                .populate('badges.badge');

            // Calculate match score
            const matchResult = await skillMatcher.calculateMatchScore(populatedUser, job);

            // Create application
            const application = await JobApplication.create({
                job: job._id,
                applicant: user._id,
                resume: `https://example.com/resume/${user.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                coverLetter: `I am very interested in the ${job.title} position at ${job.company}. I believe my skills and experience make me a great fit for this role.`,
                matchScore: matchResult.overall,
                skillAnalysis: {
                    breakdown: matchResult.breakdown,
                    skillGaps: matchResult.skillGaps,
                    recommendations: matchResult.recommendations
                },
                status: i === 0 ? 'shortlisted' : 'submitted',
                timeline: [
                    {
                        status: 'submitted',
                        date: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
                        note: `Application submitted with ${matchResult.overall}% match score`
                    }
                ]
            });

            // Update job and recruiter stats
            job.applications.push(application._id);
            job.stats.applications += 1;
            if (i === 0) {
                job.stats.shortlisted += 1;
            }
            await job.save();

            await Recruiter.findByIdAndUpdate(job.recruiter, {
                $inc: { 'stats.totalApplications': 1 }
            });

            createdApplications.push(application);
        }
    }

    console.log(`✓ Created ${createdApplications.length} test job applications`);
    return createdApplications;
}

/**
 * Main seed function
 */
async function seedRecruiterData() {
    try {
        console.log('\n🌱 Starting recruiter test data seeding...\n');

        const users = await createTestUsers();
        await addUserSkillsAndProgress(users);
        const recruiters = await createTestRecruiters();
        const jobs = await createTestJobs(recruiters);
        const applications = await createTestApplications(users, jobs);

        console.log('\n✅ Recruiter test data seeding completed successfully!\n');
        console.log('Summary:');
        console.log(`  - Users: ${users.length}`);
        console.log(`  - Recruiters: ${recruiters.length}`);
        console.log(`  - Jobs: ${jobs.length}`);
        console.log(`  - Applications: ${applications.length}\n`);

        return { users, recruiters, jobs, applications };
    } catch (error) {
        console.error('❌ Error seeding recruiter data:', error);
        throw error;
    }
}

module.exports = { seedRecruiterData };
