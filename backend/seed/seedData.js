/**
 * SkillForge AI - Seed Data Script
 * Populates the database with initial roles, roadmaps, topics, and languages
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models
const User = require('../models/User');
const Role = require('../models/Role');
const Roadmap = require('../models/Roadmap');
const Topic = require('../models/Topic');
const ProgrammingLanguage = require('../models/ProgrammingLanguage');
const LanguageTopic = require('../models/LanguageTopic');

// Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillforge');
    console.log('📦 MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed Roles
const seedRoles = async () => {
  const slugify = (value) => value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const buildKeywords = (name, aliases = []) => {
    const tokens = [name, ...aliases]
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    return Array.from(new Set(tokens));
  };

  const roleGroups = [
    {
      category: 'development',
      label: 'Core Software & Engineering',
      roles: [
        { name: 'Software Developer / Software Engineer', aliases: ['Software Developer', 'Software Engineer'] },
        { name: 'Full Stack Developer', aliases: ['Full-Stack Developer', 'Fullstack Developer'] },
        { name: 'Frontend Developer', aliases: ['Front-End Developer', 'Front End Developer', 'UI Developer', 'Web Developer'] },
        { name: 'Backend Developer', aliases: ['Back-End Developer', 'Back End Developer', 'Server Developer', 'API Developer'] },
        { name: 'Mobile App Developer', aliases: ['Mobile Developer', 'App Developer', 'iOS Developer', 'Android Developer'] },
        { name: 'Game Developer' },
        { name: 'Embedded Systems Engineer' },
        { name: 'Systems Programmer' },
        { name: 'DevOps Engineer', aliases: ['Site Reliability Engineer', 'SRE', 'Platform Engineer'] },
        { name: 'Site Reliability Engineer (SRE)', aliases: ['Site Reliability Engineer', 'SRE'] },
        { name: 'QA Engineer', aliases: ['Test Automation Engineer', 'QA Engineer / Test Automation Engineer'] },
        { name: 'Build & Release Engineer', aliases: ['Build Engineer', 'Release Engineer'] }
      ]
    },
    {
      category: 'data',
      label: 'Data & Intelligence',
      roles: [
        { name: 'Data Scientist' },
        { name: 'Data Analyst' },
        { name: 'Business Intelligence Engineer' },
        { name: 'Machine Learning Engineer', aliases: ['ML Engineer'] },
        { name: 'Deep Learning Engineer' },
        { name: 'AI Researcher' },
        { name: 'NLP Engineer', aliases: ['Natural Language Processing Engineer'] },
        { name: 'Computer Vision Engineer' },
        { name: 'Big Data Engineer' },
        { name: 'Data Engineer' },
        { name: 'Database Administrator', aliases: ['DBA', 'Database Administrator (DBA)'] }
      ]
    },
    {
      category: 'security',
      label: 'Security & Networks',
      roles: [
        { name: 'Cybersecurity Analyst' },
        { name: 'Ethical Hacker', aliases: ['Penetration Tester', 'Ethical Hacker / Penetration Tester'] },
        { name: 'Security Engineer' },
        { name: 'Cryptography Engineer' },
        { name: 'Digital Forensics Analyst' },
        { name: 'SOC Analyst' },
        { name: 'Network Engineer' },
        { name: 'Cloud Security Engineer' }
      ]
    },
    {
      category: 'cloud',
      label: 'Cloud & Infrastructure',
      roles: [
        { name: 'Cloud Engineer' },
        { name: 'Cloud Architect' },
        { name: 'Solutions Architect' },
        { name: 'Infrastructure Engineer' },
        { name: 'Platform Engineer' },
        { name: 'Kubernetes Administrator' },
        { name: 'System Administrator' }
      ]
    },
    {
      category: 'development',
      label: 'Specialized Development',
      roles: [
        { name: 'Blockchain Developer' },
        { name: 'Smart Contract Engineer' },
        { name: 'AR/VR Developer', aliases: ['AR Developer', 'VR Developer'] },
        { name: 'IoT Developer', aliases: ['Internet of Things Developer'] },
        { name: 'Robotics Engineer' },
        { name: 'Automation Engineer' },
        { name: 'Low-Code / No-Code Developer', aliases: ['Low-Code Developer', 'No-Code Developer'] }
      ]
    },
    {
      category: 'design',
      label: 'Design & Interaction',
      roles: [
        { name: 'UI Designer' },
        { name: 'UX Designer' },
        { name: 'Product Designer' },
        { name: 'Interaction Designer' },
        { name: 'HCI Researcher', aliases: ['Human-Computer Interaction (HCI) Researcher'] }
      ]
    },
    {
      category: 'management',
      label: 'Product & Management',
      roles: [
        { name: 'Product Manager' },
        { name: 'Technical Product Manager' },
        { name: 'Project Manager' },
        { name: 'Engineering Manager' },
        { name: 'CTO / Technical Lead', aliases: ['CTO', 'Technical Lead'] }
      ]
    },
    {
      category: 'other',
      label: 'Research & Academia',
      roles: [
        { name: 'Computer Science Researcher' },
        { name: 'Algorithm Engineer' },
        { name: 'Computational Scientist' },
        { name: 'Professor / Lecturer', aliases: ['Professor', 'Lecturer'] }
      ]
    },
    {
      category: 'other',
      label: 'Business & Support',
      roles: [
        { name: 'Technical Consultant' },
        { name: 'IT Support Engineer' },
        { name: 'Pre-Sales Engineer' },
        { name: 'Technical Writer' },
        { name: 'Developer Advocate' }
      ]
    },
    {
      category: 'other',
      label: 'Emerging & Future Roles',
      roles: [
        { name: 'Quantum Computing Engineer' },
        { name: 'Web3 Architect' },
        { name: 'AI Ethics Engineer' },
        { name: 'Prompt Engineer' },
        { name: 'Metaverse Developer' }
      ]
    }
  ];

  const roles = roleGroups.flatMap(group =>
    group.roles.map(role => ({
      name: role.name,
      slug: slugify(role.name),
      description: role.description || `Career role in ${group.label}.`,
      category: group.category,
      aliases: role.aliases || [],
      keywords: buildKeywords(role.name, role.aliases || []),
      isActive: true
    }))
  );

  const roleSlugs = roles.map((role) => role.slug);

  await Role.updateMany(
    { slug: { $nin: roleSlugs } },
    { $set: { isActive: false } }
  );

  await Role.bulkWrite(
    roles.map((role) => ({
      updateOne: {
        filter: { slug: role.slug },
        update: { $set: role },
        upsert: true
      }
    }))
  );

  const createdRoles = await Role.find({ slug: { $in: roleSlugs } });
  console.log(`✅ Created ${createdRoles.length} roles`);
  return createdRoles;
};

// Seed Roadmaps
const seedRoadmaps = async (roles) => {
  const frontendRole = roles.find(r => r.name === 'Frontend Developer');
  const backendRole = roles.find(r => r.name === 'Backend Developer');
  const fullstackRole = roles.find(r => r.name === 'Full Stack Developer');
  const devopsRole = roles.find(r => r.name === 'DevOps Engineer');
  const dataRole = roles.find(r => r.name === 'Data Scientist');
  const automationRole = roles.find(r => r.name === 'Automation Engineer');
  const tpmRole = roles.find(r => r.name === 'Technical Product Manager');

  const slugify = (value) => value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const roadmaps = [
    {
      title: 'Frontend Development Fundamentals',
      slug: slugify('Frontend Development Fundamentals'),
      description: 'Master the foundations of web development with HTML, CSS, and JavaScript',
      role: frontendRole._id,
      skillLevel: 'beginner',
      estimatedDuration: 80,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'React Developer Path',
      slug: slugify('React Developer Path'),
      description: 'Become proficient in React.js ecosystem including hooks, state management, and testing',
      role: frontendRole._id,
      skillLevel: 'intermediate',
      estimatedDuration: 120,
      prerequisites: [],
      testConfig: { passingPercentage: 75 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'Node.js Backend Development',
      slug: slugify('Node.js Backend Development'),
      description: 'Learn to build scalable backend services with Node.js and Express',
      role: backendRole._id,
      skillLevel: 'beginner',
      estimatedDuration: 80,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'MERN Stack Mastery',
      slug: slugify('MERN Stack Mastery'),
      description: 'Complete guide to building full-stack applications with MongoDB, Express, React, and Node.js',
      role: fullstackRole._id,
      skillLevel: 'intermediate',
      estimatedDuration: 160,
      prerequisites: [],
      testConfig: { passingPercentage: 75 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'DevOps Essentials',
      slug: slugify('DevOps Essentials'),
      description: 'Learn containerization, CI/CD pipelines, and cloud deployment strategies',
      role: devopsRole._id,
      skillLevel: 'intermediate',
      estimatedDuration: 120,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'Data Science with Python',
      slug: slugify('Data Science with Python'),
      description: 'From data analysis to machine learning with Python',
      role: dataRole._id,
      skillLevel: 'beginner',
      estimatedDuration: 160,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'Automation Engineer',
      slug: slugify('Automation Engineer'),
      description: 'Become an Automation Engineer by mastering programming, testing, CI/CD, and automation frameworks.',
      role: automationRole._id,
      skillLevel: 'beginner',
      estimatedDuration: 320,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    },
    {
      title: 'Technical Product Manager',
      slug: slugify('Technical Product Manager'),
      description: 'Become a Technical Product Manager by mastering product strategy, technical architecture, and leadership.',
      role: tpmRole._id,
      skillLevel: 'beginner',
      estimatedDuration: 280,
      prerequisites: [],
      testConfig: { passingPercentage: 70 },
      isPublished: true,
      isActive: true
    }
  ];

  const roadmapSlugs = roadmaps.map((roadmap) => roadmap.slug);

  await Roadmap.bulkWrite(
    roadmaps.map((roadmap) => ({
      updateOne: {
        filter: { slug: roadmap.slug },
        update: { $set: roadmap },
        upsert: true
      }
    }))
  );

  const createdRoadmaps = await Roadmap.find({ slug: { $in: roadmapSlugs } });
  console.log(`✅ Created ${createdRoadmaps.length} roadmaps`);
  return createdRoadmaps;
};

// Seed Topics
const seedTopics = async (roadmaps) => {
  const frontendBasics = roadmaps.find(r => r.title === 'Frontend Development Fundamentals')
    || roadmaps.find(r => r.slug === 'frontend-development-fundamentals');
  const reactPath = roadmaps.find(r => r.title === 'React Developer Path')
    || roadmaps.find(r => r.slug === 'react-developer-path');
  const nodePath = roadmaps.find(r => r.title === 'Node.js Backend Development')
    || roadmaps.find(r => r.slug === 'node-js-backend-development');

  if (!frontendBasics || !reactPath || !nodePath) {
    throw new Error('Required roadmaps not found for topic seeding');
  }

  const normalizeVideoLinks = (videoLinks = {}) => {
    const normalizeEntry = (entry) => {
      if (!entry) return undefined;
      if (typeof entry === 'string') {
        return { url: entry };
      }
      return entry;
    };

    return {
      english: normalizeEntry(videoLinks.english),
      tamil: normalizeEntry(videoLinks.tamil),
      hindi: normalizeEntry(videoLinks.hindi)
    };
  };

  const normalizeDocumentation = (documentation, title) => {
    if (documentation && typeof documentation === 'object') {
      return {
        title: documentation.title || title,
        content: documentation.content || documentation
      };
    }

    return {
      title,
      content: documentation || `# ${title}\n\nContent coming soon.`
    };
  };

  const topics = [
    // Frontend Fundamentals Topics
    {
      title: 'Introduction to HTML',
      description: 'Learn the structure and elements of HTML documents',
      roadmap: frontendBasics._id,
      order: 1,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=qz0aGYrrlhU',
        tamil: 'https://www.youtube.com/watch?v=dD2EISBDjWM',
        hindi: 'https://www.youtube.com/watch?v=BsDoLVMnmZs'
      },
      documentation: '# Introduction to HTML\n\nHTML (HyperText Markup Language) is the standard markup language for creating web pages.\n\n## Key Concepts\n\n- HTML Elements\n- Tags and Attributes\n- Document Structure\n- Semantic HTML\n\n## Basic Template\n\n```html\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>\n```',
      estimatedDuration: 45,
      isActive: true
    },
    {
      title: 'CSS Fundamentals',
      description: 'Style your web pages with CSS',
      roadmap: frontendBasics._id,
      order: 2,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=1Rs2ND1ryYc',
        hindi: 'https://www.youtube.com/watch?v=Edsxf_NBFrw'
      },
      documentation: '# CSS Fundamentals\n\nCSS (Cascading Style Sheets) controls the visual presentation of HTML elements.\n\n## Topics Covered\n\n- Selectors\n- Box Model\n- Flexbox\n- Grid\n- Responsive Design',
      estimatedDuration: 60,
      isActive: true
    },
    {
      title: 'JavaScript Basics',
      description: 'Add interactivity to your web pages',
      roadmap: frontendBasics._id,
      order: 3,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
        hindi: 'https://www.youtube.com/watch?v=hKB-YGF14SY'
      },
      documentation: '# JavaScript Basics\n\n## Topics\n\n- Variables and Data Types\n- Functions\n- Control Flow\n- DOM Manipulation\n- Events',
      estimatedDuration: 90,
      isActive: true
    },
    {
      title: 'DOM Manipulation',
      description: 'Learn to dynamically update web page content',
      roadmap: frontendBasics._id,
      order: 4,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=y17RuWkWdn8'
      },
      documentation: '# DOM Manipulation\n\nThe Document Object Model represents the page structure.\n\n## Key Methods\n\n- getElementById()\n- querySelector()\n- addEventListener()\n- createElement()',
      estimatedDuration: 60,
      isActive: true
    },

    // React Topics
    {
      title: 'React Introduction',
      description: 'Get started with React.js library',
      roadmap: reactPath._id,
      order: 1,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=w7ejDZ8SWv8',
        hindi: 'https://www.youtube.com/watch?v=RGKi6LSPDLU'
      },
      documentation: '# React Introduction\n\nReact is a JavaScript library for building user interfaces.\n\n## Key Concepts\n\n- Components\n- JSX\n- Virtual DOM\n- Unidirectional Data Flow',
      estimatedDuration: 60,
      isActive: true
    },
    {
      title: 'React Hooks',
      description: 'Master useState, useEffect, and custom hooks',
      roadmap: reactPath._id,
      order: 2,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=TNhaISOUy6Q'
      },
      documentation: '# React Hooks\n\n## Built-in Hooks\n\n- useState\n- useEffect\n- useContext\n- useReducer\n- useMemo\n- useCallback',
      estimatedDuration: 90,
      isActive: true
    },
    {
      title: 'React Router',
      description: 'Implement client-side routing',
      roadmap: reactPath._id,
      order: 3,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=Law7wfdg_ls'
      },
      documentation: '# React Router\n\n## Features\n\n- Route configuration\n- Navigation\n- URL parameters\n- Nested routes',
      estimatedDuration: 45,
      isActive: true
    },
    {
      title: 'State Management with Zustand',
      description: 'Simple and scalable state management',
      roadmap: reactPath._id,
      order: 4,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=_ngCLZ5Iz-0'
      },
      documentation: '# State Management with Zustand\n\nZustand is a small, fast state management solution.',
      estimatedDuration: 45,
      isActive: true
    },

    // Node.js Topics
    {
      title: 'Node.js Fundamentals',
      description: 'Introduction to Node.js runtime',
      roadmap: nodePath._id,
      order: 1,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
        hindi: 'https://www.youtube.com/watch?v=BLl32FvcdVM'
      },
      documentation: '# Node.js Fundamentals\n\n## Topics\n\n- What is Node.js?\n- npm basics\n- Modules\n- Event Loop',
      estimatedDuration: 60,
      isActive: true
    },
    {
      title: 'Express.js Framework',
      description: 'Build web applications with Express',
      roadmap: nodePath._id,
      order: 2,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=L72fhGm1tfE'
      },
      documentation: '# Express.js\n\n## Features\n\n- Routing\n- Middleware\n- Request handling\n- Response methods',
      estimatedDuration: 90,
      isActive: true
    },
    {
      title: 'MongoDB with Mongoose',
      description: 'Database operations with MongoDB',
      roadmap: nodePath._id,
      order: 3,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=DZBGEVgL2eE'
      },
      documentation: '# MongoDB with Mongoose\n\n## Topics\n\n- Schemas\n- Models\n- CRUD Operations\n- Relationships',
      estimatedDuration: 90,
      isActive: true
    },
    {
      title: 'REST API Design',
      description: 'Design and implement RESTful APIs',
      roadmap: nodePath._id,
      order: 4,
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=0oXYLzuucwE'
      },
      documentation: '# REST API Design\n\n## Principles\n\n- HTTP Methods\n- Status Codes\n- Resource Naming\n- Error Handling',
      estimatedDuration: 60,
      isActive: true
    }
  ];

  const normalizedTopics = topics.map(topic => ({
    ...topic,
    videoLinks: normalizeVideoLinks(topic.videoLinks),
    documentation: normalizeDocumentation(topic.documentation, topic.title)
  }));

  await Topic.bulkWrite(
    normalizedTopics.map((topic) => ({
      updateOne: {
        filter: { roadmap: topic.roadmap, title: topic.title },
        update: { $set: topic },
        upsert: true
      }
    }))
  );

  const createdTopics = await Topic.find({
    roadmap: { $in: roadmaps.map((roadmap) => roadmap._id) }
  });
  console.log(`✅ Created ${createdTopics.length} topics`);

  // Update roadmaps with topic references
  for (const roadmap of roadmaps) {
    const roadmapTopics = createdTopics.filter(t => t.roadmap && t.roadmap.toString() === roadmap._id.toString());
    await Roadmap.findByIdAndUpdate(roadmap._id, {
      topics: roadmapTopics.map(t => t._id)
    });
  }

  return createdTopics;
};

// Seed Programming Languages
const seedLanguages = async () => {
  const slugify = (value) => value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const languages = [
    {
      name: 'JavaScript',
      slug: slugify('JavaScript'),
      description: 'The language of the web. Used for frontend, backend, and mobile development.',
      icon: '/logo/js.webp',
      color: '#f7df1e',
      category: 'Web Development',
      popularity: 1,
      isActive: true
    },
    {
      name: 'Python',
      slug: slugify('Python'),
      description: 'Versatile language for web development, data science, AI, and automation.',
      icon: '/logo/python.webp',
      color: '#3776ab',
      category: 'General Purpose',
      popularity: 2,
      isActive: true
    },
    {
      name: 'TypeScript',
      slug: slugify('TypeScript'),
      description: 'JavaScript with types. Perfect for large-scale applications.',
      icon: '/logo/ts.webp',
      color: '#3178c6',
      category: 'Web Development',
      popularity: 3,
      isActive: true
    },
    {
      name: 'Java',
      slug: slugify('Java'),
      description: 'Enterprise-grade language for building robust applications.',
      icon: '/logo/java-4-logo.webp',
      color: '#007396',
      category: 'Enterprise',
      popularity: 4,
      isActive: true
    },
    {
      name: 'C',
      slug: slugify('C'),
      description: 'Foundational systems language used in operating systems and embedded development.',
      icon: '/logo/c.webp',
      color: '#555555',
      category: 'Systems',
      popularity: 5,
      isActive: true
    },
    {
      name: 'C++',
      slug: 'cpp',
      description: 'High-performance language for systems, games, and real-time applications.',
      icon: '/logo/981-9813175_c-logo-c-programming-language-logo.webp',
      color: '#00599c',
      category: 'Systems',
      popularity: 6,
      isActive: true
    }
  ];

  await ProgrammingLanguage.updateOne(
    { name: 'C++' },
    { $set: { slug: 'cpp' } }
  );

  const languageSlugs = languages.map((lang) => lang.slug);

  await ProgrammingLanguage.deleteMany({ slug: { $nin: languageSlugs } });

  await ProgrammingLanguage.bulkWrite(
    languages.map((lang) => ({
      updateOne: {
        filter: { slug: lang.slug },
        update: { $set: lang },
        upsert: true
      }
    }))
  );

  const createdLanguages = await ProgrammingLanguage.find({ slug: { $in: languageSlugs } });
  console.log(`✅ Created ${createdLanguages.length} programming languages`);
  return createdLanguages;
};

// Seed Language Topics
const seedLanguageTopics = async (languages) => {
  const slugify = (value) => value.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const javascript = languages.find(l => l.name === 'JavaScript');
  const python = languages.find(l => l.name === 'Python');
  const typescript = languages.find(l => l.name === 'TypeScript');

  const languageTopics = [
    // JavaScript Topics
    {
      title: 'Variables and Data Types',
      description: 'Learn about var, let, const and JavaScript data types',
      language: javascript._id,
      order: 1,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=edlFjlzxkSI'
      },
      documentation: '# Variables and Data Types\n\n## Variable Declarations\n\n- `var` - Function scoped\n- `let` - Block scoped\n- `const` - Block scoped, immutable binding\n\n## Data Types\n\n- String\n- Number\n- Boolean\n- Object\n- Array\n- null\n- undefined',
      estimatedDuration: 30,
      isActive: true
    },
    {
      title: 'Functions and Scope',
      description: 'Understanding functions, closures, and scope',
      language: javascript._id,
      order: 2,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=iLWTnMzWtj4'
      },
      documentation: '# Functions\n\n## Types of Functions\n\n- Function declarations\n- Function expressions\n- Arrow functions\n- IIFE',
      estimatedDuration: 45,
      isActive: true
    },
    {
      title: 'Arrays and Objects',
      description: 'Working with collections and objects',
      language: javascript._id,
      order: 3,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=R8rmfD9Y5-c'
      },
      documentation: '# Arrays and Objects\n\n## Array Methods\n\n- map, filter, reduce\n- forEach, find, some, every\n- push, pop, shift, unshift',
      estimatedDuration: 60,
      isActive: true
    },
    {
      title: 'Async JavaScript',
      description: 'Promises, async/await, and the event loop',
      language: javascript._id,
      order: 4,
      level: 'intermediate',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=PoRJizFvM7s'
      },
      documentation: '# Async JavaScript\n\n## Topics\n\n- Callbacks\n- Promises\n- async/await\n- Event Loop',
      estimatedDuration: 90,
      isActive: true
    },

    // Python Topics
    {
      title: 'Python Basics',
      description: 'Getting started with Python programming',
      language: python._id,
      order: 1,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
        hindi: 'https://www.youtube.com/watch?v=gfDE2a7MKjA'
      },
      documentation: '# Python Basics\n\n## Topics\n\n- Variables\n- Data Types\n- Operators\n- Input/Output',
      estimatedDuration: 60,
      isActive: true
    },
    {
      title: 'Control Flow',
      description: 'Conditionals and loops in Python',
      language: python._id,
      order: 2,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=Zp5MuPOtsSY'
      },
      documentation: '# Control Flow\n\n## Conditionals\n\n- if/elif/else\n\n## Loops\n\n- for loops\n- while loops\n- break/continue',
      estimatedDuration: 45,
      isActive: true
    },
    {
      title: 'Functions and Modules',
      description: 'Creating reusable code with functions',
      language: python._id,
      order: 3,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=9Os0o3wzS_I'
      },
      documentation: '# Functions\n\n## Defining Functions\n\n```python\ndef greet(name):\n    return f"Hello, {name}!"\n```',
      estimatedDuration: 60,
      isActive: true
    },

    // TypeScript Topics
    {
      title: 'TypeScript Introduction',
      description: 'Why TypeScript and getting started',
      language: typescript._id,
      order: 1,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=BwuLxPH8IDs'
      },
      documentation: '# TypeScript Introduction\n\nTypeScript is a typed superset of JavaScript.',
      estimatedDuration: 30,
      isActive: true
    },
    {
      title: 'Types and Interfaces',
      description: 'Working with TypeScript types',
      language: typescript._id,
      order: 2,
      level: 'beginner',
      videoLinks: {
        english: 'https://www.youtube.com/watch?v=NjN00cM18Z4'
      },
      documentation: '# Types and Interfaces\n\n## Basic Types\n\n- string\n- number\n- boolean\n- array\n- object\n- any\n- unknown\n- never',
      estimatedDuration: 60,
      isActive: true
    }
  ];

  const normalizeVideoLinks = (videoLinks = {}) => {
    const normalizeEntry = (entry) => {
      if (!entry) return undefined;
      if (typeof entry === 'string') {
        return { url: entry };
      }
      return entry;
    };

    return {
      english: normalizeEntry(videoLinks.english),
      tamil: normalizeEntry(videoLinks.tamil),
      hindi: normalizeEntry(videoLinks.hindi)
    };
  };

  const normalizeDocumentation = (documentation, title) => {
    if (documentation && typeof documentation === 'object') {
      return {
        title: documentation.title || title,
        content: documentation.content || documentation
      };
    }

    return {
      title,
      content: documentation || `# ${title}\n\nContent coming soon.`
    };
  };

  const normalizedLanguageTopics = languageTopics.map(topic => ({
    ...topic,
    slug: slugify(topic.title),
    videoLinks: normalizeVideoLinks(topic.videoLinks),
    documentation: normalizeDocumentation(topic.documentation, topic.title)
  }));

  await LanguageTopic.bulkWrite(
    normalizedLanguageTopics.map((topic) => ({
      updateOne: {
        filter: { language: topic.language, title: topic.title },
        update: { $set: topic },
        upsert: true
      }
    }))
  );

  const createdTopics = await LanguageTopic.find({
    language: { $in: languages.map((lang) => lang._id) }
  });
  console.log(`✅ Created ${createdTopics.length} language topics`);

  // Update languages with topic references
  for (const language of languages) {
    const langTopics = createdTopics.filter(t => t.language.toString() === language._id.toString());
    await ProgrammingLanguage.findByIdAndUpdate(language._id, {
      topics: langTopics.map(t => t._id)
    });
  }

  return createdTopics;
};

// Seed Admin User
const seedAdminUser = async (roles) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillforge.com';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
  const adminExists = await User.findOne({ email: adminEmail });

  if (!adminExists) {
    const adminRole = roles.find(r => r.name === 'Full Stack Developer');

    await User.create({
      name: 'Admin User',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isOnboarded: true,
      preferences: {
        targetRole: adminRole?._id,
        skillLevel: 'advanced',
        dailyStudyTime: 2,
        preferredLanguage: 'english'
      }
    });
    console.log(`✅ Created admin user (${adminEmail} / ${adminPassword})`);
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminRole = roles.find(r => r.name === 'Full Stack Developer');
    await User.findByIdAndUpdate(adminExists._id, {
      password: hashedPassword,
      role: 'admin',
      isOnboarded: true,
      preferences: {
        targetRole: adminRole?._id,
        skillLevel: 'advanced',
        dailyStudyTime: 2,
        preferredLanguage: 'english'
      }
    });
    console.log(`ℹ️  Admin user already exists - password updated (${adminEmail})`);
  }
};

// Main seed function
const seedDatabase = async ({ exitOnComplete = true, connect = true, includeRecruiterTestData = false } = {}) => {
  try {
    if (connect) {
      await connectDB();
    }

    console.log('\n🌱 Starting database seeding...\n');

    const roles = await seedRoles();
    const roadmaps = await seedRoadmaps(roles);
    await seedTopics(roadmaps);
    const languages = await seedLanguages();
    await seedLanguageTopics(languages);
    await seedAdminUser(roles);

    // Optionally seed recruiter test data
    if (includeRecruiterTestData) {
      console.log('\n📊 Seeding recruiter test data...');
      const { seedRecruiterData } = require('./recruiterTestData');
      await seedRecruiterData();
    }

    console.log('\n✨ Database seeding completed!\n');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillforge.com';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    console.log('You can now login with:');
    console.log(`  Email: ${adminEmail}`);
    console.log(`  Password: ${adminPassword}\n`);

    if (exitOnComplete) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (exitOnComplete) {
      process.exit(1);
    }
    throw error;
  }
};

// Run seed when executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
