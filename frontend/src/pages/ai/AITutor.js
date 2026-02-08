/**
 * SkillForge AI - AI Tutor Page
 * Practice tests and quizzes
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiLightBulb, HiPlay, HiCheck, HiX, HiArrowRight,
  HiRefresh, HiClock, HiAcademicCap
} from 'react-icons/hi';
import { aiAPI, roadmapsAPI, topicsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AITutor() {
  const [searchParams] = useSearchParams();
  const topicParamId = searchParams.get('topicId');
  const [mode, setMode] = useState('setup'); // setup, quiz, results
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState('');
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [socraticQuestion, setSocraticQuestion] = useState('');
  const [socraticAnswer, setSocraticAnswer] = useState('');
  const [socraticResponse, setSocraticResponse] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('');
  const [codeTask, setCodeTask] = useState('');
  const [codeGoals, setCodeGoals] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [codeResponse, setCodeResponse] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);

  useEffect(() => {
    fetchRoadmaps();
  }, []);

  useEffect(() => {
    // If launched from Topic page with topicId, preselect that topic and roadmap
    const preselect = async () => {
      if (topicParamId) {
        try {
          const resp = await topicsAPI.getById(topicParamId);
          const t = resp.data.data;
          setSelectedTopic(t);
          if (t.roadmap?._id) {
            setSelectedRoadmapId(t.roadmap._id);
          }
        } catch (e) {
          // ignore
        }
      }
    };
    preselect();
  }, [topicParamId]);

  useEffect(() => {
    // When roadmap changes, filter topics
    if (!selectedRoadmapId) {
      setTopics([]);
      setSelectedTopic(null);
      return;
    }
    const rm = roadmaps.find(r => r._id === selectedRoadmapId);
    const rmTopics = rm?.topics?.map(t => ({ ...t, roadmapTitle: rm.title })) || [];
    setTopics(rmTopics);
    if (selectedTopic && !rmTopics.find(t => t._id === selectedTopic._id)) {
      setSelectedTopic(null);
    }
  }, [selectedRoadmapId, roadmaps]);

  useEffect(() => {
    let timer;
    if (mode === 'quiz' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [mode, timeLeft]);

  const fetchRoadmaps = async () => {
    try {
      const enrolledRes = await roadmapsAPI.getMyEnrolled();
      const enrolled = enrolledRes.data.data || [];
      const flattened = enrolled
        .map(er => er.roadmap)
        .filter(Boolean)
        .map(rm => ({
          ...rm,
          role: rm.role || rm.role?._id ? rm.role : undefined
        }));
      setRoadmaps(flattened);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Unable to load topics. Please check your enrollment.');
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedRoadmapId) {
      toast.error('Please select a roadmap');
      return;
    }

    if (!selectedTopic) {
      toast.error('Please select a topic');
      return;
    }

    try {
      setLoading(true);
      const response = await aiAPI.tutorGenerateTest({
        topicId: selectedTopic._id,
        questionCount: questionCount
      });

      const rawQuestions = response.data.data.questions || [];
      // Normalize to local format
      const normalized = rawQuestions.map((q) => {
        const options = q.options?.map(o => o.text) || [];
        const correctIndex = q.options?.findIndex(o => o.isCorrect) ?? options.findIndex(opt => opt === q.correctAnswer);
        return {
          question: q.questionText || q.question || '',
          options,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          _original: q
        };
      });

      setQuestions(normalized);
      setAnswers({});
      setCurrentQuestion(0);
      setTimeLeft(questionCount * 60); // 1 minute per question
      setMode('quiz');
    } catch (error) {
      toast.error('Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, answerIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Build answers as option text to match backend evaluator
      const answersText = questions.map((q, i) => q.options[answers[i]]);
      const response = await aiAPI.tutorEvaluate({
        topicId: selectedTopic._id,
        questions: questions.map(q => q._original || {
          questionText: q.question,
          options: q.options.map(text => ({ text, isCorrect: false })),
          correctAnswer: q.options[q.correctIndex]
        }),
        answers: answersText
      });

      const evalData = response.data.data;
      // Normalize results to local display format
      setResults({
        percentage: evalData.score,
        score: evalData.correct,
        total: evalData.total
      });
      setMode('results');
    } catch (error) {
      toast.error('Failed to evaluate answers');
    } finally {
      setLoading(false);
    }
  };

  const handleSocratic = async () => {
    if (!socraticQuestion.trim() || !socraticAnswer.trim()) {
      toast.error('Please enter a question and your answer');
      return;
    }
    try {
      setCoachLoading(true);
      const response = await aiAPI.tutorSocratic({
        question: socraticQuestion,
        userAnswer: socraticAnswer,
        topicTitle: selectedTopic?.title,
        difficulty
      });
      setSocraticResponse(response.data.data?.response || '');
    } catch (error) {
      toast.error('Failed to get Socratic feedback');
    } finally {
      setCoachLoading(false);
    }
  };

  const handleCodeCritique = async () => {
    if (!codeInput.trim()) {
      toast.error('Please paste your code');
      return;
    }
    try {
      setCoachLoading(true);
      const response = await aiAPI.tutorCodeCritique({
        code: codeInput,
        language: codeLanguage,
        task: codeTask,
        goals: codeGoals
      });
      setCodeResponse(response.data.data?.response || '');
    } catch (error) {
      toast.error('Failed to get code critique');
    } finally {
      setCoachLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500
                      flex items-center justify-center">
          <HiLightBulb className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Tutor</h1>
          <p className="text-dark-400 text-sm">Practice with AI-generated quizzes</p>
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
            {/* Preselected Context Banner */}
            {(selectedRoadmapId || selectedTopic) && (
              <div className="card p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-dark-400 text-sm">Preselected from topic</p>
                  <p className="text-white font-semibold">{selectedTopic?.title || 'Topic'}</p>
                  <p className="text-dark-400 text-sm">{roadmaps.find(r => r._id === selectedRoadmapId)?.title || 'Roadmap'}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedRoadmapId('');
                    setSelectedTopic(null);
                  }}
                  className="btn-ghost text-sm"
                >
                  Change selection
                </button>
              </div>
            )}

              {/* Roadmap Selection */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Select a Roadmap</h2>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {roadmaps.length > 0 ? (
                    roadmaps.map((rm) => (
                      <button
                        key={rm._id}
                        onClick={() => setSelectedRoadmapId(rm._id)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          selectedRoadmapId === rm._id
                            ? 'bg-primary-500/20 border border-primary-500'
                            : 'bg-dark-800 hover:bg-dark-700'
                        }`}
                      >
                        <h3 className="font-medium text-white">{rm.title}</h3>
                        <p className="text-dark-500 text-sm">{rm.role?.name || 'Roadmap'}</p>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-dark-400">Enroll in a roadmap to access topics for practice</p>
                      <a
                        href="/roadmaps"
                        className="btn-primary inline-flex justify-center"
                      >
                        Go to Roadmaps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Topic Selection */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Select a Topic</h2>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {topics.length > 0 ? (
                    topics.map((topic) => (
                      <button
                        key={topic._id}
                        onClick={() => setSelectedTopic(topic)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          selectedTopic?._id === topic._id
                            ? 'bg-primary-500/20 border border-primary-500'
                            : 'bg-dark-800 hover:bg-dark-700'
                        }`}
                      >
                        <h3 className="font-medium text-white">{topic.title}</h3>
                        <p className="text-dark-500 text-sm">{topic.roadmapTitle}</p>
                      </button>
                    ))
                  ) : (
                    <p className="text-dark-400 text-center py-4">
                      {selectedRoadmapId
                        ? 'No topics available in this roadmap yet'
                        : 'Select a roadmap to view its topics'}
                    </p>
                  )}
                </div>
              </div>

            {/* Settings */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Quiz Settings</h2>

              {/* Difficulty */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['easy', 'medium', 'hard'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-2 rounded-xl capitalize transition-all ${
                        difficulty === level
                          ? level === 'easy' ? 'bg-accent-500 text-white' :
                            level === 'medium' ? 'bg-amber-500 text-white' :
                            'bg-red-500 text-white'
                          : 'bg-dark-800 text-dark-400 hover:text-white'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Number of Questions
                </label>
                <div className="flex gap-3">
                  {[5, 10, 15, 20].map((count) => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`flex-1 py-2 rounded-xl transition-all ${
                        questionCount === count
                          ? 'bg-primary-500 text-black font-semibold ring-2 ring-primary-500/60'
                          : 'bg-dark-800 text-dark-400 hover:text-white'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Tutor Coach */}
            <div className="card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-white">AI Tutor Coach</h2>
                <p className="text-dark-400 text-sm">Get Socratic hints and code critique in your preferred language.</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Socratic Feedback</h3>
                  <input
                    type="text"
                    value={socraticQuestion}
                    onChange={(e) => setSocraticQuestion(e.target.value)}
                    className="input"
                    placeholder="Paste a question..."
                  />
                  <textarea
                    rows={4}
                    value={socraticAnswer}
                    onChange={(e) => setSocraticAnswer(e.target.value)}
                    className="input"
                    placeholder="Your answer..."
                  />
                  <button
                    onClick={handleSocratic}
                    disabled={coachLoading}
                    className="btn-primary btn-sm"
                  >
                    {coachLoading ? 'Loading...' : 'Get Socratic Hint'}
                  </button>
                  {socraticResponse && (
                    <div className="bg-dark-800 rounded-xl p-3 text-dark-300 whitespace-pre-wrap">
                      {socraticResponse}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-white font-medium">Code Critique</h3>
                  <input
                    type="text"
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="input"
                    placeholder="Language (e.g., JavaScript, Python)"
                  />
                  <input
                    type="text"
                    value={codeTask}
                    onChange={(e) => setCodeTask(e.target.value)}
                    className="input"
                    placeholder="Task/Prompt (optional)"
                  />
                  <input
                    type="text"
                    value={codeGoals}
                    onChange={(e) => setCodeGoals(e.target.value)}
                    className="input"
                    placeholder="Goals (performance, readability, etc.)"
                  />
                  <textarea
                    rows={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="input font-mono"
                    placeholder="Paste your code here..."
                  />
                  <button
                    onClick={handleCodeCritique}
                    disabled={coachLoading}
                    className="btn-secondary btn-sm"
                  >
                    {coachLoading ? 'Loading...' : 'Get Code Critique'}
                  </button>
                  {codeResponse && (
                    <div className="bg-dark-800 rounded-xl p-3 text-dark-300 whitespace-pre-wrap">
                      {codeResponse}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStartQuiz}
              disabled={!selectedTopic || loading}
              className="btn-primary w-full py-4 text-lg"
            >
              {loading ? (
                <HiRefresh className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <HiPlay className="w-6 h-6 mr-2" />
                  Start Quiz
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Quiz Mode */}
        {mode === 'quiz' && questions.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Progress & Timer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-dark-400">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                timeLeft < 60 ? 'bg-red-500/20 text-red-400' : 'bg-dark-800 text-dark-300'
              }`}>
                <HiClock className="w-4 h-4" />
                <span className="font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Question */}
            <div className="card p-6">
              <h2 className="text-xl font-medium text-white mb-6">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {questions[currentQuestion].options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(currentQuestion, index)}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                      answers[currentQuestion] === index
                        ? 'bg-primary-500/20 border-2 border-primary-500'
                        : 'bg-dark-800 hover:bg-dark-700 border-2 border-transparent'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium ${
                      answers[currentQuestion] === index
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-700 text-dark-400'
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-white">{option}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="btn-ghost"
              >
                Previous
              </button>

              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(prev => prev + 1)}
                  className="btn-primary"
                >
                  Next
                  <HiArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-accent"
                >
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              )}
            </div>

            {/* Question Navigator */}
            <div className="flex flex-wrap gap-2 justify-center">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    currentQuestion === index
                      ? 'bg-primary-500 text-white'
                      : answers[index] !== undefined
                      ? 'bg-accent-500/20 text-accent-400'
                      : 'bg-dark-800 text-dark-400'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results Mode */}
        {mode === 'results' && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <div className="card p-8 text-center">
              <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 ${
                results.percentage >= 70 ? 'bg-accent-500/20' :
                results.percentage >= 50 ? 'bg-amber-500/20' : 'bg-red-500/20'
              }`}>
                {results.percentage >= 70 ? (
                  <HiAcademicCap className="w-12 h-12 text-accent-400" />
                ) : results.percentage >= 50 ? (
                  <HiLightBulb className="w-12 h-12 text-amber-400" />
                ) : (
                  <HiRefresh className="w-12 h-12 text-red-400" />
                )}
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {results.percentage >= 70 ? 'Great Job!' :
                 results.percentage >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
              </h2>
              <p className="text-4xl font-bold text-primary-400 mb-2">
                {results.score}/{results.total}
              </p>
              <p className="text-dark-400">
                You scored {results.percentage}%
              </p>
            </div>

            {/* Answers Review */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Review Answers</h2>
              <div className="space-y-4">
                {questions.map((question, index) => {
                  const isCorrect = answers[index] === question.correctIndex;
                  return (
                    <div key={index} className="p-4 bg-dark-800 rounded-xl">
                      <div className="flex items-start gap-3 mb-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isCorrect ? 'bg-accent-500' : 'bg-red-500'
                        }`}>
                          {isCorrect ? (
                            <HiCheck className="w-4 h-4 text-white" />
                          ) : (
                            <HiX className="w-4 h-4 text-white" />
                          )}
                        </span>
                        <p className="text-white flex-1">{question.question}</p>
                      </div>
                      <div className="ml-9 space-y-2">
                        {!isCorrect && (
                          <p className="text-red-400 text-sm">
                            Your answer: {question.options[answers[index]]}
                          </p>
                        )}
                        <p className="text-accent-400 text-sm">
                          Correct answer: {question.options[question.correctIndex]}
                        </p>
                        {question.explanation && (
                          <p className="text-dark-400 text-sm mt-2">
                            💡 {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setMode('setup');
                  setQuestions([]);
                  setAnswers({});
                  setResults(null);
                }}
                className="btn-secondary flex-1"
              >
                New Quiz
              </button>
              <button
                onClick={handleStartQuiz}
                className="btn-primary flex-1"
              >
                <HiRefresh className="w-4 h-4 mr-2" />
                Retry Same Topic
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
