/*
 * Check AI fallback response (mock) is working
 * Usage: node scripts/checkFallback.js
 */

const AIService = require('../services/aiService');

async function run() {
  // Force fallback by clearing provider keys
  process.env.GEMINI_API_KEYS = '';
  process.env.GROQ_API_KEYS = '';
  process.env.PERPLEXITY_API_KEYS = '';

  const response = await AIService.chat({
    messages: [
      { role: 'user', content: 'Test fallback response' }
    ],
    context: { feature: 'fallback-check' }
  });

  if (!response || !response.content) {
    console.error('Fallback check failed: no response content');
    process.exit(1);
  }

  console.log('Fallback check passed');
  console.log('Response preview:', response.content.slice(0, 200));
}

run().catch((error) => {
  console.error('Fallback check error:', error.message);
  process.exit(1);
});
