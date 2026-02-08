/**
 * SkillForge AI - AI Integration Routes
 * REST endpoints for LLM API integration
 * Includes: AI Teacher, Tutor, Mentor, Interviewer, Scheduler
 */

const express = require('express');
const router = express.Router();
const AIChatSession = require('../models/AIChatSession');
const Topic = require('../models/Topic');
const User = require('../models/User');
const Role = require('../models/Role');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { protect } = require('../middleware/auth');

// Import AI service (placeholder for actual LLM integration)
const AIService = require('../services/aiService');

const structuredResponseInstruction = `\n\nAlways respond in a structured format using Markdown headings and bullet points. Use clear section titles and keep the response learner-friendly.`;

// Check if running on Vercel (serverless)
const isVercel = process.env.VERCEL || process.env.VERCEL_ENV;

// Setup upload directory (skip on Vercel - use memory storage instead)
const os = require('os');
const aiHelperUploadDir = isVercel ? os.tmpdir() : path.join(__dirname, '..', 'uploads', 'ai-helper');

// Safely create directory (skip on serverless)
try {
  if (!isVercel && !fs.existsSync(aiHelperUploadDir)) {
    fs.mkdirSync(aiHelperUploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not create ai-helper upload directory:', err.message);
}

// Use memory storage on Vercel, disk storage locally
const aiHelperStorage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, aiHelperUploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `ai-helper-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
  });

const aiHelperUpload = multer({
  storage: aiHelperStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or image files are allowed'), false);
    }
  }
});

const extractPdfText = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return {
    text: data.text || '',
    pageCount: data.numpages || null
  };
};

const extractImageText = async (filePath) => {
  const worker = await createWorker();
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data } = await worker.recognize(filePath);
  await worker.terminate();
  return data.text || '';
};

/**
 * @route   POST /api/ai/teacher/explain
 * @desc    AI Teacher - Explain topic using documentation
 * @access  Private
 */
router.post('/teacher/explain', protect, asyncHandler(async (req, res) => {
  const { topicId, question, sessionId } = req.body;

  const topic = await Topic.findById(topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const user = await User.findById(req.user.id);
  const language = user.preferences.preferredLanguage || 'english';

  // Get or create session
  let session;
  if (sessionId) {
    session = await AIChatSession.findById(sessionId);
  }

  if (!session) {
    session = await AIChatSession.create({
      user: req.user.id,
      type: 'teacher',
      context: {
        topic: topicId,
        language,
        additionalContext: topic.documentation.content
      },
      messages: [{
        role: 'system',
        content: `You are an AI Teacher for SkillForge AI. Explain the topic "${topic.title}" using the provided documentation. Respond in ${language}. Be clear, concise, and educational.${structuredResponseInstruction}`
      }]
    });
  }

  // Add user message
  session.addMessage('user', question);

  // Call AI Service
  const aiResponse = await AIService.chat({
    messages: session.messages,
    context: {
      documentation: topic.documentation.content,
      language
    }
  });

  // Add AI response
  session.addMessage('assistant', aiResponse.content, {
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model
  });

  await session.save();

  res.status(200).json({
    success: true,
    data: {
      sessionId: session._id,
      response: aiResponse.content,
      messageCount: session.messages.length
    }
  });
}));

/**
 * @route   POST /api/ai/tutor/generate-test
 * @desc    AI Tutor - Generate test questions from video transcript
 * @access  Private
 */
router.post('/tutor/generate-test', protect, asyncHandler(async (req, res) => {
  const { topicId, questionCount = 5 } = req.body;

  const topic = await Topic.findById(topicId);
  if (!topic) {
    throw new ApiError('Topic not found', 404);
  }

  const user = await User.findById(req.user.id);
  const language = user.preferences.preferredLanguage || 'english';

  // Get video transcript (from cache or fetch)
  let transcript = topic.aiCache?.transcript;

  if (!transcript) {
    // Fetch transcript using YouTube API (placeholder)
    const videoId = topic.videoLinks[language]?.videoId || topic.videoLinks.english?.videoId;
    transcript = await AIService.getVideoTranscript(videoId);

    // Cache transcript
    topic.aiCache = topic.aiCache || {};
    topic.aiCache.transcript = transcript;
    topic.aiCache.lastGenerated = new Date();
    await topic.save();
  }

  // Generate questions using AI
  const questions = await AIService.generateTestQuestions({
    transcript,
    topicTitle: topic.title,
    questionCount,
    language
  });

  res.status(200).json({
    success: true,
    data: {
      topicId: topic._id,
      questions
    }
  });
}));

/**
 * @route   POST /api/ai/tutor/evaluate
 * @desc    AI Tutor - Evaluate test answers
 * @access  Private
 */
router.post('/tutor/evaluate', protect, asyncHandler(async (req, res) => {
  const { topicId, answers, questions } = req.body;

  const user = await User.findById(req.user.id);
  const language = user.preferences.preferredLanguage || 'english';

  // Evaluate answers using AI
  const evaluation = await AIService.evaluateAnswers({
    questions,
    answers,
    language
  });

  res.status(200).json({
    success: true,
    data: evaluation
  });
}));

/**
 * @route   POST /api/ai/tutor/socratic
 * @desc    AI Tutor - Socratic feedback for answers
 * @access  Private
 */
router.post('/tutor/socratic', protect, asyncHandler(async (req, res) => {
  const { question, userAnswer, topicTitle, difficulty } = req.body;

  if (!question || !userAnswer) {
    throw new ApiError('Question and userAnswer are required', 400);
  }

  const user = await User.findById(req.user.id);
  const language = user.preferences.preferredLanguage || 'english';

  const systemPrompt = `You are a Socratic tutor. Use ${language} for all responses.\n\n` +
    `Rules:\n- Do NOT give the final answer directly.\n- Ask 2-4 short guiding questions.\n` +
    `- Provide 1 concise hint after the questions.\n- Keep it friendly and learner-focused.\n` +
    `- If the answer is correct, confirm and ask a deeper follow-up question.\n`;

  const userPrompt = `Topic: ${topicTitle || 'General'}\n` +
    `Difficulty: ${difficulty || 'medium'}\n` +
    `Question: ${question}\n` +
    `Student answer: ${userAnswer}`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    context: { feature: 'ai-tutor-socratic' }
  });

  res.status(200).json({
    success: true,
    data: {
      response: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/tutor/code-critique
 * @desc    AI Tutor - Code critique and improvement suggestions
 * @access  Private
 */
router.post('/tutor/code-critique', protect, asyncHandler(async (req, res) => {
  const { code, language: codeLanguage, task, goals } = req.body;

  if (!code) {
    throw new ApiError('Code is required', 400);
  }

  const user = await User.findById(req.user.id);
  const responseLanguage = user.preferences.preferredLanguage || 'english';

  const systemPrompt = `You are a senior code reviewer. Respond in ${responseLanguage}.\n` +
    `Provide structured feedback with headings:\n` +
    `1) Summary\n2) Issues\n3) Improvements\n4) Improved Snippet (if applicable).\n` +
    `Keep it concise and actionable.`;

  const userPrompt = `Language: ${codeLanguage || 'unspecified'}\n` +
    `Task: ${task || 'No task provided'}\n` +
    `Goals: ${goals || 'No goals provided'}\n\n` +
    `Code:\n${code}`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    context: { feature: 'ai-tutor-code-critique' }
  });

  res.status(200).json({
    success: true,
    data: {
      response: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/mentor/chat
 * @desc    AI Mentor - Doubt clearing chat
 * @access  Private
 */
router.post('/mentor/chat', protect, asyncHandler(async (req, res) => {
  const { message, sessionId, context } = req.body;

  const user = await User.findById(req.user.id)
    .populate('preferences.targetRole');

  const language = user.preferences.preferredLanguage || 'english';

  // Get or create session
  let session;
  if (sessionId) {
    session = await AIChatSession.findById(sessionId);
  }

  if (!session) {
    let systemPrompt;
    let additionalContext = context;

    // If launched from a roadmap topic, tailor mentor to topic/documentation
    if (context && typeof context === 'object' && context.mode === 'topic') {
      let topicTitle = context.title;
      let documentation = context.documentation;
      if (context.topicId && (!topicTitle || !documentation)) {
        const t = await Topic.findById(context.topicId);
        if (t) {
          topicTitle = topicTitle || t.title;
          documentation = documentation || (t.documentation?.content || t.documentation || '');
        }
      }

      systemPrompt = `You are an AI Mentor for SkillForge AI. Help the student understand the topic "${topicTitle || 'Unknown Topic'}" using the provided documentation.
