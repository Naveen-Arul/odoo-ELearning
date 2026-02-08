/**
 * SkillForge AI - Topic Page
 * Learn topic with video player, documentation, and tests
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { motion } from 'framer-motion';
import {
  HiArrowLeft,
  HiPlay,
  HiPause,
  HiCheck,
  HiClock,
  HiDocumentText,
  HiQuestionMarkCircle,
  HiLightBulb,
  HiChatAlt2,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import { topicsAPI, testsAPI, aiAPI, roadmapsAPI } from '../services/api';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function TopicPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { startSession, endSession, sessionDuration, activeSession, enrolledRoadmaps, fetchEnrolledRoadmaps } = useAppStore();

  const [topic, setTopic] = useState(null);
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('video');
  const [playing, setPlaying] = useState(false);
  const [videoLanguage, setVideoLanguage] = useState('english');

  // Test state
  const [showTest, setShowTest] = useState(false);
  const [testQuestions, setTestQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testAttemptId, setTestAttemptId] = useState(null);
  const [completionUpdated, setCompletionUpdated] = useState(false);
  const redirectTimeoutRef = useRef(null);

  // AI Help
  const [showAIHelp, setShowAIHelp] = useState(false);
  const [aiQuestion, setAIQuestion] = useState('');
  const [aiResponse, setAIResponse] = useState('');
  const [aiLoading, setAILoading] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const playerRef = useRef(null);

  useEffect(() => {
    fetchTopic();
    if (user && fetchEnrolledRoadmaps) {
      fetchEnrolledRoadmaps();
    }
    return () => {
      // End session when leaving
      if (activeSession === id) {
        handleEndSession();
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, [id, user]);

  useEffect(() => {
    setVideoLanguage(user?.preferences?.preferredLanguage || 'english');
  }, [user]);

  const fetchTopic = async () => {
    try {
      setLoading(true);
      const response = await topicsAPI.getById(id);
      const payload = response.data.data;
      setTopic(payload?.topic || payload);
      setUserProgress(payload?.userProgress || null);
    } catch (error) {
      console.error('Failed to fetch topic:', error);
      toast.error('Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      await topicsAPI.startSession(id);
      startSession(id);
      setPlaying(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async () => {
    try {
      await topicsAPI.endSession(id, { duration: sessionDuration });
      endSession();
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const markComplete = async (shouldNavigate = true) => {
    try {
      if (completionUpdated || userProgress?.completed) {
        if (shouldNavigate) {
          const nextTopicId = await getNextTopicId();
          if (nextTopicId) {
            navigate(`/topics/${nextTopicId}`);
          } else {
            const enrolledRoadmapId = getEnrolledRoadmapId();
            if (enrolledRoadmapId) {
              navigate(`/roadmaps/${enrolledRoadmapId}`);
            } else {
              navigate(-1);
            }
          }
        }
        return true;
      }
      const roadmapId = topic?.roadmap?._id || topic?.roadmap;
      if (!roadmapId) {
        toast.error('Roadmap not found for this topic');
        return false;
      }
      const completeRes = await topicsAPI.complete(id, {
        roadmapId,
        timeSpent: sessionDuration,
      });
      setCompletionUpdated(true);
      setUserProgress((prev) => ({ ...(prev || {}), completed: true }));
      if (fetchEnrolledRoadmaps) {
        fetchEnrolledRoadmaps();
      }
      toast.success('Topic completed! 🎉');

      const completedPayload = completeRes?.data?.data;
      if (completedPayload?.roadmapCompleted) {
        setShowReviewModal(true);
      }

      if (shouldNavigate) {
        const nextTopicId = await getNextTopicId();
        if (nextTopicId) {
          navigate(`/topics/${nextTopicId}`);
        } else {
          // Navigate to roadmap topics page
          const enrolledRoadmapId = getEnrolledRoadmapId() || roadmapId;
          navigate(`/roadmaps/${enrolledRoadmapId}`);
        }
      }
      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to complete topic';
      if (message.toLowerCase().includes('already completed')) {
        toast.success(message);
        setCompletionUpdated(true);
        setUserProgress((prev) => ({ ...(prev || {}), completed: true }));
        if (fetchEnrolledRoadmaps) {
          fetchEnrolledRoadmaps();
        }
        return true;
      }
      toast.error(message);
      return false;
    }
  };

  const handleComplete = async () => {
    await markComplete(true);
  };

  const getNextTopicId = async () => {
    if (!topic?.roadmap) return null;
    try {
      const roadmapRes = await roadmapsAPI.getById(topic.roadmap);
      const topics = roadmapRes.data.data?.topics || [];
      const sortedTopics = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const currentIndex = sortedTopics.findIndex(t => t._id === (topic._id || id));
      const nextTopic = sortedTopics[currentIndex + 1];
      return nextTopic?._id || null;
    } catch (error) {
      console.error('Failed to fetch next topic:', error);
      return null;
    }
  };

  const getEnrolledRoadmapId = () => {
    const topicRoadmapId = topic?.roadmap?._id || topic?.roadmap;
    if (!topicRoadmapId) return null;
    const enrolledMatch = (enrolledRoadmaps || []).find(
      (er) => (er.roadmap?._id || er.roadmap) === topicRoadmapId
    );
    return enrolledMatch?.roadmap?._id || enrolledMatch?.roadmap || topicRoadmapId;
  };

  const handleStartTest = async () => {
    try {
      setTestLoading(true);
      const response = await testsAPI.start({ topicId: id, roadmapId: topic?.roadmap });
      const normalizedQuestions = response.data.data.questions.map((q) => ({
        id: q._id,
        question: q.questionText || q.question,
        questionType: q.questionType,
        options: (q.options || []).map((o) => ({ id: o._id, text: o.text }))
      }));
      setTestQuestions(normalizedQuestions);
      setTestAttemptId(response.data.data.attemptId);
      setShowTest(true);
      setCurrentQuestion(0);
      setAnswers({});
      setTestResult(null);
    } catch (error) {
      toast.error('Failed to generate test');
    } finally {
      setTestLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer });
  };

  const handleSubmitTest = async () => {
    try {
      setTestLoading(true);
      const payloadAnswers = testQuestions.map((q, index) => ({
        questionId: q.id,
        answer: answers[index]
      }));
      const response = await testsAPI.submit(testAttemptId, { answers: payloadAnswers });
      const result = response.data.data;
      const normalizedResult = {
        ...(result?.score || {}),
        questions: result?.questions || [],
        feedback: result?.feedback || null,
      };
      setTestResult(normalizedResult);
      if (normalizedResult?.passed && !completionUpdated) {
        const completed = await markComplete(false);
        if (completed) {
          const nextTopicId = await getNextTopicId();
          if (nextTopicId) {
            toast.success('Test passed! Redirecting to next topic...');
            redirectTimeoutRef.current = setTimeout(() => {
              navigate(`/topics/${nextTopicId}`);
            }, 2500);
          } else {
            const enrolledRoadmapId = getEnrolledRoadmapId();
            if (enrolledRoadmapId) {
              toast.success('Test passed! Redirecting to roadmap...');
              redirectTimeoutRef.current = setTimeout(() => {
                navigate(`/roadmaps/${enrolledRoadmapId}`);
              }, 2500);
            } else {
              navigate(-1);
            }
          }
        }
      }
    } catch (error) {
      toast.error('Failed to submit test');
    } finally {
      setTestLoading(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;

    try {
      setAILoading(true);
      const response = await aiAPI.teacherExplain({
        topicId: id,
        question: aiQuestion,
      });
      setAIResponse(response.data.data.explanation);
    } catch (error) {
      toast.error('Failed to get AI response');
    } finally {
      setAILoading(false);
    }
  };

  const handleSubmitReview = async () => {
    const roadmapId = getEnrolledRoadmapId();
    if (!roadmapId) {
      toast.error('Roadmap not found for review');
      return;
    }

    try {
      setReviewSubmitting(true);
      await roadmapsAPI.submitReview(roadmapId, {
        rating: reviewRating,
        comment: reviewComment
      });
      toast.success('Thanks for your review!');
      setShowReviewModal(false);
      setReviewComment('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoUrl = () => {
    const videoLinks = topic?.videoLinks || {};
    const selected = videoLinks[videoLanguage] || videoLinks.english || null;
    if (!selected) return '';
    return typeof selected === 'string' ? selected : selected.url || '';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="aspect-video bg-muted rounded-lg" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Topic not found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-2">Course Review</h3>
            <p className="text-muted-foreground text-sm mb-4">
              You completed this roadmap. Please leave a quick review.
            </p>

            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Rating
            </label>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="input mb-4"
            >
              {[5, 4, 3, 2, 1].map((val) => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Comment (optional)
            </label>
            <textarea
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="input mb-4"
              placeholder="Share your feedback"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="btn-secondary"
                disabled={reviewSubmitting}
              >
                Later
              </button>
              <button
                onClick={handleSubmitReview}
                className="btn-primary"
                disabled={reviewSubmitting}
              >
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <HiArrowLeft className="w-5 h-5" />
          Back
        </button>

        {activeSession === id && (
          <div className="flex items-center gap-2 bg-accent/20 text-accent-foreground
                          px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <HiClock className="w-4 h-4" />
            <span className="font-mono">{formatDuration(sessionDuration)}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">{topic.title}</h1>
        <p className="text-muted-foreground">{topic.description}</p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video & Content Area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2 bg-secondary p-1 rounded-lg">
            <TabButton
              active={activeTab === 'video'}
              onClick={() => setActiveTab('video')}
              icon={HiPlay}
              label="Video"
            />
            <TabButton
              active={activeTab === 'docs'}
              onClick={() => setActiveTab('docs')}
              icon={HiDocumentText}
              label="Documentation"
            />
            <TabButton
              active={activeTab === 'test'}
              onClick={() => setActiveTab('test')}
              icon={HiQuestionMarkCircle}
              label="Test"
            />
          </div>

          {/* Tab Content */}
          {activeTab === 'video' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Video Language:</span>
                {['english', 'tamil', 'hindi'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setVideoLanguage(lang)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${videoLanguage === lang
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      }`}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>

              {/* Video Player */}
              <div className="card overflow-hidden">
                <div className="player-wrapper bg-muted/30">
                  {getVideoUrl() ? (
                    <ReactPlayer
                      ref={playerRef}
                      url={getVideoUrl()}
                      className="react-player"
                      width="100%"
                      height="100%"
                      playing={playing}
                      controls
                      onPlay={() => {
                        if (activeSession !== id) {
                          handleStartSession();
                        }
                        setPlaying(true);
                      }}
                      onPause={() => setPlaying(false)}
                      onEnded={() => {
                        setPlaying(false);
                        toast.success('Video completed! Take the test when you\'re ready.');
                      }}
                      config={{
                        youtube: {
                          playerVars: { modestbranding: 1 }
                        }
                      }}
                    />
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      No video available for this language.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'docs' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6 markdown-content"
            >
              <ReactMarkdown>
                {topic.documentation?.content || 'No documentation available for this topic.'}
              </ReactMarkdown>
            </motion.div>
          )}

          {activeTab === 'test' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6"
            >
              {!showTest && !testResult && (
                <div className="text-center py-8">
                  <HiQuestionMarkCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Ready to test your knowledge?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    AI will generate questions based on this topic.
                    You need {topic.testConfig?.passingPercentage || 70}% to pass.
                  </p>
                  <button
                    onClick={handleStartTest}
                    disabled={testLoading}
                    className="btn-primary"
                  >
                    {testLoading ? 'Generating...' : 'Start Test'}
                  </button>
                </div>
              )}

              {showTest && !testResult && testQuestions.length > 0 && (
                <div>
                  {/* Progress */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-muted-foreground">
                      Question {currentQuestion + 1} of {testQuestions.length}
                    </span>
                    <div className="progress w-48">
                      <div
                        className="progress-bar"
                        style={{ width: `${((currentQuestion + 1) / testQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-foreground mb-4">
                      {testQuestions[currentQuestion].question}
                    </h3>
                    <div className="space-y-3">
                      {testQuestions[currentQuestion].options.map((option, i) => (
                        <button
                          key={option.id || i}
                          onClick={() => handleAnswerSelect(currentQuestion, option.id)}
                          className={`w-full p-4 rounded-lg border text-left transition-all ${answers[currentQuestion] === option.id
                            ? 'bg-primary/15 border-primary text-foreground'
                            : 'bg-secondary border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                            }`}
                        >
                          <span className="font-medium mr-2">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          {option.text}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                      disabled={currentQuestion === 0}
                      className="btn-secondary"
                    >
                      <HiChevronLeft className="w-5 h-5 mr-1" />
                      Previous
                    </button>

                    {currentQuestion === testQuestions.length - 1 ? (
                      <button
                        onClick={handleSubmitTest}
                        disabled={!testQuestions.every((_, index) => answers[index] !== undefined) || testLoading}
                        className="btn-primary"
                      >
                        {testLoading ? 'Submitting...' : 'Submit Test'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQuestion(currentQuestion + 1)}
                        className="btn-primary"
                      >
                        Next
                        <HiChevronRight className="w-5 h-5 ml-1" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {testResult && (
                <div className="text-center py-8">
                  <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${testResult.passed ? 'bg-accent-500/20' : 'bg-red-500/20'
                    }`}>
                    <span className={`text-4xl font-bold ${testResult.passed ? 'text-accent-400' : 'text-red-400'
                      }`}>
                      {testResult.percentage}%
                    </span>
                  </div>

                  <h3 className={`text-xl font-semibold mb-2 ${testResult.passed ? 'text-accent-400' : 'text-red-400'
                    }`}>
                    {testResult.passed ? '🎉 Congratulations! You Passed!' : '❌ Not quite there yet'}
                  </h3>

                  <p className="text-muted-foreground mb-6">
                    You got {testResult.correctAnswers} out of {testResult.totalQuestions} questions correct.
                  </p>

                  {testResult.questions && testResult.questions.length > 0 && (
                    <div className="text-left bg-secondary/60 rounded-lg p-4 mb-6">
                      <h4 className="text-foreground font-medium mb-3">Answer Review</h4>
                      <div className="space-y-4">
                        {testResult.questions.map((question, index) => (
                          <div key={index} className="border border-border rounded-lg p-3">
                            <p className="text-foreground font-medium mb-2">
                              {index + 1}. {question.questionText}
                            </p>
                            <p className={`text-sm ${question.isCorrect ? 'text-accent-400' : 'text-red-400'}`}>
                              Your answer: {question.userAnswer || 'No answer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Correct answer: {question.correctAnswer}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    {testResult.passed ? (
                      <>
                        <button
                          onClick={() => {
                            const roadmapId = getEnrolledRoadmapId() || topic?.roadmap?._id || topic?.roadmap;
                            navigate(roadmapId ? `/roadmaps/${roadmapId}` : '/dashboard');
                          }}
                          className="btn-secondary"
                        >
                          Go to Roadmap
                        </button>
                        <button
                          onClick={handleComplete}
                          className="btn-primary"
                          disabled={completionUpdated || userProgress?.completed}
                        >
                          <HiCheck className="w-5 h-5 mr-2" />
                          {completionUpdated || userProgress?.completed ? 'Topic Completed' : 'Complete Topic'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setShowTest(false);
                            setTestResult(null);
                          }}
                          className="btn-secondary"
                        >
                          Review Content
                        </button>
                        <button onClick={handleStartTest} className="btn-primary">
                          Try Again
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI Help */}
          <div className="card p-4">
            <button
              onClick={() => setShowAIHelp(!showAIHelp)}
              className="w-full flex items-center justify-between text-foreground hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <HiLightBulb className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">Ask AI Teacher</span>
              </span>
            </button>

            {showAIHelp && (
              <div className="mt-4 space-y-3">
                <textarea
                  value={aiQuestion}
                  onChange={(e) => setAIQuestion(e.target.value)}
                  placeholder="Ask anything about this topic..."
                  className="input min-h-24 resize-none"
                />
                <button
                  onClick={handleAskAI}
                  disabled={aiLoading || !aiQuestion.trim()}
                  className="btn-primary w-full"
                >
                  {aiLoading ? 'Thinking...' : 'Ask AI'}
                </button>

                {aiResponse && (
                  <div className="bg-secondary rounded-lg p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <HiChatAlt2 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-foreground">AI Teacher</span>
                    </div>
                    <div className="text-muted-foreground text-sm markdown-content">
                      <ReactMarkdown>{aiResponse}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Topic Info */}
          <div className="card p-4 space-y-4">
            <h3 className="font-medium text-foreground">Topic Info</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{topic.estimatedDuration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Difficulty</span>
                <span className="text-foreground capitalize">{topic.difficulty || 'Medium'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pass Score</span>
                <span className="text-foreground">{topic.testConfig?.passingPercentage || 70}%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-4 space-y-2">
            <Link
              to={`/ai/tutor?topicId=${id}`}
              className="btn-secondary w-full justify-center"
            >
              <HiQuestionMarkCircle className="w-5 h-5 mr-2" />
              Practice with AI Tutor
            </Link>
            <Link
              to={`/ai/mentor?topicId=${id}`}
              className="btn-ghost w-full justify-center"
            >
              <HiChatAlt2 className="w-5 h-5 mr-2" />
              Talk to AI Mentor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                  font-medium transition-all ${active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
