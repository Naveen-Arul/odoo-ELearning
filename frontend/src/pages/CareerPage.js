/**
 * SkillForge AI - Career Page
 * LeetCode, GitHub, and Resume analysis
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCode, HiDocumentText, HiChartBar, HiUpload,
  HiRefresh, HiExternalLink, HiCheckCircle, HiExclamationCircle
} from 'react-icons/hi';
import { careerAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

export default function CareerPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyses, setAnalyses] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(null);

  useEffect(() => {
    fetchAnalyses();
  }, [user?.careerData, user?.preferences?.targetRole]); // Refresh when career data or target role changes

  const fetchAnalyses = async () => {
    try {
      setLoading(true);
      const [analysesResponse, scoreResponse] = await Promise.all([
        careerAPI.getAllAnalyses(),
        careerAPI.getReadinessScore()
      ]);
      setAnalyses(analysesResponse.data.data);
      setReadinessScore(scoreResponse.data.data.readinessScore);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const careerRes = await userAPI.getCareerData();
      const careerData = careerRes?.data?.data || {};

      const tasks = [];

      if (careerData.leetcodeUsername) {
        tasks.push(careerAPI.analyzeLeetCode({ forceRefresh: true }));
      }

      if (careerData.githubUsername) {
        tasks.push(careerAPI.analyzeGitHub({ forceRefresh: true }));
      }

      // Re-analyze resume if one exists on the server
      tasks.push(careerAPI.reanalyzeResume().catch(() => null));

      await Promise.allSettled(tasks);
      await fetchAnalyses();
    } catch (error) {
      toast.error('Failed to refresh career analyses');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: HiChartBar },
    { id: 'leetcode', label: 'LeetCode', icon: HiCode },
    { id: 'github', label: 'GitHub', icon: HiCode },
    { id: 'resume', label: 'Resume', icon: HiDocumentText }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Career Tools</h1>
          <p className="text-muted-foreground mt-1">
            Analyze your skills and improve your career profile
          </p>
        </div>
        <motion.button
          onClick={handleRefresh}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title="Refresh analyses"
        >
          <HiRefresh className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
              ? 'bg-primary text-primary-foreground font-semibold'
              : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <OverviewTab analyses={analyses} readinessScore={readinessScore} onRefresh={fetchAnalyses} />
          )}
          {activeTab === 'leetcode' && (
            <LeetCodeTab
              analysis={analyses?.leetcode}
              onRefresh={fetchAnalyses}
              analyzing={analyzing}
              setAnalyzing={setAnalyzing}
              setAnalyses={setAnalyses}
            />
          )}
          {activeTab === 'github' && (
            <GitHubTab
              analysis={analyses?.github}
              onRefresh={fetchAnalyses}
              analyzing={analyzing}
              setAnalyzing={setAnalyzing}
              setAnalyses={setAnalyses}
            />
          )}
          {activeTab === 'resume' && (
            <ResumeTab
              analysis={analyses?.resume}
              onRefresh={fetchAnalyses}
              analyzing={analyzing}
              setAnalyzing={setAnalyzing}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ analyses, readinessScore, onRefresh }) {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get GitHub stats safely
  const githubStats = analyses?.github?.github?.stats || analyses?.github?.stats || {};
  const githubRepos = analyses?.github?.github?.topRepositories || analyses?.github?.topRepositories || [];
  const publicRepos = githubStats.publicRepos || 0;

  // Calculate scores from actual analysis data - handle both nested structures
  const leetcodeScoreRaw = analyses?.leetcode?.aiInsights?.score ?? 0;
  // Boost Problem Solving score (Curve: 1.2x + 10)
  const leetcodeScore = leetcodeScoreRaw > 0 ? Math.min(Math.round(leetcodeScoreRaw * 1.2 + 10), 100) : 0;

  // Calculate GitHub score: Max of (AI Alignment Score) and (Repo Count Baseline)
  // This ensures high scorers on project relevance get credit, while maintaining the "points per repo" safety net
  const githubBackendScore = analyses?.github?.aiInsights?.score ?? 0;
  const githubBaseline = publicRepos > 0 ? Math.min((publicRepos * 15) + 40, 100) : 0;
  const githubScore = Math.max(githubBackendScore, githubBaseline);

  const resumeScore = analyses?.resume?.resume?.atsScore ?? 0;

  // Count of analyses completed
  const completedCount = [
    analyses?.leetcode,
    analyses?.github,
    analyses?.resume
  ].filter(Boolean).length;

  // Get target role for weighted scoring
  const targetRole = user?.preferences?.targetRole?.name || '';
  const roleCategory = targetRole.toLowerCase();

  // Define role-based weights (LeetCode, GitHub, Resume)
  const getRoleWeights = () => {
    // Algorithm-heavy roles (emphasis on problem solving)
    if (roleCategory.includes('algorithm') || roleCategory.includes('competitive') ||
      roleCategory.includes('sde') || roleCategory.includes('software engineer')) {
      return { leetcode: 0.45, github: 0.35, resume: 0.20 };
    }
    // Backend/System roles (balanced coding and projects)
    if (roleCategory.includes('backend') || roleCategory.includes('system') ||
      roleCategory.includes('devops') || roleCategory.includes('cloud')) {
      return { leetcode: 0.30, github: 0.45, resume: 0.25 };
    }
    // Frontend/UI roles (projects and portfolio focused)
    if (roleCategory.includes('frontend') || roleCategory.includes('ui') ||
      roleCategory.includes('web') || roleCategory.includes('mobile')) {
      return { leetcode: 0.20, github: 0.50, resume: 0.30 };
    }
    // Data/ML roles (problem solving + projects)
    if (roleCategory.includes('data') || roleCategory.includes('ml') ||
      roleCategory.includes('ai') || roleCategory.includes('scientist')) {
      return { leetcode: 0.35, github: 0.40, resume: 0.25 };
    }
    // Full Stack (balanced across all)
    if (roleCategory.includes('full stack') || roleCategory.includes('fullstack')) {
      return { leetcode: 0.33, github: 0.37, resume: 0.30 };
    }
    // Default balanced weights
    return { leetcode: 0.33, github: 0.34, resume: 0.33 };
  };

  const weights = getRoleWeights();

  // Calculate weighted overall score based on updated scores
  const overallScore = completedCount > 0
    ? Math.round(
      (analyses?.leetcode ? leetcodeScore * weights.leetcode : 0) +
      (analyses?.github ? githubScore * weights.github : 0) +
      (analyses?.resume ? resumeScore * weights.resume : 0)
    ) / (
      (analyses?.leetcode ? weights.leetcode : 0) +
      (analyses?.github ? weights.github : 0) +
      (analyses?.resume ? weights.resume : 0)
    )
    : 0;

  // Get LeetCode stats safely
  const leetcodeStats = analyses?.leetcode?.leetcode?.stats || analyses?.leetcode?.stats || {};

  // Get Resume sections safely
  const resumeSections = analyses?.resume?.resume?.sections || {};

  const radarData = {
    labels: ['Problem Solving', 'Coding Skills', 'Project Experience', 'Documentation', 'Resume Quality', 'Communication'],
    datasets: [{
      label: 'Your Skills',
      data: [
        leetcodeScore || 0,
        githubScore || 0,
        Math.min((publicRepos * 15), 100), // Boosted Project Experience logic
        Math.min((githubRepos.length || 0) * 20, 100),
        resumeScore || 0,
        (resumeSections.experience?.score || 0)
      ],
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
      pointBackgroundColor: 'rgba(99, 102, 241, 1)',
    }]
  };

  // Check if we have any analyses at all
  const hasAnyAnalysis = analyses && (analyses.leetcode || analyses.github || analyses.resume);

  return (
    <div className="space-y-6">
      {/* Instructions when no analyses exist yet */}
      {!hasAnyAnalysis && (
        <div className="card p-6 bg-primary-500/10 border border-primary-500/30">
          <div className="flex items-start gap-3">
            <HiExclamationCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Get Started with Career Analysis</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Start analyzing your profiles to get personalized insights and career recommendations.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-primary-400 rounded-full" />
                  <span>Visit the <span className="text-primary font-medium">LeetCode</span> tab and enter your username</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-primary-400 rounded-full" />
                  <span>Visit the <span className="text-primary font-medium">GitHub</span> tab and enter your username</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-2 h-2 bg-primary-400 rounded-full" />
                  <span>Click <span className="text-accent-400 font-medium">Analyze</span> on each tab to get your score</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions when incomplete analyses exist */}
      {hasAnyAnalysis && (!analyses?.leetcode || !analyses?.github) && (
        <div className="card p-6 bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-start gap-3">
            <HiExclamationCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-foreground mb-2">Complete Your Career Analysis</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Analyze your remaining profiles to get your complete Career Readiness Score.
              </p>
              <div className="space-y-2 text-sm">
                {!analyses?.leetcode && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                    Visit the <span className="text-primary font-medium">LeetCode</span> tab and click Analyze
                  </div>
                )}
                {!analyses?.github && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                    Visit the <span className="text-primary font-medium">GitHub</span> tab and click Analyze
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button - only show if we have any analyses */}
      {hasAnyAnalysis && (
        <div className="flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary
                       hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed
                       rounded-lg transition-colors"
          >
            <HiRefresh className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Show charts only if we have at least one analysis */}
      {hasAnyAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid lg:grid-cols-2 gap-6"
        >
          {/* Overall Score */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Career Readiness Score</h2>
              {targetRole && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                  {targetRole}
                </span>
              )}
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-48 h-48">
                <Doughnut
                  data={{
                    labels: ['Score', 'Remaining'],
                    datasets: [{
                      data: [readinessScore?.overall || overallScore, 100 - (readinessScore?.overall || overallScore)],
                      backgroundColor: ['#6366f1', '#1e1b4b'],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    cutout: '75%',
                    plugins: { legend: { display: false } }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-4xl font-bold text-foreground">{readinessScore?.overall || overallScore}</span>
                  <span className="text-muted-foreground">out of 100</span>
                </div>
              </div>
            </div>

            {/* Role-based weight indicator */}
            {targetRole && readinessScore && (
              <div className="mt-4 p-3 bg-muted/40 rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Score Weights for {targetRole}:</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-primary-400">LeetCode: {Math.round(readinessScore.weights.leetcode * 100)}%</span>
                  <span className="text-secondary-400">GitHub: {Math.round(readinessScore.weights.github * 100)}%</span>
                  <span className="text-accent-400">Resume: {Math.round(readinessScore.weights.resume * 100)}%</span>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-3">
              <ScoreBar label="LeetCode" score={readinessScore?.leetcodeScore || leetcodeScore} color="primary" />
              <ScoreBar label="GitHub" score={readinessScore?.githubScore || githubScore} color="secondary" />
              <ScoreBar label="Resume (ATS)" score={readinessScore?.resumeScore || resumeScore} color="accent" />
            </div>

            {/* Dynamic tips to improve score */}
            <div className="mt-6 p-4 bg-primary/10 border border-primary/30 rounded-lg">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <HiChartBar className="w-4 h-4 text-primary" />
                How to Increase Your Score
              </h3>
              <div className="space-y-2 text-xs text-dark-300">
                {/* LeetCode Tips */}
                {analyses?.leetcode && (
                  <div className="flex items-start gap-2">
                    <span className="text-primary font-bold">•</span>
                    <span>
                      <span className="text-foreground font-medium">LeetCode ({leetcodeScore}/100):</span>{' '}
                      {leetcodeStats.totalSolved < 100
                        ? `Solve ${100 - leetcodeStats.totalSolved} more problems to reach 100+`
                        : leetcodeStats.hardSolved < 20
                          ? `Increase hard problems to ${20 - leetcodeStats.hardSolved} more for better score`
                          : leetcodeStats.mediumSolved < 50
                            ? `Solve ${50 - leetcodeStats.mediumSolved} more medium problems`
                            : 'Great! Focus on solving hard problems and improving acceptance rate'}
                    </span>
                  </div>
                )}

                {/* GitHub Tips */}
                {analyses?.github && (
                  <div className="flex items-start gap-2">
                    <span className="text-secondary-foreground font-bold">•</span>
                    <span>
                      <span className="text-foreground font-medium">GitHub ({githubScore}/100):</span>{' '}
                      {githubStats.publicRepos < 5
                        ? `Create ${5 - githubStats.publicRepos} more public repositories with quality code`
                        : githubStats.totalStars < 10
                          ? 'Improve documentation and share your projects to get more stars'
                          : githubRepos.filter(r => r.description).length < githubRepos.length * 0.7
                            ? 'Add descriptions to your repositories for better visibility'
                            : 'Excellent! Keep contributing and building quality projects'}
                    </span>
                  </div>
                )}

                {/* Resume Tips */}
                {analyses?.resume && (
                  <div className="flex items-start gap-2">
                    <span className="text-accent-foreground font-bold">•</span>
                    <span>
                      <span className="text-foreground font-medium">Resume ({resumeScore}/100):</span>{' '}
                      {resumeScore < 60
                        ? 'Add more technical keywords and quantify your achievements'
                        : resumeScore < 80
                          ? 'Improve formatting and match more job description keywords'
                          : 'Great resume! Keep updating with recent projects and skills'}
                    </span>
                  </div>
                )}

                {/* Show prompt if no analyses */}
                {!analyses?.leetcode && !analyses?.github && !analyses?.resume && (
                  <p className="text-muted-foreground text-xs">Analyze your profiles to get personalized improvement tips</p>
                )}
              </div>
            </div>
          </div>

          {/* Skills Radar */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Skills Overview</h2>
            <Radar
              data={radarData}
              options={{
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { display: false },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#9ca3af' }
                  }
                },
                plugins: { legend: { display: false } }
              }}
            />
          </div>

          {/* Recommendations */}
          <div className="lg:col-span-2 card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recommendations</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <RecommendationCard
                title="Solve More Problems"
                description="Practice medium and hard LeetCode problems to improve problem-solving skills"
                priority="high"
              />
              <RecommendationCard
                title="Contribute to Open Source"
                description="Make contributions to open source projects to showcase collaboration skills"
                priority="medium"
              />
              <RecommendationCard
                title="Update Resume Skills"
                description="Add your recent projects and technologies to your resume"
                priority="low"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// LeetCode Tab
function LeetCodeTab({ analysis, onRefresh, analyzing, setAnalyzing, setAnalyses }) {
  const [username, setUsername] = useState('');

  const leetcodeStats = analysis?.leetcode?.stats || {};
  const leetcodeInsights = analysis?.aiInsights || {};
  const roleRequiredTopics = leetcodeInsights.requiredTopics || [];
  const roleFocusTopics = leetcodeInsights.focusTopics || [];
  const recommendedProblems = leetcodeInsights.recommendedProblems || [];

  const handleAnalyze = async () => {
    if (!username.trim()) {
      toast.error('Please enter your LeetCode username');
      return;
    }

    try {
      setAnalyzing('leetcode');
      await careerAPI.analyzeLeetCode({ username: username.trim(), forceRefresh: true });
      const latest = await careerAPI.getLatestLeetCode();
      if (latest?.data?.data) {
        setAnalyses((prev) => ({
          ...(prev || {}),
          leetcode: latest.data.data
        }));
      }
      toast.success('LeetCode analysis complete!');
      onRefresh();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to analyze LeetCode profile';
      toast.error(message);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Input Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Analyze LeetCode Profile</h2>
          {analysis && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-3 py-1 rounded-full flex items-center gap-1">
              <HiCheckCircle className="w-3 h-3" />
              Analyzed
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input flex-1"
            placeholder="Enter your LeetCode username"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing === 'leetcode'}
            className="btn-primary"
          >
            {analyzing === 'leetcode' ? (
              <HiRefresh className="w-5 h-5 animate-spin" />
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Solved" value={leetcodeStats.totalSolved || 0} />
            <StatCard label="Easy" value={leetcodeStats.easySolved || 0} color="accent" />
            <StatCard label="Medium" value={leetcodeStats.mediumSolved || 0} color="warning" />
            <StatCard label="Hard" value={leetcodeStats.hardSolved || 0} color="danger" />
          </div>

          {/* Analysis */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Analysis</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground">{leetcodeInsights.summary}</p>
            </div>

            {(roleRequiredTopics.length > 0 || roleFocusTopics.length > 0) && (
              <>
                <h3 className="font-medium text-foreground mt-6 mb-3">Role-Based Focus</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Core topics for your role</p>
                    <div className="flex flex-wrap gap-2">
                      {roleRequiredTopics.map((topic) => (
                        <span
                          key={topic}
                          className="px-3 py-1.5 bg-secondary/20 text-secondary-foreground rounded-lg text-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Focus next</p>
                    <div className="flex flex-wrap gap-2">
                      {roleFocusTopics.map((topic) => (
                        <span
                          key={topic}
                          className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <h3 className="font-medium text-foreground mt-6 mb-3">Strengths</h3>
            <ul className="space-y-2">
              {leetcodeInsights.strengths?.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <HiCheckCircle className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
                  {strength}
                </li>
              ))}
            </ul>

            <h3 className="font-medium text-foreground mt-6 mb-3">Areas to Improve</h3>
            <ul className="space-y-2">
              {leetcodeInsights.weaknesses?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                  <HiExclamationCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>

            {recommendedProblems.length > 0 && (
              <>
                <h3 className="font-medium text-foreground mt-6 mb-3">Recommended Problems</h3>
                <div className="space-y-3">
                  {recommendedProblems.map((problem, i) => (
                    <div key={`${problem.title}-${i}`} className="p-4 bg-muted/40 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-medium">{problem.title}</p>
                          <p className="text-muted-foreground text-sm mt-1">
                            {problem.topic} • {problem.difficulty}
                          </p>
                        </div>
                        {problem.url && (
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-400 text-sm hover:underline"
                          >
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// GitHub Tab
function GitHubTab({ analysis, onRefresh, analyzing, setAnalyzing, setAnalyses }) {
  const [username, setUsername] = useState('');
  const [reposPage, setReposPage] = useState(1);
  const REPOS_PER_PAGE = 10;

  const githubStats = analysis?.github?.stats || {};
  const githubLanguages = analysis?.github?.languageBreakdown || [];
  const githubInsights = analysis?.aiInsights || {};
  const allGithubRepos = analysis?.github?.topRepositories || [];

  // Paginate repos
  const totalReposPages = Math.ceil(allGithubRepos.length / REPOS_PER_PAGE);
  const displayedRepos = allGithubRepos.slice(
    (reposPage - 1) * REPOS_PER_PAGE,
    reposPage * REPOS_PER_PAGE
  );

  const handleAnalyze = async () => {
    if (!username.trim()) {
      toast.error('Please enter your GitHub username');
      return;
    }

    try {
      setAnalyzing('github');
      await careerAPI.analyzeGitHub({ username: username.trim(), forceRefresh: true });
      const latest = await careerAPI.getLatestGitHub();
      if (latest?.data?.data) {
        setAnalyses((prev) => ({
          ...(prev || {}),
          github: latest.data.data
        }));
      }
      toast.success('GitHub analysis complete!');
      setReposPage(1);
      onRefresh();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to analyze GitHub profile';
      toast.error(message);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Input Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Analyze GitHub Profile</h2>
          {analysis && (
            <span className="text-xs bg-accent/20 text-accent-foreground px-3 py-1 rounded-full flex items-center gap-1">
              <HiCheckCircle className="w-3 h-3" />
              Analyzed
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input flex-1"
            placeholder="Enter your GitHub username"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing === 'github'}
            className="btn-primary"
          >
            {analyzing === 'github' ? (
              <HiRefresh className="w-5 h-5 animate-spin" />
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <>
          {/* Languages */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Top Languages</h2>
            <div className="flex flex-wrap gap-2">
              {githubLanguages.map((lang, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-primary/20 text-primary rounded-lg text-sm"
                >
                  {lang.language}
                </span>
              ))}
            </div>
          </div>

          {/* Public Repositories */}
          {allGithubRepos.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Public Repositories ({allGithubRepos.length})
                </h2>
              </div>
              <div className="space-y-3">
                {displayedRepos.map((repo) => (
                  <div key={repo.url} className="p-4 bg-muted/40 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{repo.name}</p>
                        {repo.description && (
                          <p className="text-muted-foreground text-sm mt-1">{repo.description}</p>
                        )}
                      </div>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-sm hover:underline"
                      >
                        View
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                      {repo.language && <span>{repo.language}</span>}
                      <span>⭐ {repo.stars || 0}</span>
                      <span>🍴 {repo.forks || 0}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalReposPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setReposPage(Math.max(1, reposPage - 1))}
                    disabled={reposPage === 1}
                    className="px-3 py-1.5 bg-dark-700 text-dark-400 disabled:opacity-50 rounded-lg hover:bg-dark-600"
                  >
                    ← Previous
                  </button>
                  <span className="text-dark-400 text-sm">
                    Page {reposPage} of {totalReposPages}
                  </span>
                  <button
                    onClick={() => setReposPage(Math.min(totalReposPages, reposPage + 1))}
                    disabled={reposPage === totalReposPages}
                    className="px-3 py-1.5 bg-dark-700 text-dark-400 disabled:opacity-50 rounded-lg hover:bg-dark-600"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Analysis */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Analysis</h2>
            <p className="text-dark-300 mb-6">{githubInsights.summary}</p>

            <h3 className="font-medium text-white mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {githubInsights.recommendations?.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-dark-300">
                  <HiCheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>

            {githubInsights.projectIdeas?.length > 0 && (
              <>
                <h3 className="font-medium text-white mt-6 mb-3">Project Ideas for Your Role</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {githubInsights.projectIdeas.map((idea, i) => (
                    <div key={i} className="p-4 bg-dark-800 rounded-xl">
                      <p className="text-white font-medium">{idea.title}</p>
                      <p className="text-dark-400 text-sm mt-2">{idea.goal}</p>
                      {idea.tech?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {idea.tech.map((tech) => (
                            <span
                              key={tech}
                              className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                      {idea.impact && (
                        <p className="text-dark-400 text-sm mt-3">{idea.impact}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// Resume Tab
function ResumeTab({ analysis, onRefresh, analyzing, setAnalyzing }) {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const resumeData = analysis?.resume || {};
  const resumeInsights = analysis?.aiInsights || {};
  const suggestions = (resumeInsights.actionPlan || []).map((item) => ({
    title: item.action,
    description: item.timeline || '',
    priority: item.priority || 'medium'
  }));
  const recommendationDetails = resumeInsights.recommendations || [];
  const sectionEntries = resumeData.sections ? Object.entries(resumeData.sections) : [];

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Please upload your resume');
      return;
    }

    try {
      setAnalyzing('resume');
      const formData = new FormData();
      formData.append('resume', file);
      if (jobDescription) {
        formData.append('jobDescription', jobDescription);
      }
      await careerAPI.analyzeResume(formData);
      const latest = await careerAPI.getLatestResume();
      if (latest?.data?.data) {
        onRefresh();
      }
      toast.success('Resume analysis complete!');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to analyze resume';
      toast.error(message);
    } finally {
      setAnalyzing(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Upload Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Analyze Resume (ATS Check)</h2>
          {analysis && (
            <span className="text-xs bg-accent-500/20 text-accent-400 px-3 py-1 rounded-full flex items-center gap-1">
              <HiCheckCircle className="w-3 h-3" />
              Analyzed
            </span>
          )}
        </div>

        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Upload Resume (PDF)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed
                              border-dark-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="hidden"
                />
                <HiUpload className="w-5 h-5 text-dark-400" />
                <span className="text-dark-400">
                  {file ? file.name : 'Choose file or drag here'}
                </span>
              </label>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Job Description (Optional)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="input h-32"
              placeholder="Paste the job description to check compatibility..."
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing === 'resume' || !file}
            className="btn-primary"
          >
            {analyzing === 'resume' ? (
              <>
                <HiRefresh className="w-5 h-5 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              'Analyze Resume'
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <>
          {/* ATS Score */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">ATS Compatibility Score</h2>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <Doughnut
                  data={{
                    labels: ['Score', 'Remaining'],
                    datasets: [{
                      data: [resumeData.atsScore || 0, 100 - (resumeData.atsScore || 0)],
                      backgroundColor: [
                        resumeData.atsScore >= 70 ? '#10b981' : resumeData.atsScore >= 50 ? '#f59e0b' : '#ef4444',
                        '#1e1b4b'
                      ],
                      borderWidth: 0
                    }]
                  }}
                  options={{
                    cutout: '70%',
                    plugins: { legend: { display: false } }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">{resumeData.atsScore || 0}%</span>
                </div>
              </div>
              <div>
                <p className={`text-lg font-medium ${resumeData.atsScore >= 70 ? 'text-accent-400' :
                  resumeData.atsScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                  {resumeData.atsScore >= 70 ? 'Great!' :
                    resumeData.atsScore >= 50 ? 'Needs Improvement' : 'Low Score'}
                </p>
                <p className="text-dark-400 mt-1">
                  {resumeData.atsScore >= 70
                    ? 'Your resume is well-optimized for ATS systems'
                    : 'Consider the suggestions below to improve'}
                </p>
              </div>
            </div>
          </div>

          {/* Keywords */}
          {resumeData.keywords && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Keyword Analysis</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-accent-400 font-medium mb-2">Found Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.keywords.found?.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-accent-500/20 text-accent-400 rounded text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-amber-400 font-medium mb-2">Missing Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.keywords.missing?.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {resumeData.keywords.recommended?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-primary-400 font-medium mb-2">Recommended Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.keywords.recommended.map((kw, i) => (
                      <span key={i} className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section Feedback */}
          {sectionEntries.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Section Feedback</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {sectionEntries.map(([sectionName, sectionData]) => (
                  <div key={sectionName} className="p-4 bg-dark-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">
                        {sectionName.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                      </p>
                      <span className="text-sm text-dark-400">{sectionData?.score || 0}/100</span>
                    </div>
                    {sectionData?.feedback && (
                      <p className="text-dark-400 text-sm mt-2">{sectionData.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mistakes Found */}
          {resumeData.mistakes && resumeData.mistakes.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <HiExclamationCircle className="w-5 h-5 text-red-400" />
                Mistakes & Issues Found
              </h2>
              <div className="space-y-3">
                {resumeData.mistakes.map((mistake, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${mistake.severity === 'high' ? 'bg-red-500/5 border-red-500/30' :
                    mistake.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/30' :
                      'bg-blue-500/5 border-blue-500/30'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-1 ${mistake.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        mistake.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                        {mistake.severity.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-dark-300 font-medium">{mistake.category}</p>
                        <p className={`text-white mt-1 ${mistake.severity === 'high' ? 'text-red-300' :
                          mistake.severity === 'medium' ? 'text-amber-300' :
                            'text-blue-300'
                          }`}>
                          ⚠️ {mistake.issue}
                        </p>
                        <p className="text-dark-400 text-sm mt-2">
                          <span className="text-accent-400 font-medium">Fix:</span> {mistake.fix}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                <p className="text-sm text-dark-300">
                  <span className="text-white font-medium">💡 Tip:</span> Address high severity issues first to significantly improve your ATS score.
                </p>
              </div>
            </div>
          )}

          {/* Formatting Issues */}
          {resumeData.formatting?.issues?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Formatting Issues</h2>
              <ul className="space-y-2">
                {resumeData.formatting.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-dark-300">
                    <HiExclamationCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Improvement Suggestions</h2>
            <ul className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-3 p-3 bg-dark-800 rounded-xl">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${suggestion.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    suggestion.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white">{suggestion.title}</p>
                    <p className="text-dark-400 text-sm mt-1">{suggestion.description}</p>
                  </div>
                </li>
              ))}
            </ul>
            {recommendationDetails.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-white mb-3">Detailed Recommendations</h3>
                <ul className="space-y-2">
                  {recommendationDetails.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-dark-300">
                      <HiCheckCircle className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// Helper Components
function ScoreBar({ label, score, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    accent: 'bg-accent-500'
  };

  const normalizedScore = Math.max(0, Math.min(100, Number.parseFloat(score) || 0));

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-dark-400">{label}</span>
        <span className="text-white">{normalizedScore}/100</span>
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className="h-full dark:bg-white bg-black rounded-full transition-all duration-500"
          style={{ width: `${normalizedScore}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'primary' }) {
  const colors = {
    primary: 'text-primary-400',
    secondary: 'text-secondary-400',
    accent: 'text-accent-400',
    warning: 'text-amber-400',
    danger: 'text-red-400'
  };

  return (
    <div className="card p-4 text-center">
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-dark-400 text-sm mt-1">{label}</p>
    </div>
  );
}

function RecommendationCard({ title, description, priority }) {
  const priorities = {
    high: 'border-red-500/50 bg-red-500/10',
    medium: 'border-amber-500/50 bg-amber-500/10',
    low: 'border-blue-500/50 bg-blue-500/10'
  };

  return (
    <div className={`p-4 rounded-xl border ${priorities[priority]}`}>
      <h3 className="font-medium text-white mb-2">{title}</h3>
      <p className="text-dark-400 text-sm">{description}</p>
    </div>
  );
}