Student Profile:
- Name: ${user.name}
- Target Role: ${user.preferences.targetRole?.name || 'Not specified'}
- Skill Level: ${user.preferences.skillLevel}

Documentation:
${documentation || 'No documentation provided.'}

Respond in ${language}. Be supportive, educational, and focus your guidance strictly on this topic.${structuredResponseInstruction}`;
      additionalContext = { ...(context || {}), title: topicTitle, documentation };
    } else {
      systemPrompt = `You are an AI Mentor for SkillForge AI. You help students with their doubts about programming and career development.
Student Profile:
- Name: ${user.name}
- Target Role: ${user.preferences.targetRole?.name || 'Not specified'}
- Skill Level: ${user.preferences.skillLevel}

Respond in ${language}. Be supportive, encouraging, and provide practical advice.${structuredResponseInstruction}`;
    }

    session = await AIChatSession.create({
      user: req.user.id,
      type: 'mentor',
      context: {
        role: user.preferences.targetRole?._id,
        language,
        additionalContext
      },
      messages: [{
        role: 'system',
        content: systemPrompt
      }]
    });
  }

  // Add user message
  session.addMessage('user', message);

  // Call AI Service
  const aiResponse = await AIService.chat({
    messages: session.messages,
    context: { language, additionalContext: session.context?.additionalContext }
  });

  // Add AI response
  session.addMessage('assistant', aiResponse.content, {
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model
  });

  await session.save();

  res.status(200).json({
    success: true,
    data: {
      sessionId: session._id,
      response: aiResponse.content,
      messageCount: session.messages.length
    }
  });
}));

/**
 * @route   POST /api/ai/helper/analyze
 * @desc    AI Helper - Analyze uploaded images/PDFs and teach content
 * @access  Private
 */
router.post('/helper/analyze', protect, aiHelperUpload.array('files', 5), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const files = req.files || [];

  if (!files.length) {
    throw new ApiError('At least one file is required', 400);
  }

  const extracted = [];

  for (const file of files) {
    let text = '';
    let pageCount = null;

    try {
      if (file.mimetype === 'application/pdf') {
        const parsed = await extractPdfText(file.path);
        text = parsed.text || '';
        pageCount = parsed.pageCount;
      } else {
        text = await extractImageText(file.path);
      }
    } catch (error) {
      text = '';
    }

    extracted.push({
      fileName: file.originalname,
      mimeType: file.mimetype,
      pageCount,
      text
    });
  }

  const combinedText = extracted.map((item, index) => {
    const header = `File ${index + 1}: ${item.fileName} (${item.mimeType}${item.pageCount ? `, ${item.pageCount} pages` : ''})`;
    return `${header}\n${item.text || ''}`;
  }).join('\n\n');

  const readableLength = combinedText.replace(/\s+/g, ' ').trim().length;
  if (readableLength < 20) {
    return res.status(200).json({
      success: true,
      data: {
        response: 'I couldn\'t read the content clearly. Please upload a clearer image or PDF.'
      }
    });
  }

  const systemPrompt = `You are AI Helper for SkillForge AI. Follow these rules strictly:
