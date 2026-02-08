/**
 * SkillForge AI - AI Service
 * LLM API integration for all AI features
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.providers = this.buildProviders();
  }

  buildProviders() {
    const parseKeys = (value) => (value || '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);

    return [
      {
        name: 'perplexity',
        keys: parseKeys(process.env.PERPLEXITY_API_KEYS),
        apiUrl: process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai/chat/completions',
        model: process.env.PERPLEXITY_MODEL || 'sonar-pro'
      },
      {
        name: 'groq',
        keys: parseKeys(process.env.GROQ_API_KEYS),
        apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
      },
      {
        name: 'gemini',
        keys: parseKeys(process.env.GEMINI_API_KEYS),
        apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
      }
    ];
  }

  /**
   * Make a chat completion request to the LLM
   */
  async chat({ messages, context = {} }) {
    try {
      let provider = await this.tryProviders(messages);
      if (!provider) {
        provider = this.getMockResponse(messages, context);
      }

      // Sanitize content (remove citations like [1], [1][2], [1, 2])
      if (provider && provider.content) {
        provider.content = provider.content.replace(/(\[\d+(?:,\s*\d+)*\])+/g, '');
      }

      return provider;
    } catch (error) {
      console.error('AI Service Error:', error.message);
      return this.getMockResponse(messages, context);
    }
  }

  /**
   * Helper to generate simple text response
   */
  async generateText(prompt, contextType = 'general', language = 'english') {
    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { type: contextType, language }
    });
    return response.content;
  }

  async tryProviders(messages) {
    for (const provider of this.providers) {
      if (!provider.keys.length) continue;

      for (const key of provider.keys) {
        try {
          if (provider.name === 'gemini') {
            return await this.callGemini(provider, key, messages);
          }
          return await this.callOpenAICompatible(provider, key, messages);
        } catch (error) {
          const status = error.response?.status;
          console.error(`AI Service Error (${provider.name}):`, error.message);
          if (![401, 403, 429, 500, 503].includes(status)) {
            throw error;
          }
        }
      }
    }

    return null;
  }

  async callOpenAICompatible(provider, key, messages) {
    const response = await axios.post(
      provider.apiUrl,
      {
        model: provider.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      content: response.data.choices?.[0]?.message?.content || '',
      tokensUsed: response.data.usage?.total_tokens || 0,
      model: provider.model
    };
  }

  async callGemini(provider, key, messages) {
    const response = await axios.post(
      `${provider.apiUrl}/${provider.model}:generateContent`,
      {
        contents: messages.map((message) => ({
          role: message.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: message.content }]
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      },
      {
        params: { key },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      tokensUsed: 0,
      model: provider.model
    };
  }

  /**
   * Get video transcript from YouTube
   */
  async getVideoTranscript(videoId) {
    try {
      // In production, use youtube-transcript library
      // const { YoutubeTranscript } = require('youtube-transcript');
      // const transcript = await YoutubeTranscript.fetchTranscript(videoId);

      // Mock transcript for development
      return `This is a sample transcript for video ${videoId}.
      The video covers important programming concepts including:
      - Basic syntax and structure
      - Variables and data types
      - Control flow statements
      - Functions and methods
      - Object-oriented programming basics`;
    } catch (error) {
      console.error('Transcript fetch error:', error);
      return null;
    }
  }

  /**
   * Generate test questions from video transcript
   */
  async generateTestQuestions({ transcript, topicTitle, questionCount = 5, language = 'english' }) {
    const prompt = `Generate ${questionCount} multiple choice questions based ONLY on the topic title "${topicTitle}".

Generate questions that test understanding of key concepts from the topic title. Each question should have 4 options with one correct answer.

Format as JSON array:
[
  {
    "questionText": "Question here?",
    "questionType": "multiple-choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "correctAnswer": "Option B"
  }
]

${language !== 'english' ? `Respond in ${language}.` : ''}`;

    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { language }
    });

    try {
      // Try to parse JSON from response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse questions:', e);
    }

    throw new Error('AI did not return valid question JSON');
  }

  /**
   * Evaluate test answers using AI
   */
  async evaluateTestWithAI({ questions, answers, language = 'english' }) {
    const prompt = `You are an automated grader. Evaluate the user's answers.

Return ONLY a JSON array with the same length and order as the input. Each item must be:
{
  "questionText": "...",
  "userAnswer": "...",
  "correctAnswer": "...",
  "isCorrect": true|false
}

Questions:
${JSON.stringify(questions, null, 2)}

User Answers (aligned by index):
${JSON.stringify(answers, null, 2)}

${language !== 'english' ? `Respond in ${language}.` : ''}`;

    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { language }
    });

    try {
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse evaluation:', e);
    }

    throw new Error('AI did not return valid evaluation JSON');
  }

  /**
   * Evaluate test answers
   */
  async evaluateAnswers({ questions, answers, language = 'english' }) {
    let correct = 0;
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswer = answers[i];
      const isCorrect = question.correctAnswer === userAnswer;

      if (isCorrect) correct++;

      results.push({
        questionText: question.questionText,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect
      });
    }

    return {
      score: Math.round((correct / questions.length) * 100),
      correct,
      total: questions.length,
      results,
      feedback: correct >= questions.length / 2
        ? 'Great job! You passed the test.'
        : 'Keep studying and try again.'
    };
  }

  /**
   * Analyze LeetCode profile
   */
  async analyzeLeetCode({ stats, targetRole, skillLevel, language = 'english' }) {
    const roleTopicFocus = await this.getRoleTopicRecommendations(targetRole, stats?.topicWise || [], language);

    // Calculate LeetCode score (0-100)
    const totalSolved = stats.stats?.totalSolved || 0;
    const acceptanceRate = stats.stats?.acceptanceRate || 0;
    const mediumSolvedRatio = totalSolved > 0 ? (stats.stats?.mediumSolved || 0) / totalSolved : 0;
    const hardSolvedRatio = totalSolved > 0 ? (stats.stats?.hardSolved || 0) / totalSolved : 0;

    // Score formula:
    // - Base: min(totalSolved / 5, 40) for solving problems
    // - Medium bonus: mediumSolvedRatio * 30
    // - Hard bonus: hardSolvedRatio * 20
    // - Acceptance rate: acceptanceRate * 0.1
    const score = Math.min(
      Math.round(
        Math.min(totalSolved / 5, 40) +
        (mediumSolvedRatio * 30) +
        (hardSolvedRatio * 20) +
        (acceptanceRate * 0.1)
      ),
      100
    );

    const prompt = `Analyze this LeetCode profile for a ${skillLevel} developer targeting ${targetRole || 'software developer'} role:

Stats:
- Total Solved: ${stats.stats?.totalSolved || 0}
- Easy: ${stats.stats?.easySolved || 0}
- Medium: ${stats.stats?.mediumSolved || 0}
- Hard: ${stats.stats?.hardSolved || 0}
- Acceptance Rate: ${stats.stats?.acceptanceRate || 0}%

Role focus topics: ${roleTopicFocus.requiredTopics.join(', ') || 'N/A'}

Provide analysis in JSON format:
{
  "summary": "Brief summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "requiredTopics": ["topic 1", "topic 2"],
  "focusTopics": ["topic 1", "topic 2"],
  "recommendedProblems": [
    {"title": "Problem name", "difficulty": "Easy/Medium/Hard", "topic": "Topic", "url": "https://leetcode.com/problems/..."}
  ],
  "actionPlan": [
    {"action": "Action item", "priority": "high/medium/low", "timeline": "1 week"}
  ]
}

${language !== 'english' ? `Respond in ${language}.` : ''}`;

    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { language }
    });

    let parsedResponse = null;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse LeetCode analysis:', e);
    }

    if (parsedResponse) {
      return {
        score,
        ...parsedResponse,
        requiredTopics: parsedResponse.requiredTopics?.length
          ? parsedResponse.requiredTopics
          : roleTopicFocus.requiredTopics,
        focusTopics: parsedResponse.focusTopics?.length
          ? parsedResponse.focusTopics
          : roleTopicFocus.focusTopics,
        recommendedProblems: parsedResponse.recommendedProblems || []
      };
    }

    return {
      score,
      summary: 'Your LeetCode profile shows steady progress.',
      strengths: ['Consistent problem solving', 'Good acceptance rate'],
      weaknesses: ['Need more hard problems', 'Focus on dynamic programming'],
      recommendations: ['Practice daily', 'Focus on weak topics'],
      requiredTopics: roleTopicFocus.requiredTopics,
      focusTopics: roleTopicFocus.focusTopics,
      recommendedProblems: [
        { title: 'Two Sum', difficulty: 'Easy', topic: 'Array', url: 'https://leetcode.com/problems/two-sum/' },
        { title: 'Valid Parentheses', difficulty: 'Easy', topic: 'Stack', url: 'https://leetcode.com/problems/valid-parentheses/' },
        { title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', topic: 'String', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
        { title: 'Binary Tree Level Order Traversal', difficulty: 'Medium', topic: 'Tree', url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
        { title: 'Course Schedule', difficulty: 'Medium', topic: 'Graph', url: 'https://leetcode.com/problems/course-schedule/' }
      ],
      actionPlan: [
        { action: 'Solve 2 medium problems daily', priority: 'high', timeline: '2 weeks' }
      ]
    };
  }

  async getRoleTopicRecommendations(targetRole, topicWise, language = 'english') {
    const aiResponse = await this.getRoleTopicRecommendationsFromAI(targetRole, topicWise, language);
    if (aiResponse) {
      return aiResponse;
    }

    const role = (targetRole || '').toLowerCase();
    const roleTopicsMap = {
      frontend: ['Array', 'String', 'Hash Table', 'Two Pointers', 'Stack', 'Queue', 'Graph', 'Tree', 'Greedy'],
      backend: ['Tree', 'Graph', 'Heap', 'Binary Search', 'Dynamic Programming', 'Design', 'Hash Table'],
      'full stack': ['Array', 'String', 'Hash Table', 'Tree', 'Graph', 'Dynamic Programming', 'Greedy'],
      data: ['Array', 'Hash Table', 'Two Pointers', 'Sorting', 'Binary Search', 'Heap', 'Dynamic Programming'],
      ml: ['Array', 'Hash Table', 'Graph', 'Dynamic Programming', 'Greedy', 'Math'],
      devops: ['Graph', 'Tree', 'Heap', 'Greedy', 'Design'],
      mobile: ['Array', 'String', 'Hash Table', 'Tree', 'Dynamic Programming', 'Greedy'],
      game: ['Array', 'Math', 'Graph', 'Dynamic Programming', 'Geometry']
    };

    const matchedKey = Object.keys(roleTopicsMap).find((key) => role.includes(key));
    const requiredTopics = matchedKey ? roleTopicsMap[matchedKey] : ['Array', 'String', 'Hash Table', 'Tree', 'Graph', 'Dynamic Programming'];

    const normalizedTopicWise = (topicWise || []).map((t) => ({
      topic: t.topic,
      solved: t.solved || 0,
      total: t.total || 0,
      ratio: t.total ? t.solved / t.total : 0
    }));

    const roleTopicCoverage = normalizedTopicWise
      .filter((t) => requiredTopics.includes(t.topic))
      .sort((a, b) => a.ratio - b.ratio || a.solved - b.solved)
      .map((t) => t.topic);

    const focusTopics = roleTopicCoverage.length
      ? roleTopicCoverage.slice(0, 4)
      : requiredTopics.slice(0, 4);

    return {
      requiredTopics,
      focusTopics
    };
  }

  async getRoleTopicRecommendationsFromAI(targetRole, topicWise, language = 'english') {
    try {
      const prompt = `You are a LeetCode coach. Given a target role and the user's topic coverage, return the topics they should prioritize.

Target role: ${targetRole || 'software developer'}
Topic coverage (topic, solved, total):
${(topicWise || []).map((t) => `- ${t.topic}: ${t.solved || 0}/${t.total || 0}`).join('\n') || 'No data'}

Respond in strict JSON:
{
  "requiredTopics": ["topic"],
  "focusTopics": ["topic"]
}

Rules:
- requiredTopics should be 6-10 core topics for the role.
- focusTopics should be 3-5 topics the user should focus on next, based on weakest coverage.
- Use common LeetCode topic names (Array, String, Hash Table, Two Pointers, Stack, Queue, Tree, Graph, Heap, Binary Search, Dynamic Programming, Greedy, Math, Backtracking, Design).

${language !== 'english' ? `Respond in ${language} but keep JSON keys in English.` : ''}`;

      const response = await this.chat({
        messages: [{ role: 'user', content: prompt }],
        context: { language }
      });

      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed?.requiredTopics?.length || !parsed?.focusTopics?.length) {
        return null;
      }

      return {
        requiredTopics: parsed.requiredTopics,
        focusTopics: parsed.focusTopics
      };
    } catch (error) {
      console.error('Failed to generate role topic recommendations:', error);
      return null;
    }
  }

  /**
   * Analyze GitHub profile
   */
  async analyzeGitHub({ stats, targetRole, language = 'english' }) {
    // Calculate Heuristic Score (0-100)
    const publicRepos = stats.stats?.publicRepos || 0;
    const totalStars = stats.stats?.totalStars || 0;
    const followers = stats.stats?.followers || 0;

    const heuristicScore = Math.round(
      Math.min(publicRepos / 2, 30) +
      Math.min(totalStars / 5, 40) +
      Math.min(followers / 10, 30)
    );

    // Prepare prompt with repo details
    const topRepos = (stats.topRepositories || []).slice(0, 5).map(r =>
      `- ${r.name}: ${r.description || 'No description'} (${r.language || 'Unknown'})`
    ).join('\n');

    const prompt = `Analyze this GitHub profile for a developer targeting ${targetRole || 'software developer'} role:

Stats:
- Public Repos: ${publicRepos}
- Total Stars: ${totalStars}
- Total Forks: ${stats.stats?.totalForks || 0}
- Followers: ${followers}

Top Repositories:
${topRepos}

Top Languages: ${(stats.languageBreakdown || []).map((l) => `${l.language} (${l.percentage}%)`).join(', ') || 'N/A'}

Compare the projects and languages with the requirements for the ${targetRole} role.
On a scale of 0-100, provide a "projectRelevanceScore".

Provide analysis in JSON format:
{
  "projectRelevanceScore": 85,
  "summary": "Brief summary",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "projectIdeas": [
    {"title": "Project name", "goal": "What it demonstrates", "tech": ["Tech 1", "Tech 2"], "impact": "Why it helps the role"}
  ],
  "actionPlan": [
    {"action": "Action item", "priority": "high/medium/low", "timeline": "1 week"}
  ]
}

${language !== 'english' ? `Respond in ${language}.` : ''}`;

    const response = await this.chat({
      messages: [{ role: 'user', content: prompt }],
      context: { language }
    });

    let aiData = {};
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiData = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse GitHub analysis:', e);
    }

    // Final Score: 40% Stats + 60% Project Relevance (AI)
    // If AI fails, fallback to pure heuristic but boosted
    const relevanceScore = aiData.projectRelevanceScore || heuristicScore;
    const finalScore = Math.round((heuristicScore * 0.4) + (relevanceScore * 0.6));

    return {
      score: finalScore, // Use the new weighted score
      summary: aiData.summary || 'Your GitHub profile shows ongoing project activity.',
      strengths: aiData.strengths || ['Active repositories'],
      weaknesses: aiData.weaknesses || ['Limited project visibility'],
      recommendations: aiData.recommendations || ['Add stronger READMEs'],
      projectIdeas: aiData.projectIdeas || [],
      actionPlan: aiData.actionPlan || []
    };
  }

  /**
   * Analyze Resume with ATS scoring
   */
  async analyzeResume({ resumeText, targetRole, language = 'english' }) {
    console.log('Analyzing resume for role:', targetRole);
    console.log('Resume text length:', resumeText.length);

    // Extract actual content from resume
    const analysis = this.parseResumeContent(resumeText, targetRole);

    // Get AI-powered insights
    const prompt = `Analyze this resume for a ${targetRole} position and provide detailed ATS feedback.
    
Compare the experience and projects in the resume against the requirements for ${targetRole}.
On a scale of 0-100, provide a "roleMatchScore".

Resume Content:
${resumeText.substring(0, 3000)}

Provide analysis in this exact JSON format:
{
  "roleMatchScore": 75,
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "recommendations": ["specific action 1", "specific action 2", "specific action 3"],
  "actionPlan": [
    {"action": "specific task", "priority": "high|medium|low", "timeline": "timeframe"}
  ]
}`;

    let aiInsights;
    let finalAtsScore = analysis.atsScore;

    try {
      const aiResponse = await this.generateText(prompt, 'resume-analysis', language);
      aiInsights = this.parseAIResumeInsights(aiResponse);

      // Update ATS Score: 50% Heuristic + 50% AI Role Match
      if (aiInsights.roleMatchScore) {
        finalAtsScore = Math.round((analysis.atsScore * 0.5) + (aiInsights.roleMatchScore * 0.5));
      }
    } catch (error) {
      console.error('AI insights generation failed:', error.message);
      // Fallback insights
      aiInsights = {
        summary: `Resume analyzed for ${targetRole} position. Score: ${analysis.atsScore}/100.`,
        strengths: analysis.sections.experience.score > 70 ? ['Relevant work experience documented'] : [],
        weaknesses: analysis.keywords.missing.length > 5 ? ['Missing key technical skills'] : [],
        recommendations: ['Add more quantifiable achievements', 'Include relevant keywords for ' + targetRole],
        actionPlan: [
          { action: 'Add missing keywords: ' + analysis.keywords.missing.slice(0, 3).join(', '), priority: 'high', timeline: '1-2 days' },
          { action: 'Quantify achievements with metrics', priority: 'medium', timeline: '3-5 days' }
        ]
      };
    }

    return {
      ...analysis,
      atsScore: finalAtsScore, // Return the updated score
      insights: aiInsights
    };
  }

  /**
   * Parse resume content and calculate scores
   */
  parseResumeContent(resumeText, targetRole) {
    const text = resumeText.toLowerCase();
    const lines = resumeText.split('\n').filter(line => line.trim());

    // Define role-specific keywords
    const roleKeywords = this.getRoleKeywords(targetRole);

    // Detect sections
    const sections = {
      contactInfo: this.analyzeContactInfo(resumeText),
      summary: this.analyzeSummary(resumeText),
      experience: this.analyzeExperience(resumeText),
      education: this.analyzeEducation(resumeText),
      skills: this.analyzeSkills(resumeText, roleKeywords),
      projects: this.analyzeProjects(resumeText)
    };

    // Find keywords
    const foundKeywords = roleKeywords.required.filter(kw => text.includes(kw.toLowerCase()));
    const missingKeywords = roleKeywords.required.filter(kw => !text.includes(kw.toLowerCase()));
    const recommendedKeywords = roleKeywords.recommended.filter(kw => !text.includes(kw.toLowerCase()));

    // Calculate formatting score
    const formatting = this.analyzeFormatting(resumeText, lines);

    // Collect all mistakes from sections and formatting
    const mistakes = this.collectMistakes(sections, formatting, missingKeywords, resumeText);

    // Calculate overall ATS score
    const sectionScores = Object.values(sections).map(s => s.score);
    const avgSectionScore = sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
    const keywordScore = (foundKeywords.length / roleKeywords.required.length) * 100;
    const atsScore = Math.round((avgSectionScore * 0.6) + (keywordScore * 0.25) + (formatting.score * 0.15));

    return {
      atsScore: Math.min(100, Math.max(0, atsScore)),
      sections,
      keywords: {
        found: foundKeywords,
        missing: missingKeywords.slice(0, 10),
        recommended: recommendedKeywords.slice(0, 5)
      },
      formatting,
      mistakes
    };
  }

  getRoleKeywords(targetRole) {
    const role = (targetRole || '').toLowerCase();
    const commonKeywords = ['teamwork', 'communication', 'problem solving', 'leadership'];

    if (role.includes('frontend') || role.includes('ui')) {
      return {
        required: ['html', 'css', 'javascript', 'react', 'responsive', 'ui', 'ux', ...commonKeywords],
        recommended: ['typescript', 'vue', 'angular', 'webpack', 'sass', 'tailwind']
      };
    }
    if (role.includes('backend') || role.includes('api')) {
      return {
        required: ['api', 'database', 'server', 'rest', 'sql', 'node', ...commonKeywords],
        recommended: ['microservices', 'docker', 'kubernetes', 'aws', 'redis', 'mongodb']
      };
    }
    if (role.includes('full')) {
      return {
        required: ['javascript', 'react', 'node', 'api', 'database', 'git', ...commonKeywords],
        recommended: ['typescript', 'docker', 'aws', 'ci/cd', 'agile', 'testing']
      };
    }
    if (role.includes('data') || role.includes('ml') || role.includes('ai')) {
      return {
        required: ['python', 'sql', 'machine learning', 'data', 'analysis', 'statistics', ...commonKeywords],
        recommended: ['tensorflow', 'pytorch', 'pandas', 'scikit', 'deep learning', 'nlp']
      };
    }
    if (role.includes('devops') || role.includes('cloud')) {
      return {
        required: ['docker', 'kubernetes', 'ci/cd', 'aws', 'linux', 'automation', ...commonKeywords],
        recommended: ['terraform', 'ansible', 'jenkins', 'prometheus', 'grafana']
      };
    }

    // Default software developer keywords
    return {
      required: ['programming', 'software', 'development', 'git', 'testing', 'agile', ...commonKeywords],
      recommended: ['java', 'python', 'javascript', 'c++', 'docker', 'aws']
    };
  }

  analyzeContactInfo(text) {
    const hasEmail = /@/.test(text);
    const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(text);
    const hasLinkedIn = /linkedin/.test(text.toLowerCase());
    const hasGitHub = /github/.test(text.toLowerCase());

    const score = (hasEmail ? 40 : 0) + (hasPhone ? 30 : 0) + (hasLinkedIn ? 15 : 0) + (hasGitHub ? 15 : 0);
    const missing = [];
    if (!hasEmail) missing.push('email');
    if (!hasPhone) missing.push('phone');
    if (!hasLinkedIn) missing.push('LinkedIn');
    if (!hasGitHub) missing.push('GitHub');

    return {
      score: Math.min(100, score),
      feedback: score >= 70 ? 'Contact information is complete.' : `Missing: ${missing.join(', ')}.`
    };
  }

  analyzeSummary(text) {
    const summaryMatch = text.match(/(summary|profile|about|objective)[\s\S]{0,500}/i);
    if (!summaryMatch) {
      return { score: 30, feedback: 'No professional summary found. Add one at the top of your resume.' };
    }

    const summaryText = summaryMatch[0];
    const hasMetrics = /\d+[%+]/.test(summaryText);
    const wordCount = summaryText.split(/\s+/).length;
    const isGoodLength = wordCount >= 30 && wordCount <= 100;

    let score = 50;
    if (isGoodLength) score += 30;
    if (hasMetrics) score += 20;

    return {
      score,
      feedback: score >= 80 ? 'Strong professional summary.' : 'Improve summary by adding quantifiable achievements and keeping it concise (50-80 words).'
    };
  }

  analyzeExperience(text) {
    const experienceMatch = text.match(/(experience|work history|employment)[\s\S]{0,2000}/i);
    if (!experienceMatch) {
      return { score: 40, feedback: 'No work experience section found.' };
    }

    const expText = experienceMatch[0];
    const bulletPoints = (expText.match(/[•●▪▸]/g) || []).length;
    const metrics = (expText.match(/\d+[%+]/g) || []).length;
    const actionVerbs = (expText.match(/\b(led|managed|developed|created|improved|increased|reduced|built|designed)\b/gi) || []).length;

    let score = 40;
    if (bulletPoints >= 5) score += 20;
    if (metrics >= 3) score += 20;
    if (actionVerbs >= 5) score += 20;

    return {
      score,
      feedback: score >= 75 ? 'Excellent work experience section with metrics.' : 'Add more bullet points with quantifiable achievements and strong action verbs.'
    };
  }

  analyzeEducation(text) {
    const eduMatch = text.match(/(education|academic|qualification|degree)[\s\S]{0,500}/i);
    if (!eduMatch) {
      return { score: 50, feedback: 'Education section not clearly identified.' };
    }

    const hasDegree = /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?tech|m\.?tech)/i.test(text);
    const hasGPA = /gpa|cgpa|\d\.\d+\/\d/.test(text.toLowerCase());

    let score = hasDegree ? 80 : 60;
    if (hasGPA) score += 10;

    return {
      score: Math.min(100, score),
      feedback: score >= 80 ? 'Education section is well formatted.' : 'Ensure degree and institution are clearly mentioned.'
    };
  }

  analyzeSkills(text, roleKeywords) {
    const skillsMatch = text.match(/(skills|technical skills|technologies|expertise)[\s\S]{0,800}/i);
    if (!skillsMatch) {
      return { score: 40, feedback: 'No dedicated skills section found.' };
    }

    const skillsText = skillsMatch[0].toLowerCase();
    const foundKeywords = roleKeywords.required.filter(kw => skillsText.includes(kw.toLowerCase()));
    const keywordRatio = foundKeywords.length / roleKeywords.required.length;

    const score = 40 + (keywordRatio * 60);

    return {
      score: Math.round(score),
      feedback: score >= 75 ? 'Strong technical skills section.' : `Add more relevant skills.Missing: ${roleKeywords.required.filter(kw => !skillsText.includes(kw.toLowerCase())).slice(0, 5).join(', ')}.`
    };
  }

  analyzeProjects(text) {
    const projectMatch = text.match(/(projects|portfolio|work samples)[\s\S]{0,1500}/i);
    if (!projectMatch) {
      return { score: 50, feedback: 'Consider adding a projects section to showcase your work.' };
    }

    const projText = projectMatch[0];
    const hasLinks = /(http|github|demo)/.test(projText.toLowerCase());
    const hasTech = /(built with|technologies|using|stack)/i.test(projText);
    const hasMetrics = /\d+[%+]/.test(projText);

    let score = 50;
    if (hasLinks) score += 20;
    if (hasTech) score += 15;
    if (hasMetrics) score += 15;

    return {
      score,
      feedback: score >= 80 ? 'Excellent projects section with details.' : 'Add project links, technologies used, and quantifiable outcomes.'
    };
  }

  analyzeFormatting(resumeText, lines) {
    const issues = [];
    let score = 100;

    // Check length
    if (lines.length < 30) {
      issues.push('Resume seems too short. Aim for 1-2 pages.');
      score -= 10;
    }
    if (lines.length > 200) {
      issues.push('Resume is too long. Keep it concise (1-2 pages).');
      score -= 15;
    }

    // Check for consistent formatting
    const hasBullets = /[•●▪▸]/.test(resumeText);
    if (!hasBullets) {
      issues.push('Use bullet points for better readability.');
      score -= 10;
    }

    // Check for dates
    const dateFormats = [
      /\d{4}[-\/]\d{2}[-\/]\d{2}/,
      /\d{2}[-\/]\d{4}/,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}/i
    ];
    const hasConsistentDates = dateFormats.some(format =>
      (resumeText.match(format) || []).length >= 2
    );
    if (!hasConsistentDates) {
      issues.push('Use consistent date formats throughout.');
      score -= 10;
    }

    // Check for sections
    const hasSections = /(experience|education|skills|projects)/gi.test(resumeText);
    if (!hasSections) {
      issues.push('Add clear section headings.');
      score -= 15;
    }

    return {
      score: Math.max(0, score),
      issues: issues.length > 0 ? issues : ['Resume formatting looks good!']
    };
  }

  collectMistakes(sections, formatting, missingKeywords, resumeText) {
    const mistakes = [];
    const text = resumeText.toLowerCase();

    // Contact info mistakes
    if (sections.contactInfo.score < 70) {
      const missing = [];
      if (!/@/.test(resumeText)) missing.push('email address');
      if (!/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(resumeText)) missing.push('phone number');
      if (!/linkedin/i.test(resumeText)) missing.push('LinkedIn profile');
      if (missing.length > 0) {
        mistakes.push({
          severity: 'high',
          category: 'Contact Information',
          issue: `Missing ${missing.join(', ')} `,
          fix: 'Add complete contact information at the top of your resume'
        });
      }
    }

    // Summary mistakes
    if (sections.summary.score < 60) {
      if (!/(summary|profile|about|objective)/i.test(resumeText)) {
        mistakes.push({
          severity: 'high',
          category: 'Professional Summary',
          issue: 'No professional summary section found',
          fix: 'Add a 3-4 sentence summary at the top highlighting your key skills and achievements'
        });
      } else {
        const summaryMatch = resumeText.match(/(summary|profile|about|objective)[\s\S]{0,500}/i);
        if (summaryMatch) {
          const wordCount = summaryMatch[0].split(/\s+/).length;
          if (wordCount < 30) {
            mistakes.push({
              severity: 'medium',
              category: 'Professional Summary',
              issue: 'Summary is too short (less than 30 words)',
              fix: 'Expand your summary to 50-80 words with specific achievements'
            });
          }
          if (!/\d+[%+]/.test(summaryMatch[0])) {
            mistakes.push({
              severity: 'medium',
              category: 'Professional Summary',
              issue: 'Summary lacks quantifiable achievements',
              fix: 'Add metrics (e.g., "increased sales by 30%", "managed team of 5")'
            });
          }
        }
      }
    }

    // Experience mistakes
    if (sections.experience.score < 70) {
      const expMatch = resumeText.match(/(experience|work history|employment)[\s\S]{0,2000}/i);
      if (!expMatch) {
        mistakes.push({
          severity: 'high',
          category: 'Work Experience',
          issue: 'No work experience section found',
          fix: 'Add a work experience section with your roles and achievements'
        });
      } else {
        const expText = expMatch[0];
        const bulletPoints = (expText.match(/[•●■▸]/g) || []).length;
        const metrics = (expText.match(/\d+[%+]/g) || []).length;

        if (bulletPoints < 3) {
          mistakes.push({
            severity: 'medium',
            category: 'Work Experience',
            issue: 'Too few bullet points in experience section',
            fix: 'Use 3-5 bullet points per role to describe your responsibilities and achievements'
          });
        }
        if (metrics < 2) {
          mistakes.push({
            severity: 'high',
            category: 'Work Experience',
            issue: 'Lacks quantifiable achievements (no metrics found)',
            fix: 'Add numbers: "Improved performance by 40%", "Led team of 8", "Reduced costs by $50K"'
          });
        }
        if (!/\b(led|managed|developed|created|improved|increased|reduced|built|designed|implemented)\b/i.test(expText)) {
          mistakes.push({
            severity: 'medium',
            category: 'Work Experience',
            issue: 'Weak or missing action verbs',
            fix: 'Start bullet points with strong action verbs: Led, Developed, Implemented, Achieved'
          });
        }
      }
    }

    // Skills mistakes
    if (sections.skills.score < 60) {
      mistakes.push({
        severity: 'high',
        category: 'Skills',
        issue: `Missing ${Math.min(5, missingKeywords.length)} critical keywords for the role`,
        fix: `Add these skills: ${missingKeywords.slice(0, 5).join(', ')} `
      });
    }

    // Formatting mistakes
    if (formatting.score < 70) {
      formatting.issues.forEach(issue => {
        let severity = 'low';
        let fix = issue;

        if (issue.includes('too short')) {
          severity = 'medium';
          fix = 'Expand your resume with more details about achievements and skills (aim for 1-2 pages)';
        } else if (issue.includes('too long')) {
          severity = 'medium';
          fix = 'Reduce content to 1-2 pages by removing outdated or less relevant information';
        } else if (issue.includes('bullet points')) {
          severity = 'medium';
          fix = 'Use bullet points (•) for all lists and achievements instead of paragraphs';
        } else if (issue.includes('date')) {
          severity = 'low';
          fix = 'Use consistent date format throughout (e.g., "Jan 2020 - Dec 2022")';
        } else if (issue.includes('section headings')) {
          severity = 'high';
          fix = 'Add clear section headings: EXPERIENCE, EDUCATION, SKILLS, PROJECTS';
        }

        mistakes.push({
          severity,
          category: 'Formatting',
          issue: issue.replace(/\.$/, ''),
          fix
        });
      });
    }

    // Grammar and spelling checks (basic)
    const commonMistakes = [
      { pattern: /\bi\s/gi, issue: 'Use of "I" in resume', fix: 'Remove "I", "me", "my" - use bullet points without personal pronouns' },
      { pattern: /\bresume\b/gi, issue: 'Word "resume" found in resume content', fix: 'Remove the word "resume" from your resume body' },
      { pattern: /\breferences available/i, issue: 'Unnecessary "References available" text', fix: 'Remove "References available upon request" - it\'s implied' },
      { pattern: /\bresponsibilities included\b/i, issue: 'Passive language: "Responsibilities included"', fix: 'Use active voice: "Managed", "Led", "Developed" instead' }
    ];

    commonMistakes.forEach(({ pattern, issue, fix }) => {
      if (pattern.test(resumeText)) {
        mistakes.push({
          severity: 'low',
          category: 'Content Quality',
          issue,
          fix
        });
      }
    });

    // Sort by severity
    const severityOrder = { high: 1, medium: 2, low: 3 };
    mistakes.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return mistakes;
  }

  parseAIResumeInsights(aiResponse) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Failed to parse AI insights:', error.message);
    }

    // Fallback parsing
    return {
      summary: aiResponse.substring(0, 200) || 'Resume analyzed successfully.',
      strengths: ['Professional formatting'],
      weaknesses: ['Could add more details'],
      recommendations: ['Add quantifiable achievements', 'Include relevant keywords'],
      actionPlan: [
        { action: 'Update skills section', priority: 'high', timeline: '1 day' }
      ]
    };
  }

  /**
   * Generate study plan suggestions
   */
  async generateStudyPlan({ user, currentRoadmap, progress, language = 'english' }) {
    return {
      suggestions: [
        'Start with the most challenging topics when you\'re fresh',
        'Take short breaks every 25-30 minutes',
        'Review completed topics briefly before starting new ones'
      ],
      motivationalMessage: `You're making great progress! Keep up the momentum.`,
      focusAreas: ['Complete pending topics first', 'Review weak areas']
    };
  }

  /**
   * Get mock response for development
   */
  getMockResponse(messages, context) {
    const lastMessage = messages[messages.length - 1];
    const systemMessage = messages.find((message) => message.role === 'system');
    const systemText = systemMessage?.content || '';
    const isInterviewer = /interviewer|mock interview|interview/i.test(systemText);

    if (isInterviewer) {
      const roleHint = systemText.match(/for the\s+(.+?)\s+position/i)?.[1] || 'software engineer';
      const roleKey = roleHint.toLowerCase();
      // Extract interview type from "Topics requested: behavioral" etc.
      const topicsMatch = systemText.match(/Topics requested:\s*(.+)/i);
      const requestedTopics = topicsMatch ? topicsMatch[1].toLowerCase() : '';

      const pools = {
        behavioral: [
          { type: 'Behavioral', text: 'Tell me about a time you had a conflict with a team member. How did you resolve it?' },
          { type: 'Behavioral', text: 'Describe a situation where you had to meet a tight deadline. How did you prioritize?' },
          { type: 'Behavioral', text: 'Give an example of a goal you didn\'t meet and how you handled it.' },
          { type: 'Behavioral', text: 'Tell me about a time you took initiative on a project.' },
          { type: 'Behavioral', text: 'Describe a complex problem you solved and how you explained it to non-technical stakeholders.' },
          { type: 'Behavioral', text: 'What is your greatest professional achievement?' },
          { type: 'Behavioral', text: 'How do you handle constructive criticism?' }
        ],
        hr: [
          { type: 'HR', text: 'Why do you want to work for this company?' },
          { type: 'HR', text: 'Where do you see yourself in 5 years?' },
          { type: 'HR', text: 'What are your salary expectations?' },
          { type: 'HR', text: 'Why are you looking to leave your current role?' },
          { type: 'HR', text: 'What motivates you in your career?' },
          { type: 'HR', text: 'Do you have any questions for us?' }
        ],
        'system-design': [
          { type: 'System Design', text: 'Design a URL shortening service like Bit.ly.' },
          { type: 'System Design', text: 'Design a chat application like WhatsApp.' },
          { type: 'System Design', text: 'Design a rate limiter.' },
          { type: 'System Design', text: 'How would you design a notification system?' },
          { type: 'System Design', text: 'Design a scalable e-commerce backend.' },
          { type: 'System Design', text: 'Explain the trade-offs between SQL and NoSQL.' },
          { type: 'System Design', text: 'How do you handle data consistency in a distributed system?' }
        ],
        technical: {
          frontend: [
            { type: 'MCQ', text: 'Which React hook is used to manage local component state?\nA) useState\nB) useMemo\nC) useRef\nD) useCallback' },
            { type: 'Coding', text: 'Write a function that debounces an input handler.' },
            { type: 'Technical', text: 'Explain the Virtual DOM and reconciliation.' },
            { type: 'Scenario', text: 'A user reports that the site is slow. How do you debug performance?' },
            { type: 'Technical', text: 'What is the difference between specificty in CSS?' }
          ],
          backend: [
            { type: 'MCQ', text: 'Which HTTP status code signifies "Created"?\nA) 200\nB) 201\nC) 204\nD) 401' },
            { type: 'Coding', text: 'Implement a middleware to log request duration.' },
            { type: 'Technical', text: 'Explain the difference between horizontal and vertical scaling.' },
            { type: 'Scenario', text: 'Your database CPU is at 100%. What are your first steps?' },
            { type: 'Technical', text: 'What are the pros and cons of microservices?' }
          ],
          data: [
            { type: 'MCQ', text: 'Which metric is sensitive to outliers?\nA) Median\nB) Mean\nC) Mode\nD) IQR' },
            { type: 'Coding', text: 'Write a query to find duplicates in a SQL table.' },
            { type: 'Technical', text: 'Explain the difference between bagging and boosting.' },
            { type: 'Scenario', text: 'Your model performs well on training data but fails in production. Why?' }
          ],
          devops: [
            { type: 'MCQ', text: 'Which command lists running Docker containers?\nA) docker images\nB) docker run\nC) docker ps\nD) docker list' },
            { type: 'Coding', text: 'Write a Dockerfile for a Node.js application.' },
            { type: 'Technical', text: 'Explain the concept of Infrastructure as Code.' },
            { type: 'Scenario', text: 'A deployment failed and brought down the site. How do you recover?' }
          ],
          security: [
            { type: 'MCQ', text: 'What does CSRF stand for?\nA) Cross-Site Request Forgery\nB) Cascading Style Sheet Resource File\nC) Client Side Request Fraud' },
            { type: 'Coding', text: 'How do you securely store passwords in a database?' },
            { type: 'Technical', text: 'Explain the principle of least privilege.' }
          ]
        }
      };

      const getPool = () => {
        if (requestedTopics.includes('behavioral')) return pools.behavioral;
        if (requestedTopics.includes('hr')) return pools.hr;
        if (requestedTopics.includes('system') || requestedTopics.includes('design')) return pools['system-design'];

        // Default to Technical based on Role
        const techPools = pools.technical;
        if (roleKey.includes('front') || roleKey.includes('react') || roleKey.includes('web')) return techPools.frontend;
        if (roleKey.includes('back') || roleKey.includes('node') || roleKey.includes('api')) return techPools.backend;
        if (roleKey.includes('data') || roleKey.includes('ai') || roleKey.includes('ml')) return techPools.data;
        if (roleKey.includes('devops') || roleKey.includes('cloud')) return techPools.devops;
        if (roleKey.includes('security')) return techPools.security;

        // Fallback generic technical
        return techPools.backend.concat(techPools.frontend);
      };

      const questionPool = getPool();

      const pickQuestion = () => {
        // Filter out questions that have ANY similarity to previous assistant messages
        const unused = questionPool.filter((question) => {
          return !messages.some((msg) =>
            msg.role === 'assistant' && msg.content.includes(question.text)
          );
        });

        if (unused.length === 0) {
          return "Reference Check: I have asked all prepared questions for this section. Do you have any specific topics you want to discuss?";
        }

        const index = Math.floor(Math.random() * unused.length);
        const question = unused[index];
        return `${question.type} Question: ${question.text}`;
      };

      if (lastMessage?.role === 'user') {
        const isFinalEval = /final evaluation|interview performance|provide feedback/i.test(lastMessage.content || '');
        if (isFinalEval) {
          return {
            content: `Final Evaluation

Summary:
You attempted the interview, but several answers lacked technical depth and clear structure. Focus on explaining your reasoning and backing claims with examples.

Strengths:
- Calm tone and willingness to answer

Areas to Improve:
- Provide clearer step-by-step reasoning
- Use concrete examples and trade-offs
- Review core concepts related to the role

Scores:
Communication: 45
Technical: 40
Problem Solving: 42
Overall: 42`,
            tokensUsed: 160,
            model: 'mock-interviewer'
          };
        }

        return {
          content: `Thanks for your answer. Here's a quick tip: structure your response with clarity and examples.

Next question: ${pickQuestion()}`,
          tokensUsed: 120,
          model: 'mock-interviewer'
        };
      }

      return {
        content: `Hi! I'm your AI interviewer. Let's begin.

Question 1: ${pickQuestion()}`,
        tokensUsed: 120,
        model: 'mock-interviewer'
      };
    }

    let response = 'I understand your question. ';

    if (context.language === 'tamil') {
      response = 'நான் உங்கள் கேள்வியைப் புரிந்துகொள்கிறேன். ';
    } else if (context.language === 'hindi') {
      response = 'मैं आपके प्रश्न को समझता हूं। ';
    }

    response += 'This is a sample response from the AI service. In production, this would be replaced with actual Gemini, Groq, or Perplexity API responses.';

    return {
      content: response,
      tokensUsed: 100,
      model: 'mock-model'
    };
  }

  /**
   * Get mock questions
   */
  getMockQuestions(count, topicTitle) {
    const questions = [];
    for (let i = 0; i < count; i++) {
      questions.push({
        questionText: `Question ${i + 1} about ${topicTitle}?`,
        questionType: 'multiple-choice',
        options: [
          { text: `Option A for Q${i + 1}`, isCorrect: i === 0 },
          { text: `Option B for Q${i + 1}`, isCorrect: i === 1 },
          { text: `Option C for Q${i + 1}`, isCorrect: i === 2 },
          { text: `Option D for Q${i + 1}`, isCorrect: i === 3 }
        ],
        correctAnswer: `Option ${String.fromCharCode(65 + (i % 4))} for Q${i + 1}`
      });
    }
    return questions;
  }
}

module.exports = new AIService();
