/**
 * Generate roadmaps + topics using YouTube API
 * Usage: node scripts/generateRoadmaps.js --replace --maxRoadmaps=10 --topicsPerRoadmap=5 --limitRoles=10
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const axios = require('axios');

const Role = require('../models/Role');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const flags = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=');
      flags[key] = value ?? true;
    }
  }
  return flags;
};

const slugify = (value) => value.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const getApiKeys = () => {
  const keys = process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY || '';
  return keys.split(',').map(k => k.trim()).filter(Boolean);
};

const youtubeClient = (keys) => {
  let index = 0;

  const nextKey = () => {
    const key = keys[index % keys.length];
    index += 1;
    return key;
  };

  const search = async (query, maxResults = 5) => {
    if (!keys.length) {
      throw new Error('Missing YOUTUBE_API_KEY or YOUTUBE_API_KEYS');
    }

    const key = nextKey();
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        key,
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults
      },
      timeout: 10000
    });

    return response.data.items || [];
  };

  return { search };
};

const ROADMAP_TEMPLATES = [
  { suffix: 'Foundations', skillLevel: 'beginner' },
  { suffix: 'Core Skills', skillLevel: 'beginner' },
  { suffix: 'Intermediate Concepts', skillLevel: 'intermediate' },
  { suffix: 'Advanced Topics', skillLevel: 'advanced' },
  { suffix: 'Tools & Workflow', skillLevel: 'intermediate' },
  { suffix: 'System Design', skillLevel: 'advanced' },
  { suffix: 'Best Practices', skillLevel: 'intermediate' },
  { suffix: 'Projects & Portfolio', skillLevel: 'intermediate' },
  { suffix: 'Interview Preparation', skillLevel: 'advanced' },
  { suffix: 'Capstone', skillLevel: 'advanced' }
];

const createTopics = async ({ roadmap, roleName, topicsPerRoadmap, youtube }) => {
  const query = `${roleName} ${roadmap.title}`;
  const videos = await youtube.search(query, topicsPerRoadmap);

  const topics = videos.map((video, index) => {
    const title = video.snippet?.title || `Topic ${index + 1}`;
    const description = video.snippet?.description || `Learn ${title}`;
    const videoId = video.id?.videoId;
    const url = videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined;

    return {
      title,
      description,
      roadmap: roadmap._id,
      order: index + 1,
      videoLinks: {
        english: url ? { url, videoId, title } : undefined
      },
      documentation: {
        title,
        content: description || `# ${title}\n\nContent coming soon.`
      },
      estimatedDuration: 45,
      isActive: true
    };
  });

  if (!topics.length) {
    return [];
  }

  const created = await Topic.insertMany(topics);
  await Roadmap.findByIdAndUpdate(roadmap._id, {
    $set: {
      topics: created.map(t => t._id),
      estimatedDuration: created.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0)
    }
  });

  return created;
};

const main = async () => {
  const flags = parseArgs();
  const replace = Boolean(flags.replace);
  const maxRoadmaps = Number(flags.maxRoadmaps || process.env.MAX_ROADMAPS_PER_ROLE || 10);
  const topicsPerRoadmap = Number(flags.topicsPerRoadmap || process.env.TOPICS_PER_ROADMAP || 5);
  const limitRoles = Number(flags.limitRoles || process.env.LIMIT_ROLES || 0);
  const roleFilter = flags.roles ? flags.roles.split(',').map(r => r.trim().toLowerCase()) : null;

  const keys = getApiKeys();
  const youtube = youtubeClient(keys);

  await mongoose.connect(process.env.MONGODB_URI);

  let roles = await Role.find({ isActive: true }).sort({ name: 1 });
  if (roleFilter?.length) {
    roles = roles.filter(role => roleFilter.includes(role.slug));
  }
  if (limitRoles > 0) {
    roles = roles.slice(0, limitRoles);
  }

  for (const role of roles) {
    const templates = ROADMAP_TEMPLATES.slice(0, maxRoadmaps);

    if (replace) {
      const existing = await Roadmap.find({ role: role._id });
      const roadmapIds = existing.map(r => r._id);
      await Topic.deleteMany({ roadmap: { $in: roadmapIds } });
      await Roadmap.deleteMany({ role: role._id });
    }

    for (const template of templates) {
      const title = `${role.name} ${template.suffix}`;
      const slug = slugify(`${role.slug}-${template.suffix}`);

      const existing = await Roadmap.findOne({ slug });
      if (existing) {
        continue;
      }

      const roadmap = await Roadmap.create({
        title,
        slug,
        description: `Learning roadmap for ${role.name} - ${template.suffix}.`,
        role: role._id,
        skillLevel: template.skillLevel,
        estimatedDuration: 0,
        isActive: true
      });

      await createTopics({
        roadmap,
        roleName: role.name,
        topicsPerRoadmap,
        youtube
      });
    }
  }

  await mongoose.disconnect();
};

main().catch((error) => {
  console.error('Failed to generate roadmaps:', error.message);
  process.exit(1);
});