- Read and extract content from the uploaded file.
- If handwriting or text is unclear, infer meaning where reasonable.
- If the content contains questions or problems: solve them step-by-step and explain clearly.
- If the content contains study notes: summarize key points and teach the concept in simple, structured explanations.
- If diagrams or charts appear: describe them and explain what they represent.
- If multiple pages exist: organize output page-wise or topic-wise.
- Keep responses clear, structured, and learner-friendly.
- If content is unreadable: ask for a clearer upload.
- Never mention internal processing or model details.

Always respond in the following structured format (use Markdown headings and bullet points where appropriate):

## Summary
- Brief 2-4 line overview of what was found.

## Extracted Content
- Page-wise or topic-wise bullet points of the extracted text/notes.

## Questions & Solutions (if any)
- For each question: show steps, reasoning, and final answer.

## Concepts Explained (if any)
- Simple, structured explanations of concepts found in the notes.

## Diagrams/Charts (if any)
- Describe what each diagram/chart shows and what it represents.

## Issues / Unclear Areas
- List unclear parts and ask for a clearer upload if necessary.

If a section is not applicable, write: "Not applicable."`;

  const userPrompt = `Uploaded content (extracted text may be imperfect):\n\n${combinedText}\n\nAdditional user notes: ${notes || 'None'}`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    context: { feature: 'ai-helper' }
  });

  return res.status(200).json({
    success: true,
    data: {
      response: aiResponse.content,
      files: extracted.map((item) => ({
        fileName: item.fileName,
        mimeType: item.mimeType,
        pageCount: item.pageCount || undefined,
        extractedLength: (item.text || '').length
      }))
    }
  });
}));

/**
 * @route   POST /api/ai/interviewer/start
 * @desc    AI Interviewer - Start mock interview
 * @access  Private
 */
router.post('/interviewer/start', protect, asyncHandler(async (req, res) => {
  const { roleId, difficulty = 'medium', topics = [] } = req.body;

  const role = await Role.findById(roleId);
  if (!role) {
    throw new ApiError('Role not found', 404);
  }

  const user = await User.findById(req.user.id);
  const language = user.preferences.preferredLanguage || 'english';

  const systemPrompt = `You are an AI Technical Interviewer for SkillForge AI. You are conducting a ${difficulty} difficulty mock interview for the ${role.name} position.

  Must-cover Skills/Technologies: ${role.keywords?.join(', ') || 'Standard ' + role.name + ' skills'}
  Topics requested: ${topics.length > 0 ? topics.join(', ') : 'Comprehensive coverage'}

  Interview Guidelines:
  - Ask one question at a time
  - Wait for the candidate's response before asking the next question
  - Provide brief feedback after each answer
  - Be professional but encouraging
  - Respond in ${language}
  - Format each response with headings and bullet points
  - Focus questions on the "Must-cover Skills" listed above.

  Start by introducing yourself and asking the first question.${structuredResponseInstruction}`;

  // Create interview session
  const session = await AIChatSession.create({
    user: req.user.id,
    type: 'interviewer',
    context: {
      role: roleId,
      language
    },
    interviewData: {
      role: role.name,
      difficulty,
      topics,
      questionsAsked: []
    },
    messages: [{
      role: 'system',
      content: systemPrompt
    }]
  });

  // Get initial interviewer message
  const aiResponse = await AIService.chat({
    messages: session.messages,
    context: { language }
  });

  session.addMessage('assistant', aiResponse.content, {
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model
  });

  await session.save();

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      role: role.name,
      difficulty,
      message: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/interviewer/:sessionId/respond
 * @desc    AI Interviewer - Respond to interview question
 * @access  Private
 */
router.post('/interviewer/:sessionId/respond', protect, asyncHandler(async (req, res) => {
  const { answer } = req.body;

  const session = await AIChatSession.findOne({
    _id: req.params.sessionId,
    user: req.user.id,
    type: 'interviewer',
    status: 'active'
  });

  if (!session) {
    throw new ApiError('Interview session not found', 404);
  }

  // Add user answer
  session.addMessage('user', answer);

  // Get AI response (feedback + next question)
  const aiResponse = await AIService.chat({
    messages: session.messages,
    context: { language: session.context.language }
  });

  session.addMessage('assistant', aiResponse.content, {
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model
  });

  await session.save();

  res.status(200).json({
    success: true,
    data: {
      response: aiResponse.content,
      questionCount: session.interviewData.questionsAsked.length
    }
  });
}));

/**
 * @route   POST /api/ai/interviewer/:sessionId/end
 * @desc    AI Interviewer - End interview and get feedback
 * @access  Private
 */
router.post('/interviewer/:sessionId/end', protect, asyncHandler(async (req, res) => {
  const session = await AIChatSession.findOne({
    _id: req.params.sessionId,
    user: req.user.id,
    type: 'interviewer'
  });

  if (!session) {
    throw new ApiError('Interview session not found', 404);
  }

  // Request final evaluation
  session.addMessage('user', 'Please provide a final evaluation of my interview performance with scores and suggestions for improvement.');

  const aiResponse = await AIService.chat({
    messages: session.messages,
    context: { language: session.context.language }
  });

  session.addMessage('assistant', aiResponse.content, {
    tokensUsed: aiResponse.tokensUsed,
    model: aiResponse.model
  });

  session.endSession();
  await session.save();

  // Award XP for Interview Session
  const xpService = require('../services/xpService');
  let xpResult = null;
  try {
    xpResult = await xpService.addXP(req.user.id, 'INTERVIEW_SESSION');
  } catch (err) {
    console.error('Failed to award interview XP:', err.message);
  }

  res.status(200).json({
    success: true,
    data: {
      feedback: aiResponse.content,
      duration: session.stats.duration,
      messageCount: session.stats.totalMessages,
      xpEarned: xpResult?.xpAdded,
      leveledUp: xpResult?.leveledUp
    }
  });
}));

/**
 * @route   POST /api/ai/scheduler/generate-plan
 * @desc    AI Scheduler - Generate adaptive daily study plan
 * @access  Private
 */
router.post('/scheduler/generate-plan', protect, asyncHandler(async (req, res) => {
  const { date } = req.body;

  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap')
    .populate('preferences.targetRole');

  const language = user.preferences.preferredLanguage || 'english';
  const dailyMinutes = user.preferences.dailyStudyTime * 60;

  // Get current roadmap progress
  const currentEnrollment = user.enrolledRoadmaps.find(er => er.status === 'current');

  // Generate AI suggestions for study plan
  const planSuggestions = await AIService.generateStudyPlan({
    user: {
      name: user.name,
      skillLevel: user.preferences.skillLevel,
      targetRole: user.preferences.targetRole?.name,
      dailyMinutes
    },
    currentRoadmap: currentEnrollment?.roadmap,
    progress: currentEnrollment?.progress || 0,
    language
  });

  res.status(200).json({
    success: true,
    data: planSuggestions
  });
}));

/**
 * @route   GET /api/ai/sessions
 * @desc    Get user's AI chat sessions
 * @access  Private
 */
router.get('/sessions', protect, asyncHandler(async (req, res) => {
  const { type, limit = 10 } = req.query;

  const query = { user: req.user.id };
  if (type) query.type = type;

  const sessions = await AIChatSession.find(query)
    .select('type status startedAt endedAt stats.totalMessages context')
    .sort({ startedAt: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: sessions
  });
}));

/**
 * @route   GET /api/ai/sessions/:sessionId
 * @desc    Get specific AI chat session
 * @access  Private
 */
router.get('/sessions/:sessionId', protect, asyncHandler(async (req, res) => {
  const session = await AIChatSession.findOne({
    _id: req.params.sessionId,
    user: req.user.id
  }).populate('context.topic', 'title slug');

  if (!session) {
    throw new ApiError('Session not found', 404);
  }

  res.status(200).json({
    success: true,
    data: session
  });
}));

/**
 * @route   POST /api/ai/skill-gap/analyze
 * @desc    AI Skill-Gap Analyzer - Identify gaps in user's skillset
 * @access  Private
 */
router.post('/skill-gap/analyze', protect, asyncHandler(async (req, res) => {
  const { targetRoleId } = req.body;

  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap')
    .populate('preferences.targetRole');

  const targetRole = targetRoleId
    ? await Role.findById(targetRoleId)
    : user.preferences.targetRole;

  if (!targetRole) {
    throw new ApiError('Target role required', 400);
  }

  // Gather user's current skills
  const completedTopics = [];
  user.enrolledRoadmaps?.forEach(er => {
    er.completedTopics?.forEach(ct => {
      completedTopics.push({ topic: ct.topic, score: ct.testScore });
    });
  });

  const prompt = `Analyze the skill gap for a student targeting the ${targetRole.name} role.

