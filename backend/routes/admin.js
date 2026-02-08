/**
 * SkillForge AI - Admin Routes
 * Admin panel for managing roles, roadmaps, topics
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');
const Role = require('../models/Role');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const LanguageTopic = require('../models/LanguageTopic');
const SkillBadge = require('../models/SkillBadge');
const ProjectSubmission = require('../models/ProjectSubmission');
const PeerReview = require('../models/PeerReview');
const Cohort = require('../models/Cohort');
const MentorProfile = require('../models/MentorProfile');
const AuditLog = require('../models/AuditLog');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect, isAdmin } = require('../middleware/auth');
const { roleValidation, roadmapValidation, topicValidation } = require('../middleware/validation');

const logAdminAction = async (req, { action, entityType, entityId, metadata }) => {
  try {
    await AuditLog.create({
      actor: req.user?.id,
      action,
      entityType,
      entityId: entityId ? String(entityId) : '',
      metadata: metadata || {},
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
  } catch (error) {
    // Avoid breaking main request if logging fails
    console.error('AuditLog error:', error.message);
  }
};

// Configure multer for documentation uploads
const fs = require('fs');

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/docs/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

// Configure multer for language logos (use memory storage on Vercel)
const logoStorage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../../frontend/public/uploads/languages');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (err) {
        console.warn('Could not create logo upload directory:', err.message);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// =====================
// DASHBOARD
// =====================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard stats
 * @access  Private/Admin
 */
router.get('/dashboard', protect, isAdmin, asyncHandler(async (req, res) => {
  // Parse timeRange query parameter (7d, 30d, 90d)
  const { timeRange = '7d' } = req.query;
  const dayCount = timeRange === '90d' ? 90 : timeRange === '30d' ? 30 : 7;

  const [
    totalUsers,
    totalRoles,
    totalRoadmaps,
    totalTopics,
    activeUsers,
    newUsersToday
  ] = await Promise.all([
    User.countDocuments(),
    Role.countDocuments({ isActive: true }),
    Roadmap.countDocuments({ isActive: true }),
    Topic.countDocuments({ isActive: true }),
    User.countDocuments({ isActive: true }),
    User.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    })
  ]);

  // Get popular roadmaps
  const popularRoadmaps = await Roadmap.find({ isPublished: true })
    .sort({ 'stats.enrollmentCount': -1 })
    .limit(5)
    .select('title stats.enrollmentCount stats.completionCount');

  // Calculate start date based on timeRange
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (dayCount - 1));
  startDate.setHours(0, 0, 0, 0);

  // Get daily active users for the selected period
  const dailyActiveUsersPipeline = await User.aggregate([
    {
      $match: {
        $or: [
          { lastActive: { $gte: startDate } },
          { createdAt: { $gte: startDate } }
        ]
      }
    },
    {
      $project: {
        day: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$lastActive', '$createdAt'] }
          }
        }
      }
    },
    {
      $group: {
        _id: '$day',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Build arrays for all days in the range (fill missing days with 0)
  const dailyActiveUsers = [];
  const dayLabels = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const match = dailyActiveUsersPipeline.find(p => p._id === dateStr);
    dailyActiveUsers.push(match ? match.count : 0);

    // Use abbreviated format for longer ranges
    if (dayCount <= 7) {
      dayLabels.push(dayNames[d.getDay()]);
    } else if (dayCount <= 30) {
      dayLabels.push(`${monthNames[d.getMonth()]} ${d.getDate()}`);
    } else {
      // For 90 days, show weekly labels or every 7th day
      if (i % 7 === 0 || i === 0) {
        dayLabels.push(`${monthNames[d.getMonth()]} ${d.getDate()}`);
      } else {
        dayLabels.push('');
      }
    }
  }

  // Get daily new registrations for the selected period
  const dailyRegistrationsPipeline = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $project: {
        day: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$createdAt'
          }
        }
      }
    },
    {
      $group: {
        _id: '$day',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const dailyRegistrations = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const match = dailyRegistrationsPipeline.find(p => p._id === dateStr);
    dailyRegistrations.push(match ? match.count : 0);
  }

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalRoles,
        totalRoadmaps,
        totalTopics,
        activeUsers,
        newUsersToday
      },
      popularRoadmaps,
      dailyActiveUsers,
      dailyRegistrations,
      dayLabels
    }
  });
}));

// =====================
// ROLES MANAGEMENT
// =====================

/**
 * @route   GET /api/admin/roles
 * @desc    Get all roles (including inactive)
 * @access  Private/Admin
 */
router.get('/roles', protect, isAdmin, asyncHandler(async (req, res) => {
  const roles = await Role.find()
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: roles.length,
    data: roles
  });
}));

/**
 * @route   POST /api/admin/roles
 * @desc    Create new role
 * @access  Private/Admin
 */
router.post('/roles', protect, isAdmin, roleValidation, asyncHandler(async (req, res) => {
  const { name, description, category, icon, aliases, keywords, salaryRange, demandLevel } = req.body;

  const role = await Role.create({
    name,
    description,
    category,
    icon,
    aliases: aliases || [],
    keywords: keywords || [],
    salaryRange,
    demandLevel,
    createdBy: req.user.id
  });

  await logAdminAction(req, {
    action: 'CREATE',
    entityType: 'Role',
    entityId: role._id,
    metadata: { name: role.name, category: role.category }
  });

  res.status(201).json({
    success: true,
    message: 'Role created successfully',
    data: role
  });
}));

/**
 * @route   PUT /api/admin/roles/:id
 * @desc    Update role
 * @access  Private/Admin
 */
