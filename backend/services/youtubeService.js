/**
 * SkillForge AI - YouTube Service
 * YouTube video search using direct scraping (no API key required)
 * With relevance scoring, popularity ranking, and skill level filtering
 */

const axios = require('axios');

class YouTubeService {
  constructor() {
    this.baseSearchUrl = 'https://www.youtube.com/results';
  }

  /**
   * Get language-specific search terms to find native language content
   */
  getLanguageConfig(language) {
    const config = {
      english: {
        suffix: '',
        indicators: [],
        acceptLanguage: 'en-US,en;q=0.9'
      },
      tamil: {
        suffix: 'in tamil தமிழ்',
        indicators: ['tamil', 'தமிழ்', 'தமிழில்', 'in tamil'],
        acceptLanguage: 'ta-IN,ta;q=0.9,en;q=0.8'
      },
      hindi: {
        suffix: 'in hindi हिंदी',
        indicators: ['hindi', 'हिंदी', 'हिन्दी', 'in hindi'],
        acceptLanguage: 'hi-IN,hi;q=0.9,en;q=0.8'
      }
    };
    return config[language?.toLowerCase()] || config.english;
  }

  /**
   * Check if video appears to be in the selected language
   */
  isVideoInLanguage(video, language) {
    const titleAndChannel = (video.title + ' ' + video.channelTitle).toLowerCase();

    if (language === 'english') {
      // For English, exclude videos that have Tamil/Hindi indicators
      const nonEnglishIndicators = ['tamil', 'தமிழ்', 'hindi', 'हिंदी', 'हिन्दी', 'தமிழில்'];
      return !nonEnglishIndicators.some(ind => titleAndChannel.includes(ind.toLowerCase()));
    }

    // For Tamil/Hindi, check if language indicators appear in title or channel
    const config = this.getLanguageConfig(language);
    return config.indicators.some(ind => titleAndChannel.includes(ind.toLowerCase()));
  }

  /**
   * Get skill level search terms
   */
  getSkillLevelTerms(skillLevel) {
    const terms = {
      beginner: ['tutorial', 'beginners', 'basics', 'introduction', 'crash course', 'learn'],
      intermediate: ['tutorial', 'complete guide', 'deep dive', 'practical', 'hands-on', 'full course'],
      advanced: ['advanced', 'in-depth', 'master', 'professional', 'expert', 'deep dive']
    };
    return terms[skillLevel?.toLowerCase()] || terms.beginner;
  }

  /**
   * Parse duration string to minutes
   */
  parseDurationToMinutes(durationStr) {
    if (!durationStr) return 30;

    if (durationStr.includes(':')) {
      const parts = durationStr.split(':').map(p => parseInt(p) || 0);
      if (parts.length === 2) {
        return parts[0] + Math.round(parts[1] / 60);
      } else if (parts.length === 3) {
        return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
      }
    }

    const hourMatch = durationStr.match(/(\d+)\s*(?:hour|hr)/i);
    const minMatch = durationStr.match(/(\d+)\s*(?:min|minute)/i);

    let minutes = 0;
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);