Student has completed ${completedTopics.length} topics.
Current skill level: ${user.preferences.skillLevel}
Target role required skills: ${targetRole.requiredSkills?.join(', ') || 'Not specified'}

Provide a structured analysis with:
1. Current Strengths
2. Skill Gaps (what's missing)
3. Recommended Learning Path
4. Estimated Time to Bridge Gap
5. Priority Actions

Use headings and bullet points.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: 'You are a career counselor and skill gap analyzer.' },
      { role: 'user', content: prompt }
    ],
    context: { feature: 'skill-gap-analysis' }
  });

  res.status(200).json({
    success: true,
    data: {
      targetRole: targetRole.name,
      completedTopics: completedTopics.length,
      analysis: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/roadmap/generate
 * @desc    AI Personalized Roadmap Generator - Create custom roadmap
 * @access  Private
 */
router.post('/roadmap/generate', protect, asyncHandler(async (req, res) => {
  const { goal, duration, preferences } = req.body;

  if (!goal) {
    throw new ApiError('Goal is required', 400);
  }

  const user = await User.findById(req.user.id);

  const prompt = `Generate a personalized learning roadmap for:
Goal: ${goal}
Duration: ${duration || '3 months'}
Current skill level: ${user.preferences.skillLevel}
Preferences: ${preferences || 'None specified'}

Create a structured roadmap with:
1. Roadmap Title
2. Phases (Beginner, Intermediate, Advanced)
3. Key Topics for each phase
4. Estimated time per topic
5. Prerequisite knowledge
6. Project ideas
7. Recommended resources

Format as a clear, actionable learning path.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: 'You are a curriculum designer who creates personalized learning roadmaps.' },
      { role: 'user', content: prompt }
    ],
    context: { feature: 'roadmap-generation' }
  });

  res.status(200).json({
    success: true,
    data: {
      goal,
      duration,
      roadmap: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/voice/text-to-speech
 * @desc    Voice Tutor - Convert AI response to speech data
 * @access  Private
 */
router.post('/voice/text-to-speech', protect, asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ApiError('Text is required', 400);
  }

  // Return text for Web Speech API (client-side TTS)
  // Server just validates and prepares
  res.status(200).json({
    success: true,
    data: {
      text,
      voice: 'en-US',
      rate: 1.0,
      pitch: 1.0,
      instructions: 'Use browser Web Speech API for text-to-speech'
    }
  });
}));

/**
 * @route   POST /api/ai/resume/generate
 * @desc    AI Resume Auto-Builder - Generate professional resume
 * @access  Private
 */
router.post('/resume/generate', protect, asyncHandler(async (req, res) => {
  const { template = 'professional' } = req.body;

  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap')
    .populate('preferences.targetRole');

  // Build skills from completed roadmaps
  const skills = new Set();
  user.enrolledRoadmaps?.forEach(er => {
    if (er.roadmap?.role) {
      er.roadmap.role.split(/[,\/\s]+/).forEach(s => skills.add(s));
    }
  });

  const completedRoadmaps = user.enrolledRoadmaps
    ?.filter(er => er.status === 'completed')
    .map(er => er.roadmap?.title || 'Untitled');

  const resumeData = {
    personalInfo: {
      name: user.name,
      email: user.email,
      ...user.careerData?.personalInfo
    },
    summary: user.careerData?.summary || `${user.preferences.skillLevel} developer targeting ${user.preferences.targetRole?.name || 'software roles'}`,
    skills: Array.from(skills),
    education: user.careerData?.education || [],
    experience: user.careerData?.experience || [],
    certifications: completedRoadmaps,
    projects: user.careerData?.projects || []
  };

  const prompt = `Generate a professional ${template} resume for:

${JSON.stringify(resumeData, null, 2)}

Format as a structured resume with:
1. Professional Summary (2-3 lines)
2. Technical Skills (categorized)
3. Experience (if any)
4. Education
5. Certifications & Courses
6. Projects (if any)

Use clear headings and bullet points. Make it ATS-friendly.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: 'You are a professional resume writer specializing in technical resumes.' },
      { role: 'user', content: prompt }
    ],
    context: { feature: 'resume-generation' }
  });

  res.status(200).json({
    success: true,
    data: {
      template,
      resumeContent: aiResponse.content,
      resumeData
    }
  });
}));