router.put('/roles/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const { name, description, category, icon, aliases, keywords, salaryRange, demandLevel, isActive } = req.body;

  const role = await Role.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      category,
      icon,
      aliases,
      keywords,
      salaryRange,
      demandLevel,
      isActive
    },
    { new: true, runValidators: true }
  );

  if (!role) {
    throw new ApiError('Role not found', 404);
  }

  await logAdminAction(req, {
    action: 'UPDATE',
    entityType: 'Role',
    entityId: role._id,
    metadata: { name: role.name }
  });

  res.status(200).json({
    success: true,
    message: 'Role updated successfully',
    data: role
  });
}));

/**
 * @route   DELETE /api/admin/roles/:id
 * @desc    Delete role (soft delete)
 * @access  Private/Admin
 */
router.delete('/roles/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!role) {
    throw new ApiError('Role not found', 404);
  }

  await logAdminAction(req, {
    action: 'DELETE',
    entityType: 'Role',
    entityId: role._id,
    metadata: { name: role.name }
  });

  res.status(200).json({
    success: true,
    message: 'Role deleted successfully'
  });
}));

// =====================
// ROADMAPS MANAGEMENT
// =====================

/**
 * @route   GET /api/admin/roadmaps
 * @desc    Get all roadmaps
 * @access  Private/Admin
 */
router.get('/roadmaps', protect, isAdmin, asyncHandler(async (req, res) => {
  const roadmaps = await Roadmap.find()
    .populate('role', 'name')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: roadmaps.length,
    data: roadmaps
  });
}));

/**
 * @route   POST /api/admin/roadmaps
 * @desc    Create new roadmap
 * @access  Private/Admin
 */
router.post('/roadmaps', protect, isAdmin, roadmapValidation, asyncHandler(async (req, res) => {
  const {
    title,
    description,
    role,
    skillLevel,
    thumbnail,
    estimatedDuration,
    testConfig,
    prerequisites,
    tags,
    isActive
  } = req.body;

  const roadmap = await Roadmap.create({
    title,
    description,
    role,
    skillLevel,
    thumbnail,
    estimatedDuration,
    testConfig,
    prerequisites,
    tags,
    isActive,
    createdBy: req.user.id
  });

  await logAdminAction(req, {
    action: 'CREATE',
    entityType: 'Roadmap',
    entityId: roadmap._id,
    metadata: { title: roadmap.title, skillLevel: roadmap.skillLevel }
  });

  res.status(201).json({
    success: true,
    message: 'Roadmap created successfully',
    data: roadmap
  });
}));

/**
 * @route   PUT /api/admin/roadmaps/:id
 * @desc    Update roadmap
 * @access  Private/Admin
 */
router.put('/roadmaps/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  await logAdminAction(req, {
    action: 'UPDATE',
    entityType: 'Roadmap',
    entityId: roadmap._id,
    metadata: { title: roadmap.title }
  });

  res.status(200).json({
    success: true,
    message: 'Roadmap updated successfully',
    data: roadmap
  });
}));

/**
 * @route   PUT /api/admin/roadmaps/:id/publish
 * @desc    Publish/unpublish roadmap
 * @access  Private/Admin
 */
router.put('/roadmaps/:id/publish', protect, isAdmin, asyncHandler(async (req, res) => {
  const { publish } = req.body;

  const roadmap = await Roadmap.findById(req.params.id);

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  roadmap.isPublished = publish;
  if (publish && !roadmap.publishedAt) {
    roadmap.publishedAt = new Date();
  }
  if (publish) {
    roadmap.isActive = true;
  }

  await roadmap.save();

  const populatedRoadmap = await Roadmap.findById(roadmap._id)
    .populate('role', 'name')
    .populate('createdBy', 'name');

  await logAdminAction(req, {
    action: publish ? 'PUBLISH' : 'UNPUBLISH',
    entityType: 'Roadmap',
    entityId: roadmap._id,
    metadata: { title: roadmap.title, isPublished: publish }
  });

  res.status(200).json({
    success: true,
    message: publish ? 'Roadmap published' : 'Roadmap unpublished',
    data: populatedRoadmap
  });
}));

/**
 * @route   PUT /api/admin/roadmaps/:id/topics/reorder
 * @desc    Reorder topics in roadmap
 * @access  Private/Admin
 */
router.put('/roadmaps/:id/topics/reorder', protect, isAdmin, asyncHandler(async (req, res) => {
  const { topicIds } = req.body; // Array of topic IDs in new order

  const roadmap = await Roadmap.findById(req.params.id);

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  roadmap.topics = topicIds;
  await roadmap.save();

  // Update order field in topics
  for (let i = 0; i < topicIds.length; i++) {
    await Topic.findByIdAndUpdate(topicIds[i], { order: i });
  }

  res.status(200).json({
    success: true,
    message: 'Topics reordered successfully'
  });
}));

/**
 * @route   DELETE /api/admin/roadmaps/:id
 * @desc    Delete roadmap
 * @access  Private/Admin
 */
router.delete('/roadmaps/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const roadmap = await Roadmap.findById(req.params.id);

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  await User.updateMany(
    { 'enrolledRoadmaps.roadmap': roadmap._id },
    { $pull: { enrolledRoadmaps: { roadmap: roadmap._id } } }
  );

  await Roadmap.updateMany(
    { prerequisites: roadmap._id },
    { $pull: { prerequisites: roadmap._id } }
  );

  await Topic.deleteMany({ roadmap: roadmap._id });
  await Roadmap.deleteOne({ _id: roadmap._id });

  await logAdminAction(req, {
    action: 'DELETE',
    entityType: 'Roadmap',
    entityId: roadmap._id,
    metadata: { title: roadmap.title, deletedTopics: roadmap.topics?.length || 0 }
  });

  res.status(200).json({
    success: true,
    message: 'Roadmap deleted successfully'
  });
}));

