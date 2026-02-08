# SkillForge AI — MongoDB to PostgreSQL (Neon) Migration Guide

> **Purpose:** Step-by-step documentation for migrating the SkillForge AI backend from MongoDB (Mongoose) to PostgreSQL hosted on Neon, using Prisma ORM.
>
> ⚠️ **This document is for planning only.** No code has been modified. Follow these steps when you are ready to execute the migration.

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1 — Set Up Neon & Prisma](#3-phase-1--set-up-neon--prisma)
4. [Phase 2 — Schema Mapping Decisions](#4-phase-2--schema-mapping-decisions)
5. [Phase 3 — Data Migration](#5-phase-3--data-migration)
6. [Phase 4 — Code Changes (Backend)](#6-phase-4--code-changes-backend)
7. [Phase 5 — Code Changes (Frontend)](#7-phase-5--code-changes-frontend)
8. [Phase 6 — Testing](#8-phase-6--testing)
9. [Phase 7 — Deployment](#9-phase-7--deployment)
10. [Rollback Plan](#10-rollback-plan)
11. [Schema Mapping Reference](#11-schema-mapping-reference)
12. [Key Differences: Mongoose vs Prisma](#12-key-differences-mongoose-vs-prisma)
13. [Common Pitfalls](#13-common-pitfalls)

---

## 1. Migration Overview

### What Changes

| Component | Current | Target |
|---|---|---|
| Database | MongoDB Atlas | Neon PostgreSQL (serverless) |
| ORM/ODM | Mongoose 8.x | Prisma Client |
| IDs | MongoDB ObjectId (24-char hex) | UUID (36-char with dashes) |
| Embedded docs | Nested objects/arrays in documents | Separate tables with foreign keys OR Json columns |
| Schema | Runtime validation (Mongoose schemas) | Compile-time type safety (Prisma + generated types) |

### What Stays the Same

- Express.js server and all route files
- Middleware architecture (auth, validation, error handling)
- Frontend (React) — no changes needed (only API response shapes matter)
- AI service, email service, scheduler logic
- Socket.io real-time features
- All API endpoint URLs and response shapes

### Migration Scope

- **32 Mongoose models** → **47+ Prisma models** (embedded sub-documents become separate tables)
- **7 service files** need ORM calls updated
- **31 route files** need query/mutation calls updated
- **4 middleware files** — auth.js needs User query updated
- **1 config file** — database.js replaced with Prisma client initialization
- **1 seed file** — seedData.js rewritten for Prisma

---

## 2. Prerequisites

### 2.1 Create Neon Account & Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project (e.g., `skillforge-ai`)
3. Choose region closest to your users
4. Copy the connection strings:
   - **Pooled connection** (for application): `postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require`
   - **Direct connection** (for migrations): `postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require` (non-pooled)

### 2.2 Install Dependencies

```bash
cd backend

# Install Prisma
npm install prisma --save-dev
npm install @prisma/client

# Remove Mongoose (after migration is complete, not now)
# npm uninstall mongoose
```

### 2.3 Environment Setup

Add to `backend/.env`:

```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/skillforge-ai?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/skillforge-ai?sslmode=require"
```

---

## 3. Phase 1 — Set Up Neon & Prisma

### Step 1: Initialize Prisma

```bash
cd backend
npx prisma init
```

This creates:
- `prisma/schema.prisma` — **Already provided** in `prisma/schema.prisma` at the repo root
- `.env` update with `DATABASE_URL`

### Step 2: Copy the Schema

The complete Prisma schema is already created at `prisma/schema.prisma` in the project root. Copy or move it:

```bash
# If prisma init created backend/prisma/, use the root one instead
cp ../prisma/schema.prisma ./prisma/schema.prisma
```

Or configure Prisma to use the root schema by adding to `backend/package.json`:

```json
{
  "prisma": {
    "schema": "../prisma/schema.prisma"
  }
}
```

### Step 3: Push Schema to Neon

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push

# Or use migrations for version control
npx prisma migrate dev --name init
```

### Step 4: Verify

```bash
# Open Prisma Studio to inspect tables
npx prisma studio
```

---

## 4. Phase 2 — Schema Mapping Decisions

### 4.1 ID Strategy

| Decision | Details |
|---|---|
| **New IDs** | All PostgreSQL records get new UUIDs |
| **ID mapping table** | Create a temporary `id_mapping` table: `{ collection, mongo_id, pg_uuid }` |
| **Why** | MongoDB ObjectIds (24-char hex) don't map cleanly to UUIDs. A mapping table preserves referential integrity during migration. |

### 4.2 Embedded Documents → Tables vs Json

The Prisma schema makes these decisions:

| MongoDB Embedded Doc | Prisma Approach | Reason |
|---|---|---|
| `user.enrolledRoadmaps[]` | Separate `UserEnrolledRoadmap` table | Needs querying, foreign keys |
| `user.enrolledRoadmaps[].completedTopics[]` | Separate `UserCompletedTopic` table | Needs querying |
| `user.languageLearning[]` | Separate `UserLanguageLearning` table | Needs querying |
| `user.gamification.badges[]` | Separate `UserBadge` join table | Many-to-many |
| `user.studyTime.monthly/weekly/daily` | Json columns | Rarely queried, dynamic keys |
| `user.careerData.*` | Flattened columns + Json | Mix of simple fields and complex objects |
| `user.jobOutcomes[]` | Separate `UserJobOutcome` table | Needs querying |
| `roadmap.reviews[]` | Separate `RoadmapReview` table | Needs querying |
| `roadmap.prerequisites[]` | Separate `RoadmapPrerequisite` table | Self-referencing relation |
| `topic.videoLinks.*` | Json columns | Structured but not queried independently |
| `aiChatSession.messages[]` | Separate `AIChatMessage` table | Can grow large, needs pagination |
| `dailyStudyPlan.assignedTopics[]` | Separate `StudyPlanTopic` table | Needs status updates |
| `communityPost.comments[]` | Separate `CommunityComment` table | Needs querying, pagination |
| `communityPost.upvotes[]` | Separate `PostUpvote` join table | Many-to-many |
| `studyRoom.members[]` | Separate `StudyRoomMember` table | Needs role tracking |
| `studyRoom.messages[]` | Json column | High-volume, consider separate table later |
| `hackathon.participants[]` | Separate `HackathonParticipant` table | Needs querying |
| `hackathon.submissions[]` | Separate `HackathonSubmission` table | Needs scoring |
| `challenge.activeUsers[]` | Separate `ChallengeParticipant` table | Needs progress tracking |
| `testAttempt.questions[]` | Json column | Complex structure, not individually queried |
| `cohort.members[]` | Separate `CohortMember` join table | Many-to-many |
| `timeTrackingSession.pauses[]` | Json column | Simple tracking data |
| `careerAnalysis.*Stats` | Json columns | Complex nested data |
| `jobPosting.rounds[]` | Json column | Configuration data |
| `jobApplication.timeline[]` | Json column | Audit trail |

### 4.3 Enum Mapping

All MongoDB string enums with limited values are mapped to PostgreSQL enums via Prisma's `enum` type. Key mappings to note:

| MongoDB Value | Prisma Enum | Notes |
|---|---|---|
| `user.role = 'user'` | `UserRole.student` | Renamed to `student` in Prisma |
| `user.role = 'company_admin'` | `UserRole.company_admin` | New role for company dashboard access |
| `company.size = '1-10'` | `CompanySize.size_1_10` | Hyphenated values use `@map("1-10")` |
| `company.status = 'suspended'` | `CompanyStatus.suspended` | Added to match Mongoose validation |
| `hackathon.status = 'upcoming'` | `HackathonStatus.upcoming` | Lowercase values (not `Upcoming`) |
| `leetcode.difficulty = 'easy'` | `LeetCodeDifficulty.easy` | Lowercase values |
| `jobApplication.status = 'under-review'` | `JobApplicationStatus.under_review` | Hyphens mapped via `@map("under-review")` |
| `jobPosting.type = 'full-time'` | `JobType.full_time` | Hyphens mapped via `@map("full-time")` |
| `timeTracking.contentType = 'roadmap-topic'` | `TimeTrackingContentType.roadmap_topic` | Hyphens mapped via `@map` |

See the full enum list in `prisma/schema.prisma`.

---

## 5. Phase 3 — Data Migration

### 5.1 Migration Script Strategy

Create a standalone migration script that:
1. Connects to both MongoDB and PostgreSQL
2. Reads documents from each MongoDB collection
3. Transforms and inserts into PostgreSQL tables
4. Maintains an ID mapping table for foreign key resolution

### 5.2 Migration Script Template

Create `backend/scripts/migrateToPostgres.js`:

```javascript
/**
 * MongoDB → PostgreSQL Migration Script
 * Run: node scripts/migrateToPostgres.js
 */

const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

// Import all Mongoose models
const models = require('../models');

const prisma = new PrismaClient();

// ID mapping: { collectionName: { mongoId: pgUuid } }
const idMap = {};

function mapId(collection, mongoId) {
  if (!mongoId) return null;
  const key = mongoId.toString();
  if (!idMap[collection]) idMap[collection] = {};
  if (!idMap[collection][key]) {
    idMap[collection][key] = uuidv4();
  }
  return idMap[collection][key];
}

async function migrateUsers() {
  console.log('Migrating users...');
  const users = await models.User.find().lean();

  for (const user of users) {
    const pgId = mapId('users', user._id);

    await prisma.user.create({
      data: {
        id: pgId,
        name: user.name,
        email: user.email,
        password: user.password || null,
        role: user.role === 'user' ? 'student' : (user.role || 'student'),
        authProvider: user.authProvider || 'local',
        googleId: user.googleId || null,
        githubId: user.githubId || null,
        avatar: user.avatar || '',
        isActive: user.isActive ?? true,
        isEmailVerified: user.isEmailVerified ?? false,
        isOnboarded: user.isOnboarded ?? false,
        lastLogin: user.lastLogin || null,
        prefTargetRoleId: user.preferences?.targetRole
          ? mapId('roles', user.preferences.targetRole)
          : null,
        prefSkillLevel: user.preferences?.skillLevel || 'beginner',
        prefDailyStudyTime: user.preferences?.dailyStudyTime || 2,
        prefPreferredLang: user.preferences?.preferredLanguage || 'english',
        // ... map remaining fields
        createdAt: user.createdAt || new Date(),
        updatedAt: user.updatedAt || new Date(),
      }
    });
  }

  console.log(`  ✅ Migrated ${users.length} users`);
}

async function migrateRoles() {
  console.log('Migrating roles...');
  const roles = await models.Role.find().lean();

  for (const role of roles) {
    const pgId = mapId('roles', role._id);

    await prisma.role.create({
      data: {
        id: pgId,
        name: role.name,
        slug: role.slug,
        description: role.description || '',
        category: role.category || 'development',
        // ... map remaining fields
        createdAt: role.createdAt || new Date(),
        updatedAt: role.updatedAt || new Date(),
      }
    });
  }

  console.log(`  ✅ Migrated ${roles.length} roles`);
}

// ... Similar functions for all other collections

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Migration order matters (parent tables first)
    await migrateRoles();           // No dependencies
    await migrateUsers();           // Depends on roles
    await migrateRoadmaps();        // Depends on roles
    await migrateTopics();          // Depends on roadmaps
    // ... continue in dependency order

    console.log('\\n🎉 Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
  }
}

migrate();
```

### 5.3 Migration Order (Dependency-Aware)

Execute migrations in this order to satisfy foreign key constraints:

```
1.  Role                    (no dependencies)
2.  SkillBadge              (no dependencies)
3.  User                    (→ Role)
4.  ProgrammingLanguage     (no dependencies)
5.  Roadmap                 (→ Role)
6.  Topic                   (→ Roadmap)
7.  LanguageTopic           (→ ProgrammingLanguage)
8.  Company                 (→ User)
9.  Recruiter               (→ User, Company)
10. JobPosting              (→ Recruiter)
11. RoadmapReview           (→ Roadmap, User)
12. RoadmapPrerequisite     (→ Roadmap)
13. UserEnrolledRoadmap     (→ User, Roadmap)
14. UserCompletedTopic      (→ UserEnrolledRoadmap, Topic)
15. UserLanguageLearning    (→ User, ProgrammingLanguage)
16. UserCompletedLangTopic  (→ UserLanguageLearning, LanguageTopic)
17. UserBadge               (→ User, SkillBadge)
18. UserJobOutcome          (→ User)
19. TestAttempt             (→ User, Topic, Roadmap)
20. AIChatSession           (→ User, Topic, Role)
21. AIChatMessage           (→ AIChatSession)
22. DailyStudyPlan          (→ User, Roadmap)
23. StudyPlanTopic          (→ DailyStudyPlan, Topic)
24. StudyPlanLanguageTopic  (→ DailyStudyPlan, LanguageTopic)
25. CareerAnalysis          (→ User)
26. Certificate             (→ User, Roadmap)
27. LeetCodeSubmission      (→ User)
28. TimeTrackingSession     (→ User, Topic, Roadmap, ProgrammingLanguage)
29. MentorProfile           (→ User)
30. MentoringSession        (→ MentorProfile, User)
31. Cohort                  (→ User)
32. CohortMember            (→ Cohort, User)
33. Connection              (→ User, User)
34. Message                 (→ User, User)
35. StudyRoom               (→ User, Topic, Roadmap)
36. StudyRoomMember         (→ StudyRoom, User)
37. CommunityPost           (→ User)
38. CommunityComment        (→ CommunityPost, User)
39. CommentUpvote           (→ CommunityComment, User)
40. PostUpvote              (→ CommunityPost, User)
41. PostDownvote            (→ CommunityPost, User)
42. ProjectSubmission       (→ User, SkillBadge, Roadmap)
43. PeerReview              (→ ProjectSubmission, User)
44. JobApplication          (→ JobPosting, User)
45. Hackathon               (→ User)
46. HackathonParticipant    (→ Hackathon, User)
47. HackathonSubmission     (→ Hackathon)
48. Challenge               (no dependencies)
49. ChallengeParticipant    (→ Challenge, User)
50. Leaderboard             (→ User)
51. AuditLog                (→ User)
52. RoleRelation            (→ Role, Role)
```

---

## 6. Phase 4 — Code Changes (Backend)

### 6.1 Database Connection

**Replace** `config/database.js`:

```javascript
// BEFORE (MongoDB)
const mongoose = require('mongoose');
const connectDatabase = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
};

// AFTER (Prisma)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const connectDatabase = async () => {
  await prisma.$connect();
};
module.exports = { prisma, connectDatabase };
```

### 6.2 Model Queries → Prisma Queries

Every Mongoose query needs to be converted. Here are the patterns:

#### Find Operations

```javascript
// BEFORE (Mongoose)
const user = await User.findById(id);
const user = await User.findOne({ email });
const users = await User.find({ role: 'admin' }).sort({ createdAt: -1 }).limit(10);

// AFTER (Prisma)
const user = await prisma.user.findUnique({ where: { id } });
const user = await prisma.user.findUnique({ where: { email } });
const users = await prisma.user.findMany({
  where: { role: 'admin' },
  orderBy: { createdAt: 'desc' },
  take: 10,
});
```

#### Create Operations

```javascript
// BEFORE (Mongoose)
const user = await User.create({ name, email, password });

// AFTER (Prisma)
const user = await prisma.user.create({
  data: { name, email, password },
});
```

#### Update Operations

```javascript
// BEFORE (Mongoose)
const user = await User.findByIdAndUpdate(id, { name }, { new: true });

// AFTER (Prisma)
const user = await prisma.user.update({
  where: { id },
  data: { name },
});
```

#### Delete Operations

```javascript
// BEFORE (Mongoose)
await User.findByIdAndDelete(id);

// AFTER (Prisma)
await prisma.user.delete({ where: { id } });
```

#### Population (Joins)

```javascript
// BEFORE (Mongoose)
const roadmap = await Roadmap.findById(id).populate('role').populate('topics');

// AFTER (Prisma)
const roadmap = await prisma.roadmap.findUnique({
  where: { id },
  include: { role: true, topics: true },
});
```

#### Embedded Array Push → Create Related Record

```javascript
// BEFORE (Mongoose) - Push to embedded array
user.enrolledRoadmaps.push({ roadmap: roadmapId, status: 'current' });
await user.save();

// AFTER (Prisma) - Create related record
await prisma.userEnrolledRoadmap.create({
  data: {
    userId: user.id,
    roadmapId,
    status: 'current',
  },
});
```

#### Aggregation

```javascript
// BEFORE (Mongoose)
const stats = await TestAttempt.aggregate([
  { $match: { userId: user._id } },
  { $group: { _id: null, avgScore: { $avg: '$percentage' } } }
]);

// AFTER (Prisma)
const stats = await prisma.testAttempt.aggregate({
  where: { userId: user.id },
  _avg: { percentage: true },
});
```

### 6.3 Files to Modify (Summary)

| File | Changes Needed |
|---|---|
| `config/database.js` | Replace mongoose.connect with Prisma client |
| `config/passport.js` | Replace User.findOne/create with Prisma queries |
| `middleware/auth.js` | Replace User.findById with prisma.user.findUnique |
| `models/` (all) | Remove or keep as reference; Prisma schema replaces them |
| `routes/auth.js` | All User queries → Prisma |
| `routes/users.js` | All User queries → Prisma |
| `routes/roadmaps.js` | Roadmap/Topic queries → Prisma |
| `routes/topics.js` | Topic queries → Prisma |
| `routes/ai.js` | AIChatSession/Topic/User queries → Prisma |
| `routes/career.js` | CareerAnalysis queries → Prisma |
| `routes/admin.js` | All CRUD operations → Prisma |
| `routes/tests.js` | TestAttempt queries → Prisma |
| `routes/studyPlan.js` | DailyStudyPlan queries → Prisma |
| `routes/community.js` | CommunityPost queries → Prisma |
| `routes/jobs.js` | JobPosting/Application queries → Prisma |
| `routes/social.js` | Connection/Message queries → Prisma |
| `routes/mentors.js` | MentorProfile/Session queries → Prisma |
| `routes/assessments.js` | ProjectSubmission/PeerReview → Prisma |
| All other routes | Similar pattern |
| `services/aiService.js` | No DB queries (just AI API calls) — **no changes** |
| `services/xpService.js` | User gamification updates → Prisma |
| `services/badgeService.js` | Badge/User queries → Prisma |
| `services/schedulerService.js` | DailyStudyPlan/User queries → Prisma |
| `services/emailService.js` | No DB queries — **no changes** |
| `services/skillMatcher.js` | User/Job queries → Prisma |
| `seed/seedData.js` | Rewrite for Prisma createMany/create |

### 6.4 Middleware Changes

#### `auth.js` — Protect Middleware

```javascript
// BEFORE
const user = await User.findById(decoded.id).select('-password');

// AFTER
const user = await prisma.user.findUnique({
  where: { id: decoded.id },
  // Prisma doesn't have .select('-field'), manually exclude:
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    isActive: true,
    // ... all fields EXCEPT password
  }
});
```

### 6.5 Instance Methods → Utility Functions

Mongoose instance methods (e.g., `user.comparePassword()`, `session.addMessage()`) need to become standalone functions or service methods:

```javascript
// BEFORE (Mongoose instance method)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// AFTER (Standalone utility)
const bcrypt = require('bcryptjs');
async function comparePassword(hashedPassword, candidatePassword) {
  return await bcrypt.compare(candidatePassword, hashedPassword);
}
```

---

## 7. Phase 5 — Code Changes (Frontend)

### No Frontend Changes Required

The frontend communicates with the backend exclusively through REST APIs. As long as:
- API endpoint URLs remain the same (`/api/v1/...`)
- Response shapes remain the same (`{ success, data, message }`)
- ID format change (ObjectId → UUID) is handled consistently

The frontend code in `src/services/api.js`, stores, and components needs **zero changes**.

### One Consideration: ID Format

MongoDB ObjectIds are 24-character hex strings: `507f1f77bcf86cd799439011`
PostgreSQL UUIDs are 36-character strings with dashes: `550e8400-e29b-41d4-a716-446655440000`

If the frontend stores IDs locally (e.g., in URL params), this change is transparent. But if any frontend code validates ID format (regex checks for 24-char hex), that would need updating. In SkillForge AI, the frontend does not validate ID formats, so **no changes needed**.

---

## 8. Phase 6 — Testing

### 8.1 Test Checklist

- [ ] All 31 API route groups return correct responses
- [ ] Authentication flow (register, login, OAuth, refresh token)
- [ ] JWT protect middleware works with Prisma User queries
- [ ] Roadmap enrollment, progress tracking, completion
- [ ] Topic sessions (start, pause, resume, end, complete)
- [ ] AI chat sessions (create, add messages, retrieve history)
- [ ] Test generation and evaluation
- [ ] Career analysis (LeetCode, GitHub, resume)
- [ ] Study plan generation and updates
- [ ] Community posts, comments, voting
- [ ] Job posting, application, skill matching
- [ ] Mentoring session booking
- [ ] Gamification (XP, badges, leaderboard, challenges)
- [ ] Admin CRUD operations
- [ ] Socket.io real-time features
- [ ] Scheduler cron jobs
- [ ] File uploads (AI Helper)
- [ ] Certificate generation

### 8.2 Testing Strategy

1. **Unit Tests:** Test each Prisma query in isolation
2. **Integration Tests:** Test full API request → response cycles
3. **Data Integrity:** Verify migrated data matches source MongoDB data
4. **Performance:** Compare query performance (MongoDB vs PostgreSQL)

---

## 9. Phase 7 — Deployment

### 9.1 Deployment Steps

1. **Set up Neon database** in production region
2. **Run Prisma migrations** against production Neon:
   ```bash
   DATABASE_URL="production-neon-url" npx prisma migrate deploy
   ```
3. **Run data migration script** to transfer data from MongoDB to Neon
4. **Update environment variables** in deployment platform:
   - Remove `MONGODB_URI`
   - Add `DATABASE_URL` and `DIRECT_URL`
5. **Deploy updated backend code**
6. **Verify** all endpoints work correctly
7. **Monitor** error rates and performance

### 9.2 Neon-Specific Configuration

```javascript
// Prisma connection with Neon connection pooling
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection (for queries)
  directUrl = env("DIRECT_URL")        // Direct connection (for migrations)
}
```

Neon provides:
- **Serverless autoscaling** — scales to zero when idle
- **Branching** — create database branches for testing
- **Point-in-time recovery** — restore to any point in the last 7 days

### 9.3 Vercel Deployment Notes

For Vercel serverless deployment, use Prisma with the Neon serverless driver:

```bash
npm install @neondatabase/serverless @prisma/adapter-neon
```

```javascript
// prisma client with Neon adapter (for serverless)
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

---

## 10. Rollback Plan

### If Migration Fails

1. **Keep MongoDB running** throughout migration — do NOT delete MongoDB data
2. **Feature flag:** Add `DB_PROVIDER=mongodb|postgresql` env var to switch between databases
3. **Dual-write (optional):** For critical period, write to both databases simultaneously
4. **Rollback procedure:**
   - Revert backend code to Mongoose version
   - Point `MONGODB_URI` back to MongoDB Atlas
   - Restart servers

### Data Safety

- Keep MongoDB Atlas cluster running for at least 30 days post-migration
- Export full MongoDB backup before starting: `mongodump --uri="$MONGODB_URI"`
- Verify record counts match between MongoDB and PostgreSQL

---

## 11. Schema Mapping Reference

### MongoDB Collection → PostgreSQL Table(s)

| MongoDB Collection | PostgreSQL Table(s) | Notes |
|---|---|---|
| `users` | `users`, `user_enrolled_roadmaps`, `user_completed_topics`, `user_language_learning`, `user_completed_language_topics`, `user_job_outcomes`, `user_badges` | Embedded arrays extracted to separate tables |
| `roles` | `roles`, `role_relations` | Self-referencing many-to-many for relatedRoles |
| `roadmaps` | `roadmaps`, `roadmap_reviews`, `roadmap_prerequisites` | Embedded reviews/prereqs extracted |
| `topics` | `topics` | Video links as Json |
| `testattempts` | `test_attempts` | Questions as Json |
| `aichatsessions` | `ai_chat_sessions`, `ai_chat_messages` | Messages extracted to separate table |
| `dailystudyplans` | `daily_study_plans`, `study_plan_topics`, `study_plan_language_topics` | Assigned topics extracted |
| `careeranalyses` | `career_analyses` | Stats as Json columns |
| `certificates` | `certificates` | 1:1 mapping |
| `programminglanguages` | `programming_languages` | Level arrays removed (topics have level field) |
| `languagetopics` | `language_topics` | 1:1 mapping |
| `companies` | `companies` | Location/contact flattened |
| `recruiters` | `recruiters` | Contact flattened |
| `jobpostings` | `job_postings` | Rounds/config as Json |
| `jobapplications` | `job_applications` | Timeline/analysis as Json |
| `connections` | `connections` | 1:1 mapping |
| `messages` | `messages` | 1:1 mapping |
| `studyrooms` | `study_rooms`, `study_room_members` | Members extracted |
| `communityposts` | `community_posts`, `community_comments`, `comment_upvotes`, `post_upvotes`, `post_downvotes` | All embedded arrays extracted |
| `mentorprofiles` | `mentor_profiles` | 1:1 mapping |
| `mentoringsessions` | `mentoring_sessions` | 1:1 mapping |
| `cohorts` | `cohorts`, `cohort_members` | Members extracted |
| `hackathons` | `hackathons`, `hackathon_participants`, `hackathon_submissions` | Embedded arrays extracted |
| `challenges` | `challenges`, `challenge_participants` | Active users extracted |
| `leaderboards` | `leaderboard` | Badges as Json |
| `leetcodesubmissions` | `leetcode_submissions` | 1:1 mapping |
| `skillbadges` | `skill_badges` | 1:1 mapping |
| `projectsubmissions` | `project_submissions` | 1:1 mapping |
| `peerreviews` | `peer_reviews` | 1:1 mapping |
| `timetrackingsessions` | `time_tracking_sessions` | Pauses as Json |
| `auditlogs` | `audit_logs` | 1:1 mapping |

---

## 12. Key Differences: Mongoose vs Prisma

| Feature | Mongoose | Prisma |
|---|---|---|
| Schema definition | JavaScript objects | `.prisma` schema file |
| Type safety | Runtime validation | Compile-time TypeScript types |
| Relations | `.populate()` | `include: {}` |
| Embedded documents | Native support | Separate tables or Json |
| Migrations | Manual or mongoose-migrate | `prisma migrate` |
| Query builder | Chainable methods | Object-based API |
| Raw queries | `Model.aggregate()` | `prisma.$queryRaw` |
| Middleware | pre/post hooks | Prisma middleware or `$extends` |
| Virtual fields | `schema.virtual()` | Computed in application code |
| Instance methods | `schema.methods` | Standalone utility functions |
| Static methods | `schema.statics` | Service functions |
| Seeding | Custom scripts | `prisma db seed` |
| GUI | MongoDB Compass | Prisma Studio |
| Transactions | `session.startTransaction()` | `prisma.$transaction()` |

---

## 13. Common Pitfalls

### 13.1 ObjectId → UUID

- MongoDB's `_id` is auto-generated as ObjectId
- Prisma uses `@default(uuid())` for UUIDs
- All foreign key references must use the new UUID format
- Migration script must maintain consistent ID mapping

### 13.2 `.select('-password')` Equivalent

Mongoose: `User.findById(id).select('-password')`

Prisma doesn't support field exclusion. Use explicit selection:
```javascript
const user = await prisma.user.findUnique({
  where: { id },
  omit: { password: true }  // Available in Prisma 5.16+
});
```

Or create a reusable select object:
```javascript
const userPublicSelect = {
  id: true, name: true, email: true, role: true,
  // ... all fields except password
};
```

### 13.3 Mongoose Middleware (pre/post hooks)

Mongoose `pre('save')` hooks (e.g., password hashing) must be moved to application code:

```javascript
// BEFORE (Mongoose pre-save hook)
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

// AFTER (Application code before Prisma create)
const hashedPassword = await bcrypt.hash(password, 12);
await prisma.user.create({ data: { ...userData, password: hashedPassword } });
```

### 13.4 Mongoose `.lean()` Equivalent

Mongoose `.lean()` returns plain objects. Prisma always returns plain objects — no equivalent needed.

### 13.5 Mixed/Schema.Types.Mixed → Json

MongoDB's `Mixed` type (accepts any structure) maps to Prisma's `Json` type. This preserves flexibility but loses type safety for those fields.

### 13.6 Array Operations

```javascript
// BEFORE (Mongoose push to array)
await User.findByIdAndUpdate(id, { $push: { 'gamification.badges': badgeData } });

// AFTER (Prisma — badges stored as Json on User)
// Option A: Update the Json array directly
const user = await prisma.user.findUnique({ where: { id } });
const badges = Array.isArray(user.gamificationBadgesInline) ? user.gamificationBadgesInline : [];
badges.push(badgeData);
await prisma.user.update({
  where: { id },
  data: { gamificationBadgesInline: badges },
});

// Option B: If using the UserBadge join table for formal badges
await prisma.userBadge.create({
  data: { userId: id, badgeId: badge.id, reason: 'Achievement unlocked' },
});
```

### 13.7 `$inc` Atomic Operations

```javascript
// BEFORE (Mongoose atomic increment)
await User.findByIdAndUpdate(id, { $inc: { 'gamification.xp': 100 } });

// AFTER (Prisma atomic increment)
await prisma.user.update({
  where: { id },
  data: { gamificationXp: { increment: 100 } },
});
```

### 13.8 Date Queries

```javascript
// BEFORE (Mongoose)
const plans = await DailyStudyPlan.find({
  date: { $gte: startOfDay, $lt: endOfDay }
});

// AFTER (Prisma)
const plans = await prisma.dailyStudyPlan.findMany({
  where: {
    date: { gte: startOfDay, lt: endOfDay }
  }
});
```

### 13.9 Text Search

MongoDB has `$text` search. PostgreSQL alternatives:
- `LIKE` / `ILIKE` queries via Prisma's `contains` (case-insensitive with mode)
- Full-text search via `@db.TsVector` and raw SQL
- External: Algolia, MeiliSearch, or Typesense

```javascript
// Prisma case-insensitive search
const roles = await prisma.role.findMany({
  where: {
    name: { contains: searchQuery, mode: 'insensitive' }
  }
});
```

---

## Summary

This migration involves:
- **47+ PostgreSQL tables** (from 32 MongoDB collections)
- **~40 backend files** to modify (routes, services, middleware, config)
- **0 frontend files** to modify
- **1 data migration script** to write and run
- **Estimated effort:** 3-5 days for an experienced developer

The Prisma schema in `prisma/schema.prisma` is ready to use. Follow the phases in order, test thoroughly, and keep MongoDB running as a fallback until the migration is verified.