/**
 * @route   POST /api/ai/projects/generate-ideas
 * @desc    AI Project Idea Generator - Suggest project ideas
 * @access  Private
 */
router.post('/projects/generate-ideas', protect, asyncHandler(async (req, res) => {
  const { skill, difficulty = 'intermediate', count = 5 } = req.body;

  const user = await User.findById(req.user.id);

  const prompt = `Generate ${count} unique project ideas for:
Skill/Technology: ${skill || 'General programming'}
Difficulty: ${difficulty}
Student level: ${user.preferences.skillLevel}

For each project, provide:
1. Project Title
2. Brief Description (2-3 lines)
3. Key Features (3-5 bullet points)
4. Technologies/Skills Used
5. Estimated Time
6. Learning Outcomes

Format clearly with headings for each project.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: 'You are a project idea generator for software developers. Suggest practical, portfolio-worthy projects.' },
      { role: 'user', content: prompt }
    ],
    context: { feature: 'project-ideas' }
  });

  res.status(200).json({
    success: true,
    data: {
      skill,
      difficulty,
      count,
      ideas: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/jobs/match
 * @desc    AI Job Matching & Application Assistant
 * @access  Private
 */
router.post('/jobs/match', protect, asyncHandler(async (req, res) => {
  const { jobId } = req.body;

  const JobPosting = require('../models/JobPosting');
  const job = await JobPosting.findById(jobId);

  if (!job) {
    throw new ApiError('Job not found', 404);
  }

  const user = await User.findById(req.user.id)
    .populate('enrolledRoadmaps.roadmap');

  // User skills
  const userSkills = new Set();
  user.enrolledRoadmaps?.forEach(er => {
    if (er.roadmap?.role) {
      er.roadmap.role.split(/[,\/\s]+/).forEach(s => userSkills.add(s.toLowerCase()));
    }
  });

  const jobSkills = job.requirements.skills || [];

  const prompt = `Analyze job match and provide application assistance:

JOB: ${job.title} at ${job.company}
Required Skills: ${jobSkills.join(', ')}
Experience: ${job.requirements.experience}

CANDIDATE:
Current Skills: ${Array.from(userSkills).join(', ')}
Completed Topics: ${user.enrolledRoadmaps?.reduce((sum, er) => sum + (er.completedTopics?.length || 0), 0)}
Skill Level: ${user.preferences.skillLevel}

Provide:
1. Match Score (0-100) with justification
2. Matched Skills
3. Missing Skills
4. Application Strategy (how to highlight strengths)
5. Cover Letter Tips
6. Interview Preparation Suggestions

Format with clear headings.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: 'You are a job application assistant helping candidates match with jobs and prepare applications.' },
      { role: 'user', content: prompt }
    ],
    context: { feature: 'job-matching' }
  });

  res.status(200).json({
    success: true,
    data: {
      job: {
        title: job.title,
        company: job.company
      },
      analysis: aiResponse.content
    }
  });
}));

/**
 * @route   POST /api/ai/fix-text
 * @desc    Fix spelling and grammar in text
 * @access  Private
 */
router.post('/fix-text', protect, asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    throw new ApiError('Text is required', 400);
  }

  const systemPrompt = `You are a text correction assistant. Fix any spelling or grammatical errors in the text provided by the user. Return ONLY the corrected text. Do not add quotes, explanations, or any other text.`;

  const aiResponse = await AIService.chat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text }
    ],
    context: { feature: 'ai-text-fix' }
  });

  res.status(200).json({
    success: true,
    data: {
      correctedText: aiResponse.content.trim()
    }
  });
}));

module.exports = router;