/**
 * @route   POST /api/admin/roadmaps/:id/generate-topics
 * @desc    Auto-generate multiple topics for a roadmap based on its title and skill level
 * @access  Private/Admin
 */
const youtubeService = require('../services/youtubeService');
const aiService = require('../services/aiService');

router.post('/roadmaps/:id/generate-topics', protect, isAdmin, asyncHandler(async (req, res) => {
  const { topicCount = 5, language = 'english' } = req.body;

  const roadmap = await Roadmap.findById(req.params.id).populate('role', 'name');

  if (!roadmap) {
    throw new ApiError('Roadmap not found', 404);
  }

  // Validate topic count
  const count = Math.min(Math.max(parseInt(topicCount) || 5, 1), 20);
  const skillLevel = roadmap.skillLevel || 'beginner';
  const roleName = roadmap.role?.name || '';
  const roadmapTitle = roadmap.title;

  // Generate topic titles using AI
  let topicTitles = [];
  try {
    const prompt = `Generate exactly ${count} unique topic titles for a ${skillLevel} level learning roadmap.

Roadmap: "${roadmapTitle}"
${roleName ? `Career Role: ${roleName}` : ''}
Skill Level: ${skillLevel}

Requirements:
- Each topic should be specific and actionable
- Topics should progress logically from basics to more advanced
- Topics should be appropriate for ${skillLevel} learners
- Each topic title should be 3-8 words

Respond with ONLY a JSON array of strings like: ["Topic 1", "Topic 2", "Topic 3"]
No explanations, just the JSON array.`;

    const response = await aiService.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { type: 'topic_generation' }
    });

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      topicTitles = JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.log('AI topic generation unavailable, using fallback');
  }

  // Fallback: Generate basic topic titles
  if (!topicTitles.length || topicTitles.length < count) {
    const fallbackPrefixes = {
      beginner: ['Introduction to', 'Getting Started with', 'Understanding', 'Basics of', 'Fundamentals of'],
      intermediate: ['Working with', 'Building with', 'Practical', 'Implementing', 'Deep Dive into'],
      advanced: ['Advanced', 'Mastering', 'Optimizing', 'Architecture of', 'Best Practices for']
    };

    const prefixes = fallbackPrefixes[skillLevel] || fallbackPrefixes.beginner;
    const baseTitle = roadmapTitle.replace(/ Roadmap| Path| Course/gi, '').trim();

    for (let i = topicTitles.length; i < count; i++) {
      const prefix = prefixes[i % prefixes.length];
      topicTitles.push(`${prefix} ${baseTitle} - Part ${i + 1}`);
    }
  }

  // Generate topics with videos
  const generatedTopics = [];
  const existingTopicCount = roadmap.topics?.length || 0;

  for (let i = 0; i < Math.min(topicTitles.length, count); i++) {
    const title = topicTitles[i];

    try {
      // Search for relevant video
      const videos = await youtubeService.searchWithRelevance(title, language, skillLevel, 80);
      const selectedVideo = videos[0] || null;

      // Generate content
      let content = {
        description: `Learn ${title} in this ${skillLevel} level tutorial.`,
        documentation: `# ${title}\n\nContent for this topic will cover the key concepts of ${title}.`,
        estimatedDuration: 30
      };

      if (selectedVideo) {
        try {
          content = await youtubeService.generateTopicContent(title, selectedVideo, skillLevel);
        } catch (e) {
          // Use default content
        }
      }

      generatedTopics.push({
        title,
        description: content.description,
        roadmap: roadmap._id,
        order: existingTopicCount + i,
        videoLinks: {
          [language]: selectedVideo ? {
            url: selectedVideo.url,
            videoId: selectedVideo.videoId,
            title: selectedVideo.title
          } : undefined
        },
        documentation: {
          title,
          content: content.documentation
        },
        estimatedDuration: selectedVideo?.duration || content.estimatedDuration || 30,
        isActive: true,
        createdBy: req.user.id
      });
    } catch (error) {
      console.error(`Failed to generate topic "${title}":`, error.message);
      // Still create the topic without video
      generatedTopics.push({
        title,
        description: `Learn ${title} in this ${skillLevel} level tutorial.`,
        roadmap: roadmap._id,
        order: existingTopicCount + i,
        videoLinks: {},
        documentation: {
          title,
          content: `# ${title}\n\nContent coming soon.`
        },
        estimatedDuration: 30,
        isActive: true,
        createdBy: req.user.id
      });
    }
  }

  // Save all topics
  const createdTopics = await Topic.insertMany(generatedTopics);

  // Update roadmap with new topics
  roadmap.topics = [...(roadmap.topics || []), ...createdTopics.map(t => t._id)];
  await roadmap.calculateDuration();
  await roadmap.save();

  res.status(201).json({
    success: true,
    message: `Generated ${createdTopics.length} topics successfully`,
    data: {
      topics: createdTopics,
      roadmap: {
        _id: roadmap._id,
        title: roadmap.title,
        totalTopics: roadmap.topics.length
      }
    }
  });
}));

// =====================
// TOPICS MANAGEMENT
// =====================

/**
 * @route   GET /api/admin/topics
 * @desc    Get all topics
 * @access  Private/Admin
 */
router.get('/topics', protect, isAdmin, asyncHandler(async (req, res) => {
  const { roadmapId } = req.query;

  const query = {};

  if (roadmapId) {
    const roadmap = await Roadmap.findById(roadmapId);
    if (roadmap) {
      query._id = { $in: roadmap.topics };
    }
  }

  const topics = await Topic.find(query)
    .sort({ order: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: topics.length,
    data: topics
  });
}));

