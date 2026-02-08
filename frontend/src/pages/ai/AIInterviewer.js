/**
 * SkillForge AI - AI Interviewer Page
 * Mock interviews and practice
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiMicrophone, HiPaperAirplane, HiPlay, HiStop,
  HiRefresh, HiClock, HiCheckCircle, HiXCircle, HiBriefcase
} from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import { aiAPI, rolesAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const INTERVIEW_TYPES = [
  { id: 'behavioral', name: 'Behavioral', icon: '🎭', description: 'Leadership, teamwork, problem-solving scenarios' },
  { id: 'technical', name: 'Technical', icon: '💻', description: 'Coding concepts, system design, algorithms' },
  { id: 'system-design', name: 'System Design', icon: '🏗️', description: 'Architecture, scalability, trade-offs' },
  { id: 'hr', name: 'HR Round', icon: '👔', description: 'Culture fit, salary, career goals' }
];

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export default function AIInterviewer() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState('setup'); // setup, interview, feedback
  const [interviewType, setInterviewType] = useState('technical');
  const [difficulty, setDifficulty] = useState('medium');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const messagesEndRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const initializeRole = async () => {
      // If user has a specific target role set, use it
      if (user?.preferences?.targetRole?._id) {
        setSelectedRole(user.preferences.targetRole);
        return;
      }

      // Otherwise fetch all roles for selection
      try {
        const response = await rolesAPI.getAll();
        const roles = response.data.data || [];
        setAvailableRoles(roles);
        if (roles.length > 0) {
          setSelectedRole(roles[0]); // Default to first available
        }
      } catch (error) {
        console.error('Failed to load roles:', error);
      }
    };

    initializeRole();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const extractQuestionText = (text = '') => {
    const markers = ['Next question:', 'Question 1:', 'Question 2:', 'Question'];
    const marker = markers.find((m) => text.includes(m));
    if (!marker) return text.trim();
    const index = text.indexOf(marker);
    return text.slice(index).trim();
  };

  const getModelAnswer = (questionText = '') => {
    const normalized = questionText.toLowerCase();

    if (normalized.includes('solid')) {
      return 'B) Object-oriented design guidelines.';
    }
    if (normalized.includes('binary search')) {
      return 'O(log n).';
    }
    if (normalized.includes('rest') && normalized.includes('graphql')) {
      return 'REST uses multiple endpoints with fixed schemas; GraphQL uses a single endpoint with client-defined queries. Choose REST for simpler caching and GraphQL for flexible data fetching.';
    }
    if (normalized.includes('status code') && normalized.includes('resource creation')) {
      return 'B) 201.';
    }
    if (normalized.includes('flexbox')) {
      return 'justify-content.';
    }
    if (normalized.includes('oauth')) {
      return 'Authorization.';
    }
    if (normalized.includes('cap theorem')) {
      return 'CAP: Consistency, Availability, Partition tolerance. In a partition, you must choose between consistency and availability.';
    }

    return 'Provide a clear, structured answer with reasoning, examples, and trade-offs.';
  };

  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setInput((prev) => {
            const newText = prev + final;
            return newText.replace(/\s+/g, ' ');
          });
        }
        setInterimTranscript(interim);
      };

      recognition.onend = () => {
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            // Ignore
          }
        } else {
          setInterimTranscript('');
          setIsRecording(false);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;

        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied.');
          setIsRecording(false);
          setInterimTranscript('');
        }
      };

      recognitionRef.current = recognition;
    }

    if (isRecording) {
      setIsRecording(false); // Flag BEFORE stopping to prevent restart loop
      setInterimTranscript('');
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
        toast.success('Listening...');
      } catch (e) {
        console.error('Failed to start:', e);
        setIsRecording(false);
      }
    }
  };

  const extractScores = (text) => {
    if (!text) return null;
    const getScore = (label) => {
      const match = text.match(new RegExp(`${label}\\s*[:\-]\\s*(\\d{1,3})`, 'i'));
      return match ? Math.min(100, Math.max(0, parseInt(match[1], 10))) : null;
    };

    const communication = getScore('Communication');
    const technical = getScore('Technical');
    const problemSolving = getScore('Problem Solving');
    const overall = getScore('Overall');

    if ([communication, technical, problemSolving, overall].every((v) => v !== null)) {
      return { communication, technical, problemSolving, overall };
    }

    return null;
  };

  const handleStartInterview = async () => {
    try {
      setLoading(true);
      if (!selectedRole?._id) {
        toast.error('Select a target role first to start the interview');
        setLoading(false);
        return;
      }

      const response = await aiAPI.interviewerStart({
        roleId: selectedRole._id,
        difficulty,
        topics: [interviewType]
      });

      setMessages([{
        role: 'assistant',
        content: response.data.data.message
      }]);
      setCurrentQuestion(extractQuestionText(response.data.data.message));

      if (response.data.data.sessionId) {
        setSessionId(response.data.data.sessionId);
      }

      setMode('interview');
      setQuestionCount(1);
      setTimeElapsed(0);
      setIsTimerRunning(true);
      setTranscript([]);
    } catch (error) {
      toast.error('Failed to start interview');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    if (currentQuestion) {
      setTranscript((current) => {
        const last = current[current.length - 1];
        if (last && last.question === currentQuestion && last.answer === input) {
          return current;
        }
        return [
          ...current,
          {
            question: currentQuestion,
            answer: input,
            aiAnswer: getModelAnswer(currentQuestion)
          }
        ];
      });
    }
    setCurrentQuestion(null);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiAPI.interviewerRespond(sessionId, {
        answer: input
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.data.response
      };
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentQuestion(extractQuestionText(response.data.data.response));
      setQuestionCount((prev) => (response.data.data.questionCount ?? prev + 1));
    } catch (error) {
      toast.error('Failed to get response');
      setMessages(prev => prev.filter(m => m !== userMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleEndInterview = async () => {
    setIsTimerRunning(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setLoading(true);

    try {
      const response = await aiAPI.interviewerEnd(sessionId);

      const feedbackText = response.data.data.feedback;
      const parsedScores = extractScores(feedbackText);
      const hasAnswers = transcript.length > 0;

      setFeedback({
        summary: hasAnswers
          ? feedbackText
          : 'No answers were submitted. Please respond to at least one question to receive a score.',
        duration: timeElapsed,
        questionCount: Math.floor(questionCount / 2),
        scores: hasAnswers
          ? (parsedScores || {
            communication: 45,
            technical: 40,
            problemSolving: 42,
            overall: 42
          })
          : null
      });
      setMode('feedback');
    } catch (error) {
      toast.error('Failed to get feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRestart = () => {
    setMode('setup');
    setMessages([]);
    setSessionId(null);
    setQuestionCount(0);
    setFeedback(null);
    setTimeElapsed(0);
    setIsTimerRunning(false);
    setTranscript([]);
    setCurrentQuestion(null);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500
                      flex items-center justify-center">
          <HiMicrophone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Interviewer</h1>
          <p className="text-dark-400 text-sm">Practice mock interviews</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Setup Mode */}
        {mode === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Role Selection */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Target Role</h2>
              {user?.preferences?.targetRole?._id ? (
                <div className="p-4 bg-dark-800 rounded-xl border border-primary-500/30 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center text-primary-400">
                    <HiBriefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{user.preferences.targetRole.name}</h3>
                    <p className="text-sm text-dark-400">Your specific target role</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm text-dark-400">Select role for this interview:</label>
                  <select
                    value={selectedRole?._id || ''}
                    onChange={(e) => {
                      const role = availableRoles.find(r => r._id === e.target.value);
                      setSelectedRole(role);
                    }}
                    className="input w-full"
                  >
                    {availableRoles.map(role => (
                      <option key={role._id} value={role._id}>{role.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Interview Type */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Select Interview Type</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {INTERVIEW_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setInterviewType(type.id)}
                    className={`p-4 rounded-xl text-left transition-all ${interviewType === type.id
                      ? 'bg-red-500/20 border-2 border-red-500'
                      : 'bg-dark-800 hover:bg-dark-700 border-2 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{type.icon}</span>
                      <h3 className="font-medium text-white">{type.name}</h3>
                    </div>
                    <p className="text-dark-400 text-sm">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Experience Level</h2>
              <div className="grid grid-cols-3 gap-4">
                {DIFFICULTY_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`py-3 rounded-xl capitalize transition-all ${difficulty === level
                      ? 'bg-red-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:text-white'
                      }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="card p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30">
              <h3 className="font-medium text-white mb-3">📌 Interview Tips</h3>
              <ul className="text-dark-300 text-sm space-y-2">
                <li>• Take your time to think before answering</li>
                <li>• Use the STAR method for behavioral questions</li>
                <li>• Ask clarifying questions when needed</li>
                <li>• Think out loud to show your reasoning</li>
              </ul>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartInterview}
              disabled={loading}
              className="btn bg-gradient-to-r from-red-500 to-orange-500 text-white w-full py-4 text-lg"
            >
              {loading ? (
                <HiRefresh className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <HiPlay className="w-6 h-6 mr-2" />
                  Start Interview
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Interview Mode */}
        {mode === 'interview' && (
          <motion.div
            key="interview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Status Bar */}
            <div className="flex items-center justify-between p-4 bg-dark-800 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-dark-300">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  Live Interview
                </span>
                <span className="text-dark-400">|</span>
                <span className="text-dark-400">|</span>
                <span className="text-dark-300 capitalize">{interviewType}</span>
                <span className="text-dark-400">|</span>
                <span className="text-primary-400 font-medium">{selectedRole?.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-dark-300">
                  <HiClock className="w-4 h-4" />
                  {formatTime(timeElapsed)}
                </span>
                <button
                  onClick={handleEndInterview}
                  className="btn bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 px-4"
                >
                  <HiStop className="w-4 h-4 mr-2" />
                  End
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="card p-4 h-[400px] overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${message.role === 'user'
                      ? 'bg-primary-500'
                      : 'bg-gradient-to-br from-red-500 to-orange-500'
                      }`}>
                      {message.role === 'user' ? (
                        <span className="text-white text-sm font-medium">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      ) : (
                        <HiMicrophone className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className={`max-w-2xl rounded-2xl px-4 py-3 ${message.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-700 text-dark-200'
                      }`}>
                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500
                                  flex items-center justify-center">
                      <HiMicrophone className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-dark-700 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-dark-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input + (isRecording && interimTranscript ? ` ${interimTranscript}` : '')}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening..." : "Type your answer or use microphone..."}
                  rows={2}
                  className={`input w-full resize-none pr-10 ${isRecording ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                />
                {isRecording && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                )}
              </div>

              <button
                onClick={toggleRecording}
                className={`p-3 rounded-xl transition-all ${isRecording
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                  : 'bg-dark-700 text-dark-300 hover:text-white hover:bg-dark-600'
                  }`}
                title={isRecording ? 'Stop recording' : 'Start voice answer'}
              >
                <HiMicrophone className={`w-6 h-6 ${isRecording ? 'animate-pulse' : ''}`} />
              </button>

              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="btn-primary p-3 rounded-xl self-stretch flex items-center justify-center"
              >
                <HiPaperAirplane className="w-5 h-5 rotate-90" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Feedback Mode */}
        {mode === 'feedback' && feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className="card p-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Interview Complete! 🎉</h2>
              <p className="text-dark-400 mb-6">
                Duration: {formatTime(feedback.duration)} | Questions: ~{feedback.questionCount}
              </p>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <ScoreCard label="Communication" score={feedback.scores?.communication ?? null} />
                <ScoreCard label="Technical" score={feedback.scores?.technical ?? null} />
                <ScoreCard label="Problem Solving" score={feedback.scores?.problemSolving ?? null} />
                <ScoreCard label="Overall" score={feedback.scores?.overall ?? null} highlight />
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Detailed Feedback</h3>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{feedback.summary}</ReactMarkdown>
              </div>
            </div>

            {/* Answers Review */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Your Answers</h3>
              {transcript.length === 0 ? (
                <p className="text-dark-400">No answers recorded.</p>
              ) : (
                <div className="space-y-4">
                  {transcript.map((item, index) => (
                    <div key={index} className="bg-dark-800 rounded-xl p-4">
                      <p className="text-dark-300 text-sm mb-2">Question {index + 1}</p>
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown>{item.question}</ReactMarkdown>
                      </div>
                      <p className="text-dark-300 text-sm mt-3 mb-1">Your Answer</p>
                      <p className="text-white text-sm whitespace-pre-wrap">{item.answer}</p>
                      <p className="text-dark-300 text-sm mt-3 mb-1">AI Answer</p>
                      <p className="text-white text-sm whitespace-pre-wrap">{item.aiAnswer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleRestart}
                className="btn-secondary flex-1"
              >
                <HiRefresh className="w-4 h-4 mr-2" />
                New Interview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Score Card Component
function ScoreCard({ label, score, highlight = false }) {
  const getColor = (score) => {
    if (score === null || score === undefined) return 'text-dark-400';
    if (score >= 85) return 'text-accent-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className={`p-4 rounded-xl ${highlight ? 'bg-primary-500/20 border border-primary-500' : 'bg-dark-800'}`}>
      <p className={`text-3xl font-bold ${getColor(score)}`}>{score ?? '--'}</p>
      <p className="text-dark-400 text-sm">{label}</p>
    </div>
  );
}