    return minutes || 30;
  }

  /**
   * Parse view count string to number
   */
  parseViewCount(viewCountText) {
    if (!viewCountText) return 0;

    const text = viewCountText.toLowerCase().replace(/,/g, '');

    // Handle "1.5M views", "500K views", etc.
    const millionMatch = text.match(/([\d.]+)\s*m/);
    if (millionMatch) return Math.round(parseFloat(millionMatch[1]) * 1000000);

    const thousandMatch = text.match(/([\d.]+)\s*k/);
    if (thousandMatch) return Math.round(parseFloat(thousandMatch[1]) * 1000);

    // Handle plain numbers
    const numMatch = text.match(/(\d+)/);
    return numMatch ? parseInt(numMatch[1]) : 0;
  }

  /**
   * Extract video data from YouTube search results HTML
   */
  extractVideosFromHtml(html) {
    const videos = [];

    try {
      const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s);
      if (!dataMatch) {
        const altMatch = html.match(/ytInitialData["\s]*[:=]\s*({.*?});/s);
        if (!altMatch) return videos;
        return this.parseYtInitialData(altMatch[1]);
      }
      return this.parseYtInitialData(dataMatch[1]);
    } catch (error) {
      console.error('Failed to parse YouTube HTML:', error.message);
      return videos;
    }
  }

  /**
   * Parse ytInitialData JSON to extract video info
   */
  parseYtInitialData(jsonStr) {
    const videos = [];

    try {
      const data = JSON.parse(jsonStr);
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];

        for (const item of items) {
          const videoRenderer = item?.videoRenderer;
          if (!videoRenderer) continue;

          const videoId = videoRenderer.videoId;
          if (!videoId) continue;

          const durationText = videoRenderer.lengthText?.simpleText ||
            videoRenderer.lengthText?.accessibility?.accessibilityData?.label || '';

          const viewCountText = videoRenderer.viewCountText?.simpleText || '';
          const viewCount = this.parseViewCount(viewCountText);

          const title = videoRenderer.title?.runs?.[0]?.text ||
            videoRenderer.title?.simpleText || '';

          const descriptionSnippet = videoRenderer.detailedMetadataSnippets?.[0]?.snippetText?.runs
            ?.map(r => r.text).join('') ||
            videoRenderer.descriptionSnippet?.runs?.map(r => r.text).join('') || '';

          const channelTitle = videoRenderer.ownerText?.runs?.[0]?.text || '';

          const thumbnails = videoRenderer.thumbnail?.thumbnails || [];
          const thumbnail = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url || '';

          videos.push({
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title,
            description: descriptionSnippet,
            thumbnail,
            channelTitle,
            duration: this.parseDurationToMinutes(durationText),
            durationText,
            viewCount,
            viewCountText
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse ytInitialData:', error.message);
    }

    return videos;
  }

  /**
   * Search YouTube for videos in a specific language
   */
  async searchVideos(query, language = 'english', skillLevel = 'beginner', maxResults = 20) {
    const skillTerms = this.getSkillLevelTerms(skillLevel);
    const langConfig = this.getLanguageConfig(language);

    // Build search query with language-specific suffix
    const searchQuery = [
      query,
      skillTerms[0],
      langConfig.suffix
    ].filter(Boolean).join(' ');

    try {
      const response = await axios.get(this.baseSearchUrl, {
        params: {
          search_query: searchQuery,
          sp: 'CAMSAhAB' // Sort by view count + videos only
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': langConfig.acceptLanguage
        },
        timeout: 15000
      });

      let videos = this.extractVideosFromHtml(response.data);

      // Filter by duration based on skill level
      videos = videos.filter(video => {
        const minDuration = 3;
        const maxDuration = skillLevel === 'beginner' ? 90 : skillLevel === 'intermediate' ? 150 : 240;
        return video.duration >= minDuration && video.duration <= maxDuration;
      });

      // Filter to only include videos that appear to be in the selected language
      if (language !== 'english') {
        videos = videos.filter(video => this.isVideoInLanguage(video, language));
      }

      // Sort by view count (popularity)
      videos.sort((a, b) => b.viewCount - a.viewCount);

      return videos.slice(0, maxResults);
    } catch (error) {
      console.error('YouTube search failed:', error.message);
      throw new Error('Failed to search YouTube. Please try again.');
    }
  }

  /**
   * Calculate relevance between topic and video
   * Now more lenient and considers popularity
   */
  calculateRelevance(topicTitle, videoTitle, videoDescription, viewCount) {
    const normalize = (text) => {
      return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
    };

    const topicWords = normalize(topicTitle);
    const videoWords = normalize(videoTitle + ' ' + (videoDescription || ''));
    const videoTitleLower = videoTitle.toLowerCase();

    if (topicWords.length === 0) return 70;

    // Count how many topic words appear in video
    let matchCount = 0;
    let exactMatchBonus = 0;

    topicWords.forEach(word => {
      if (videoTitleLower.includes(word)) {
        matchCount += 2; // Double weight for title matches
        exactMatchBonus += 5;
      } else if (videoWords.includes(word)) {
        matchCount += 1;
      }
    });

    // Base relevance score (percentage of topic words found)
    const matchPercentage = Math.min(100, (matchCount / topicWords.length) * 50);

    // Popularity bonus (more views = more trustworthy/professional)
    let popularityBonus = 0;
    if (viewCount >= 1000000) popularityBonus = 20; // 1M+ views
    else if (viewCount >= 500000) popularityBonus = 15;
    else if (viewCount >= 100000) popularityBonus = 10;
    else if (viewCount >= 50000) popularityBonus = 7;
    else if (viewCount >= 10000) popularityBonus = 5;
    else if (viewCount >= 1000) popularityBonus = 2;

    // Educational content bonus
    let educationalBonus = 0;
    const eduKeywords = ['tutorial', 'course', 'learn', 'guide', 'explained', 'how to', 'introduction', 'crash course', 'full course'];
    if (eduKeywords.some(kw => videoTitleLower.includes(kw))) {
      educationalBonus = 10;
    }

    const totalScore = Math.min(100, matchPercentage + exactMatchBonus + popularityBonus + educationalBonus);

    return Math.round(totalScore);
  }

  /**
   * Search videos with relevance scoring
   * More lenient matching and prioritizes popular educational content
   */
  async searchWithRelevance(topicTitle, language = 'english', skillLevel = 'beginner', minRelevance = 50) {
    if (!topicTitle || topicTitle.length < 3) {
      throw new Error('Topic title must be at least 3 characters');
    }

    // Lower the minimum relevance threshold to be more lenient
    const effectiveMinRelevance = Math.min(minRelevance, 50);

    const videos = await this.searchVideos(topicTitle, language, skillLevel, 20);

    if (!videos.length) {
      return [];
    }

    // Calculate relevance for each video
    const videosWithRelevance = videos.map(video => {
      const relevance = this.calculateRelevance(
        topicTitle,
        video.title,
        video.description,
        video.viewCount
      );
      return { ...video, relevance };
    });

    // Filter and sort - prioritize relevance, then view count
    return videosWithRelevance
      .filter(video => video.relevance >= effectiveMinRelevance)
      .sort((a, b) => {
        // First by relevance (descending)
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        // Then by view count (descending)
        return b.viewCount - a.viewCount;
      });
  }

  /**
   * Generate topic content from video info
   */
  async generateTopicContent(topicTitle, video, skillLevel) {
    try {
      const aiService = require('./aiService');

      const prompt = `Generate educational content for a ${skillLevel || 'beginner'} level learning topic.

Topic Title: "${topicTitle}"
Video Title: "${video.title}"
Video Duration: ${video.duration} minutes
Video Description: "${video.description?.substring(0, 400) || 'No description'}"

Generate a JSON response with:
{
  "description": "A 1-2 sentence description of what this topic covers (appropriate for ${skillLevel} level)",
  "documentation": "Markdown documentation (150-250 words) including:\\n# ${topicTitle}\\n\\n## Overview\\n...\\n\\n## Key Concepts\\n- ...\\n\\n## Learning Objectives\\n- ...",
  "estimatedDuration": ${video.duration || 30}
}

Respond with ONLY valid JSON.`;

      const response = await aiService.chat({
        messages: [{ role: 'user', content: prompt }],
        context: { type: 'content_generation' }
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.log('AI content generation unavailable');
    }

    return {
      description: `Learn ${topicTitle} through this comprehensive ${skillLevel || 'beginner'} level video tutorial.`,
      documentation: `# ${topicTitle}\n\n## Overview\n\nThis ${skillLevel || 'beginner'} level topic covers the fundamentals of ${topicTitle}.\n\n## Key Concepts\n\n- Understanding ${topicTitle}\n- Practical applications\n- Best practices\n\n## Learning Objectives\n\nBy the end of this topic, you will be able to:\n- Understand the core concepts of ${topicTitle}\n- Apply the knowledge in real-world scenarios`,
      estimatedDuration: video.duration || 30
    };
  }

  /**
   * Always configured (no API key needed)
   */
  isConfigured() {
    return true;
  }
}

module.exports = new YouTubeService();