/**
 * @route   POST /api/admin/topics/generate-videos
 * @desc    Search YouTube for relevant videos based on topic title and skill level
 * @access  Private/Admin
 */
router.post('/topics/generate-videos', protect, isAdmin, asyncHandler(async (req, res) => {
  const {
    title,
    language = 'english',
    skillLevel = 'beginner',
    minRelevance = 90,
    generateContent = false,
    roadmapId
  } = req.body;

  if (!title || title.length < 3) {
    throw new ApiError('Topic title must be at least 3 characters', 400);
  }

  // Get skill level from roadmap if roadmapId provided
  let effectiveSkillLevel = skillLevel;
  if (roadmapId) {
    const roadmap = await Roadmap.findById(roadmapId);
    if (roadmap && roadmap.skillLevel) {
      effectiveSkillLevel = roadmap.skillLevel;
    }
  }

  try {
    // Search for videos with relevance scoring and skill level filtering
    const videos = await youtubeService.searchWithRelevance(
      title,
      language,
      effectiveSkillLevel,
      minRelevance
    );

    // Optionally generate topic content from top video
    let generatedContent = null;
    if (generateContent && videos.length > 0) {
      generatedContent = await youtubeService.generateTopicContent(title, videos[0], effectiveSkillLevel);
    }

    res.status(200).json({
      success: true,
      data: {
        videos,
        generatedContent,
        searchQuery: title,
        language,
        skillLevel: effectiveSkillLevel,
        minRelevance,
        totalFound: videos.length
      }
    });
  } catch (error) {
    console.error('Video generation error:', error.message);
    throw new ApiError(error.message || 'Failed to search videos', 500);
  }
}));

/**
 * @route   POST /api/admin/topics
 * @desc    Create new topic
 * @access  Private/Admin
 */
router.post('/topics', protect, isAdmin, upload.single('docFile'), asyncHandler(async (req, res) => {
  const {
    title,
    description,
    roadmapId,
    videoEnglish,
    videoTamil,
    videoHindi,
    documentationTitle,
    documentationContent,
    documentationSourceUrl,
    estimatedDuration,
    objectives,
    keyConcepts,
    difficulty,
    isActive
  } = req.body;

  const topic = await Topic.create({
    title,
    description,
    roadmap: roadmapId,
    videoLinks: {
      english: videoEnglish ? { url: videoEnglish } : undefined,
      tamil: videoTamil ? { url: videoTamil } : undefined,
      hindi: videoHindi ? { url: videoHindi } : undefined
    },
    documentation: {
      title: documentationTitle,
      content: documentationContent,
      fileUrl: req.file ? req.file.path : undefined,
      sourceUrl: documentationSourceUrl
    },
    estimatedDuration: parseInt(estimatedDuration),
    objectives: objectives ? JSON.parse(objectives) : [],
    keyConcepts: keyConcepts ? JSON.parse(keyConcepts) : [],
    difficulty,
    isActive: isActive !== undefined ? isActive === 'true' : true,
    createdBy: req.user.id
  });

  // Handle manual ordering
  const requestedOrder = parseInt(req.body.order);
  let finalOrder = parseInt(estimatedDuration); // Wait, this variable name is likely wrong in my context, looks like I copied from somewhere else or just a mistake.
  // Actually, I should use `requestedOrder` or default to end.

  // Correct logic:
  let newOrder = 0;

  if (roadmapId) {
    const roadmap = await Roadmap.findById(roadmapId);
    if (roadmap) {
      const topicCount = roadmap.topics.length;

      if (!isNaN(requestedOrder) && requestedOrder >= 0 && requestedOrder < topicCount) {
        // User requested specific valid index: shift others down
        await Topic.updateMany(
          { roadmap: roadmapId, order: { $gte: requestedOrder } },
          { $inc: { order: 1 } }
        );
        newOrder = requestedOrder;
      } else {
        // Default to end
        newOrder = topicCount;
      }

      topic.order = newOrder;
      await topic.save();

      roadmap.topics.push(topic._id);
      await roadmap.calculateDuration();
      await roadmap.save();
    }
  }

  await logAdminAction(req, {
    action: 'CREATE',
    entityType: 'Topic',
    entityId: topic._id,
    metadata: { title: topic.title, roadmapId: roadmapId || null }
  });

  res.status(201).json({
    success: true,
    message: 'Topic created successfully',
    data: topic
  });
}));

/**
 * @route   PUT /api/admin/topics/:id
 * @desc    Update topic
 * @access  Private/Admin
 */
router.put('/topics/:id', protect, isAdmin, upload.single('docFile'), asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  // Update fields
  const updateFields = ['title', 'description', 'estimatedDuration', 'difficulty', 'order'];
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      topic[field] = req.body[field];
    }
  });

  if (req.body.isActive !== undefined) {
    topic.isActive = req.body.isActive === 'true';
  }

  // Update video links
  if (req.body.videoEnglish !== undefined) {
    topic.videoLinks.english = { url: req.body.videoEnglish };
  }
  if (req.body.videoTamil !== undefined) {
    topic.videoLinks.tamil = { url: req.body.videoTamil };
  }
  if (req.body.videoHindi !== undefined) {
    topic.videoLinks.hindi = { url: req.body.videoHindi };
  }

  // Update documentation
  if (req.body.documentationContent) {
    topic.documentation.content = req.body.documentationContent;
  }
  if (req.body.documentationTitle) {
    topic.documentation.title = req.body.documentationTitle;
  }
  if (req.file) {
    topic.documentation.fileUrl = req.file.path;
  }

  // Update arrays
  if (req.body.objectives) {
    topic.objectives = JSON.parse(req.body.objectives);
  }
  if (req.body.keyConcepts) {
    topic.keyConcepts = JSON.parse(req.body.keyConcepts);
  }

  // Handle roadmap change and/or order update
  const targetRoadmapId = req.body.roadmapId || topic.roadmap;
  const targetOrder = req.body.order !== undefined ? parseInt(req.body.order) : undefined;
  const isRoadmapChanging = req.body.roadmapId && String(topic.roadmap) !== String(req.body.roadmapId);

  if (isRoadmapChanging) {
    const previousRoadmap = await Roadmap.findById(topic.roadmap);
    const nextRoadmap = await Roadmap.findById(targetRoadmapId);

    // Remove from previous roadmap
    if (previousRoadmap) {
      previousRoadmap.topics = previousRoadmap.topics.filter(
        (topicId) => String(topicId) !== String(topic._id)
      );
      await previousRoadmap.calculateDuration();
      await previousRoadmap.save();
    }

    // Add to next roadmap
    if (nextRoadmap) {
      if (!nextRoadmap.topics.find((topicId) => String(topicId) === String(topic._id))) {
        nextRoadmap.topics.push(topic._id);
      }

      // Handle ordering in new roadmap
      if (targetOrder !== undefined && !isNaN(targetOrder)) {
        // Shift existing topics in new roadmap
        await Topic.updateMany(
          { roadmap: nextRoadmap._id, order: { $gte: targetOrder } },
          { $inc: { order: 1 } }
        );
        topic.order = targetOrder;
      } else {
        // Default to end
        topic.order = nextRoadmap.topics.length - 1;
      }

      topic.roadmap = nextRoadmap._id;
      await nextRoadmap.calculateDuration();
      await nextRoadmap.save();
    }
  } else {
    // Same roadmap, just reordering
    if (targetOrder !== undefined && !isNaN(targetOrder) && targetOrder !== topic.order) {
      await Topic.updateMany(
        {
          roadmap: topic.roadmap,
          order: { $gte: targetOrder },
          _id: { $ne: topic._id }
        },
        { $inc: { order: 1 } }
      );
      topic.order = targetOrder;
    }
  }

  await topic.save();

  await logAdminAction(req, {
    action: 'UPDATE',
    entityType: 'Topic',
    entityId: topic._id,
    metadata: { title: topic.title }
  });

  res.status(200).json({
    success: true,
    message: 'Topic updated successfully',
    data: topic
  });
}));

/**
 * @route   DELETE /api/admin/topics/:id
 * @desc    Delete topic (hard delete)
 * @access  Private/Admin
 */
router.delete('/topics/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const topic = await Topic.findById(req.params.id);

  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  // Remove topic from parent roadmap
  if (topic.roadmap) {
    await Roadmap.findByIdAndUpdate(
      topic.roadmap,
      { $pull: { topics: topic._id } }
    );
  }

  const topicTitle = topic.title;
  const topicId = topic._id;

  // Hard delete the topic
  await Topic.deleteOne({ _id: topic._id });

  await logAdminAction(req, {
    action: 'DELETE',
    entityType: 'Topic',
    entityId: topicId,
    metadata: { title: topicTitle }
  });

  res.status(200).json({
    success: true,
    message: 'Topic deleted successfully'
  });
}));


// =====================
// USERS MANAGEMENT
// =====================

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/users', protect, isAdmin, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, role, status } = req.query;

  const query = {};

  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }

  if (role) {
    query.role = role;
  } else {
    // Default to showing only students if no role specified
    // This excludes company_admin, recruiter, and system admin from the default list
    query.role = 'student';
  }

  if (status === 'active') {
    query.isActive = true;
  }
  if (status === 'inactive') {
    query.isActive = false;
  }

  const users = await User.find(query)
    .select('-password')
    .populate('preferences.targetRole', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role
 * @access  Private/Admin
 */
router.put('/users/:id/role', protect, isAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['student', 'admin'].includes(role)) {
    throw new ApiError('Invalid role', 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'User role updated',
    data: user
  });
}));

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Activate/deactivate user
 * @access  Private/Admin
 */
router.put('/users/:id/status', protect, isAdmin, asyncHandler(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  ).select('-password');

  if (!user) {
    throw new ApiError('User not found', 404);
  }

  res.status(200).json({
    success: true,
    message: isActive ? 'User activated' : 'User deactivated',
    data: user
  });
}));

// =====================
// SETTINGS
// =====================

/**
 * @route   PUT /api/admin/settings/test-config
 * @desc    Update global test configuration
 * @access  Private/Admin
 */
router.put('/settings/test-config', protect, isAdmin, asyncHandler(async (req, res) => {
  const { passingPercentage, questionsPerTest, timePerQuestion } = req.body;

  // Update all roadmaps with new defaults
  await Roadmap.updateMany(
    {},
    {
      $set: {
        'testConfig.passingPercentage': passingPercentage,
        'testConfig.questionsPerTest': questionsPerTest,
        'testConfig.timePerQuestion': timePerQuestion
      }
    }
  );

  res.status(200).json({
    success: true,
    message: 'Test configuration updated globally'
  });
}));

// =====================
// LANGUAGES MANAGEMENT
// =====================

/**
 * @route   GET /api/admin/languages
 * @desc    Get all programming languages (including inactive)
 * @access  Private/Admin
 */
router.get('/languages', protect, isAdmin, asyncHandler(async (req, res) => {
  const [languages, topicsByLanguage] = await Promise.all([
    ProgrammingLanguage.find()
      .populate('levels.beginner', 'title')
      .populate('levels.intermediate', 'title')
      .populate('levels.advanced', 'title')
      .sort({ createdAt: -1 }),
    LanguageTopic.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ])
  ]);

  const topicsCountMap = topicsByLanguage.reduce((acc, item) => {
    acc[item._id.toString()] = item.count;
    return acc;
  }, {});

  const languagesWithCounts = languages.map((language) => {
    const langObject = language.toObject();
    return {
      ...langObject,
      topicsCount: topicsCountMap[language._id.toString()] || 0
    };
  });

  res.status(200).json({
    success: true,
    count: languagesWithCounts.length,
    data: languagesWithCounts
  });
}));

/**
 * @route   GET /api/admin/languages/:id
 * @desc    Get single language with all details
 * @access  Private/Admin
 */
router.get('/languages/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const language = await ProgrammingLanguage.findById(req.params.id)
    .populate('levels.beginner')
    .populate('levels.intermediate')
    .populate('levels.advanced')
    .populate('relatedLanguages', 'name slug icon');

  if (!language) {
    throw new ApiError('Language not found', 404);
  }

  res.status(200).json({
    success: true,
    data: language
  });
}));

/**
 * @route   POST /api/admin/languages
 * @desc    Create new programming language
 * @access  Private/Admin
 */
router.post('/languages', protect, isAdmin, logoUpload.single('logo'), asyncHandler(async (req, res) => {
  const { name, description, icon, color, useCases, relatedLanguages } = req.body;

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const language = await ProgrammingLanguage.create({
    name,
    slug,
    description,
    icon: icon || '',
    logo: req.file ? `/uploads/languages/${req.file.filename}` : '',
    color: color || '#3B82F6',
    useCases: useCases || [],
    relatedLanguages: relatedLanguages || [],
    isActive: true
  });

  res.status(201).json({
    success: true,
    message: 'Language created successfully',
    data: language
  });
}));

/**
 * @route   PUT /api/admin/languages/:id
 * @desc    Update programming language
 * @access  Private/Admin
 */
router.put('/languages/:id', protect, isAdmin, logoUpload.single('logo'), asyncHandler(async (req, res) => {
  const { name, description, icon, color, useCases, relatedLanguages, isActive } = req.body;

  let language = await ProgrammingLanguage.findById(req.params.id);
  if (!language) {
    throw new ApiError('Language not found', 404);
  }

  // Update slug if name changed
  const slug = name ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : language.slug;

  const updateData = {
    name,
    slug,
    description,
    icon,
    color,
    useCases,
    relatedLanguages,
    isActive
  };

  // Add logo if uploaded
  if (req.file) {
    updateData.logo = `/uploads/languages/${req.file.filename}`;
  }

  language = await ProgrammingLanguage.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Language updated successfully',
    data: language
  });
}));

/**
 * @route   DELETE /api/admin/languages/:id
 * @desc    Delete programming language and all its topics (cascade delete)
 * @access  Private/Admin
 */
router.delete('/languages/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const language = await ProgrammingLanguage.findById(req.params.id);

  if (!language) {
    throw new ApiError('Language not found', 404);
  }

  // Delete all associated topics first (cascade delete)
  const deletedTopics = await LanguageTopic.deleteMany({ language: req.params.id });

  // Delete the language
  await language.deleteOne();

  res.status(200).json({
    success: true,
    message: `Language and ${deletedTopics.deletedCount} associated topic(s) deleted successfully`
  });
}));

/**
 * @route   GET /api/admin/languages/:id/topics
 * @desc    Get all topics for a language (for management)
 * @access  Private/Admin
 */
router.get('/languages/:id/topics', protect, isAdmin, asyncHandler(async (req, res) => {
  const topics = await LanguageTopic.find({ language: req.params.id })
    .populate('language', 'name')
    .sort({ level: 1, order: 1 });

  res.status(200).json({
    success: true,
    count: topics.length,
    data: topics
  });
}));

/**
 * @route   POST /api/admin/languages/:id/topics
 * @desc    Create topic for a language
 * @access  Private/Admin
 */
router.post('/languages/:id/topics', protect, isAdmin, asyncHandler(async (req, res) => {
  const { title, description, level, order, keyConcepts, videoLinks, estimatedDuration, content } = req.body;

  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const normalizedVideoLinks = videoLinks
    ? ['english', 'tamil', 'hindi'].reduce((acc, lang) => {
      const link = videoLinks?.[lang];
      const url = typeof link === 'string' ? link : link?.url;
      if (url) {
        acc[lang] = { url, videoId: extractVideoId(url) };
      }
      return acc;
    }, {})
    : undefined;

  const language = await ProgrammingLanguage.findById(req.params.id);
  if (!language) {
    throw new ApiError('Language not found', 404);
  }

  // Handle auto-reordering
  let finalOrder = 0;
  if (order !== undefined && order !== null) {
    const requestedOrder = parseInt(order);
    // Shift existing topics down
    await LanguageTopic.updateMany(
      { language: req.params.id, level: level || 'beginner', order: { $gte: requestedOrder } },
      { $inc: { order: 1 } }
    );
    finalOrder = requestedOrder;
  } else {
    // Append to the end
    const lastTopic = await LanguageTopic.findOne({ language: req.params.id, level: level || 'beginner' })
      .sort({ order: -1 });
    finalOrder = lastTopic ? lastTopic.order + 1 : 0;
  }

  // Generate slug from title
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const topic = await LanguageTopic.create({
    title,
    slug,
    description,
    language: req.params.id,
    level: level || 'beginner',
    order: finalOrder,
    keyConcepts: keyConcepts || [],
    videoLinks: normalizedVideoLinks,
    estimatedDuration: estimatedDuration || 0,
    content: content || {},
    isActive: true
  });

  // Add topic to language's level array
  if (level === 'beginner') {
    language.levels.beginner.push(topic._id);
  } else if (level === 'intermediate') {
    language.levels.intermediate.push(topic._id);
  } else if (level === 'advanced') {
    language.levels.advanced.push(topic._id);
  }

  await language.save();

  res.status(201).json({
    success: true,
    message: 'Topic created successfully',
    data: topic
  });
}));

/**
 * @route   PUT /api/admin/language-topics/:topicId
 * @desc    Update language topic
 * @access  Private/Admin
 */
router.put('/language-topics/:topicId', protect, isAdmin, asyncHandler(async (req, res) => {
  const { title, description, level, order, keyConcepts, videoLinks, estimatedDuration, content, isActive } = req.body;

  const extractVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const normalizedVideoLinks = ['english', 'tamil', 'hindi'].reduce((acc, lang) => {
    const link = videoLinks?.[lang];
    const url = typeof link === 'string' ? link : link?.url;
    if (url) {
      acc[lang] = { url, videoId: extractVideoId(url) };
    }
    return acc;
  }, {});

  let topic = await LanguageTopic.findById(req.params.topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const oldLevel = topic.level;
  const slug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : topic.slug;

  // Handle reordering if order changed
  if (order !== undefined && order !== null && (!topic.order || parseInt(order) !== topic.order)) {
    const requestedOrder = parseInt(order);
    const targetLevel = level || topic.level;

    // Shift existing topics down at the destination
    await LanguageTopic.updateMany(
      {
        language: topic.language,
        level: targetLevel,
        order: { $gte: requestedOrder },
        _id: { $ne: topic._id }
      },
      { $inc: { order: 1 } }
    );
  }

  const updatePayload = {
    title,
    slug,
    description,
    level,
    order,
    keyConcepts,
    estimatedDuration,
    content,
    isActive
  };

  if (normalizedVideoLinks !== undefined) {
    updatePayload.videoLinks = normalizedVideoLinks;
  }

  topic = await LanguageTopic.findByIdAndUpdate(
    req.params.topicId,
    updatePayload,
    { new: true, runValidators: true }
  );

  // If level changed, update language's level arrays
  if (level && level !== oldLevel) {
    const language = await ProgrammingLanguage.findById(topic.language);
    if (language) {
      // Remove from old level
      if (oldLevel === 'beginner') {
        language.levels.beginner = language.levels.beginner.filter(id => id.toString() !== topic._id.toString());
      } else if (oldLevel === 'intermediate') {
        language.levels.intermediate = language.levels.intermediate.filter(id => id.toString() !== topic._id.toString());
      } else if (oldLevel === 'advanced') {
        language.levels.advanced = language.levels.advanced.filter(id => id.toString() !== topic._id.toString());
      }

      // Add to new level
      if (level === 'beginner') {
        language.levels.beginner.push(topic._id);
      } else if (level === 'intermediate') {
        language.levels.intermediate.push(topic._id);
      } else if (level === 'advanced') {
        language.levels.advanced.push(topic._id);
      }

      await language.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Topic updated successfully',
    data: topic
  });
}));

/**
 * @route   DELETE /api/admin/language-topics/:topicId
 * @desc    Delete language topic
 * @access  Private/Admin
 */
router.delete('/language-topics/:topicId', protect, isAdmin, asyncHandler(async (req, res) => {
  const topic = await LanguageTopic.findById(req.params.topicId);

  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  // Remove topic from language's level array
  const language = await ProgrammingLanguage.findById(topic.language);
  if (language) {
    if (topic.level === 'beginner') {
      language.levels.beginner = language.levels.beginner.filter(id => id.toString() !== topic._id.toString());
    } else if (topic.level === 'intermediate') {
      language.levels.intermediate = language.levels.intermediate.filter(id => id.toString() !== topic._id.toString());
    } else if (topic.level === 'advanced') {
      language.levels.advanced = language.levels.advanced.filter(id => id.toString() !== topic._id.toString());
    }
    await language.save();
  }

  await topic.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Topic deleted successfully'
  });
}));

// =====================
// ASSESSMENTS & COLLABORATION
// =====================

/**
 * @route   GET /api/admin/badges
 * @desc    Get all skill badges
 * @access  Private/Admin
 */
router.get('/badges', protect, isAdmin, asyncHandler(async (req, res) => {
  const badges = await SkillBadge.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: badges });
}));

/**
 * @route   POST /api/admin/badges
 * @desc    Create a skill badge
 * @access  Private/Admin
 */
router.post('/badges', protect, isAdmin, asyncHandler(async (req, res) => {
  const { name, description, icon, criteria, isActive } = req.body;
  const badge = await SkillBadge.create({ name, description, icon, criteria, isActive });
  await logAdminAction(req, { action: 'create', entityType: 'SkillBadge', entityId: badge._id });
  res.status(201).json({ success: true, data: badge });
}));

/**
 * @route   PUT /api/admin/badges/:id
 * @desc    Update a skill badge
 * @access  Private/Admin
 */
router.put('/badges/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const badge = await SkillBadge.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!badge) throw new ApiError('Badge not found', 404);
  await logAdminAction(req, { action: 'update', entityType: 'SkillBadge', entityId: badge._id });
  res.status(200).json({ success: true, data: badge });
}));

/**
 * @route   DELETE /api/admin/badges/:id
 * @desc    Delete a skill badge
 * @access  Private/Admin
 */
router.delete('/badges/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const badge = await SkillBadge.findById(req.params.id);
  if (!badge) throw new ApiError('Badge not found', 404);
  await badge.deleteOne();
  await logAdminAction(req, { action: 'delete', entityType: 'SkillBadge', entityId: badge._id });
  res.status(200).json({ success: true, message: 'Badge deleted' });
}));

/**
 * @route   GET /api/admin/assessments/submissions
 * @desc    List all project submissions
 * @access  Private/Admin
 */
router.get('/assessments/submissions', protect, isAdmin, asyncHandler(async (req, res) => {
  const submissions = await ProjectSubmission.find()
    .populate('user', 'name email')
    .populate('roadmap', 'title')
    .populate('awardedBadge', 'name icon')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: submissions });
}));

/**
 * @route   PUT /api/admin/assessments/submissions/:id/status
 * @desc    Update submission status and optionally award badge
 * @access  Private/Admin
 */
router.put('/assessments/submissions/:id/status', protect, isAdmin, asyncHandler(async (req, res) => {
  const { status, reviewerNotes, badgeId } = req.body;
  const submission = await ProjectSubmission.findById(req.params.id);
  if (!submission) throw new ApiError('Submission not found', 404);

  submission.status = status || submission.status;
  submission.reviewerNotes = reviewerNotes || submission.reviewerNotes;
  submission.reviewedBy = req.user.id;
  submission.reviewedAt = new Date();

  if (badgeId) {
    submission.awardedBadge = badgeId;

    const user = await User.findById(submission.user);
    const alreadyAwarded = user.badges.find(b => b.badge?.toString() === badgeId);
    if (!alreadyAwarded) {
      user.badges.push({ badge: badgeId, reason: 'Project assessment approved' });
      await user.save();
    }
  }

  await submission.save();

  await logAdminAction(req, {
    action: 'update',
    entityType: 'ProjectSubmission',
    entityId: submission._id,
    metadata: { status: submission.status, badgeId: badgeId || undefined }
  });

  res.status(200).json({ success: true, data: submission });
}));

/**
 * @route   GET /api/admin/cohorts
 * @desc    List cohorts
 * @access  Private/Admin
 */
router.get('/cohorts', protect, isAdmin, asyncHandler(async (req, res) => {
  const cohorts = await Cohort.find()
    .populate('mentor', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: cohorts });
}));

/**
 * @route   POST /api/admin/cohorts
 * @desc    Create cohort
 * @access  Private/Admin
 */
router.post('/cohorts', protect, isAdmin, asyncHandler(async (req, res) => {
  const cohort = await Cohort.create(req.body);
  await logAdminAction(req, { action: 'create', entityType: 'Cohort', entityId: cohort._id });
  res.status(201).json({ success: true, data: cohort });
}));

/**
 * @route   PUT /api/admin/cohorts/:id
 * @desc    Update cohort
 * @access  Private/Admin
 */
router.put('/cohorts/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cohort) throw new ApiError('Cohort not found', 404);
  await logAdminAction(req, { action: 'update', entityType: 'Cohort', entityId: cohort._id });
  res.status(200).json({ success: true, data: cohort });
}));

/**
 * @route   DELETE /api/admin/cohorts/:id
 * @desc    Delete cohort
 * @access  Private/Admin
 */
router.delete('/cohorts/:id', protect, isAdmin, asyncHandler(async (req, res) => {
  const cohort = await Cohort.findById(req.params.id);
  if (!cohort) throw new ApiError('Cohort not found', 404);
  await cohort.deleteOne();
  await logAdminAction(req, { action: 'delete', entityType: 'Cohort', entityId: cohort._id });
  res.status(200).json({ success: true, message: 'Cohort deleted' });
}));

/**
 * @route   GET /api/admin/mentors
 * @desc    List mentor applications
 * @access  Private/Admin
 */
router.get('/mentors', protect, isAdmin, asyncHandler(async (req, res) => {
  const mentors = await MentorProfile.find()
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: mentors });
}));

/**
 * @route   GET /api/admin/outcomes/stats
 * @desc    Job outcomes summary
 * @access  Private/Admin
 */
router.get('/outcomes/stats', protect, isAdmin, asyncHandler(async (req, res) => {
  const users = await User.find().select('jobOutcomes');
  const all = users.flatMap(u => u.jobOutcomes || []);
  const stats = all.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      total: all.length,
      byStatus: stats
    }
  });
}));

/**
 * @route   PUT /api/admin/mentors/:id/status
 * @desc    Approve/reject mentor
 * @access  Private/Admin
 */
router.put('/mentors/:id/status', protect, isAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body;
  const profile = await MentorProfile.findById(req.params.id);
  if (!profile) throw new ApiError('Mentor profile not found', 404);

  profile.status = status || profile.status;
  if (status === 'approved') {
    profile.approvedAt = new Date();
  }
  await profile.save();

  await logAdminAction(req, {
    action: 'update',
    entityType: 'MentorProfile',
    entityId: profile._id,
    metadata: { status: profile.status }
  });

  res.status(200).json({ success: true, data: profile });
}));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    List recent audit logs
 * @access  Private/Admin
 */
router.get('/audit-logs', protect, isAdmin, asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const logs = await AuditLog.find()
    .populate('actor', 'name email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10));

  res.status(200).json({ success: true, data: logs });
}));

/**
 * @route   GET /api/admin/monitoring/summary
 * @desc    Monitoring summary
 * @access  Private/Admin
 */
router.get('/monitoring/summary', protect, isAdmin, asyncHandler(async (req, res) => {
  const [users, submissions, cohorts, mentors, badges] = await Promise.all([
    User.countDocuments(),
    ProjectSubmission.countDocuments(),
    Cohort.countDocuments(),
    MentorProfile.countDocuments(),
    SkillBadge.countDocuments()
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      submissions,
      cohorts,
      mentors,
      badges
    }
  });
}));

module.exports = router;
