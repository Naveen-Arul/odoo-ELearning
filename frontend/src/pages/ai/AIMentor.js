/**
 * SkillForge AI - AI Mentor Page
 * Career guidance and advice
 */

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiUserGroup, HiPaperAirplane, HiBriefcase, HiTrendingUp,
  HiLightBulb, HiRefresh, HiChartBar
} from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import { aiAPI, topicsAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const CAREER_TOPICS = [
  { icon: '🎯', label: 'Career Path', prompt: 'Help me plan my career path as a software developer' },
  { icon: '📝', label: 'Resume Tips', prompt: 'Give me tips to improve my software developer resume' },
  { icon: '💼', label: 'Job Search', prompt: 'How should I approach my job search in tech?' },
  { icon: '🤝', label: 'Interview Prep', prompt: 'How do I prepare for technical interviews?' },
  { icon: '💰', label: 'Salary Negotiation', prompt: 'How do I negotiate my salary as a developer?' },
  { icon: '📈', label: 'Skill Growth', prompt: 'What skills should I focus on to grow as a developer?' }
];

export default function AIMentor() {
  const [searchParams] = useSearchParams();
  const topicParamId = searchParams.get('topicId');
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [topicContext, setTopicContext] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const init = async () => {
      const roleInfo = user?.preferences?.targetRole?.name
        ? ` pursuing a career as a ${user.preferences.targetRole.name}`
        : '';
      let intro = `Hello ${user?.name || 'there'}! 🌟 I'm your AI Career Mentor. I'm here to help you navigate your tech career${roleInfo}. I can provide guidance on career paths, interview preparation, salary negotiation, and professional development. What's on your mind today?`;

      if (topicParamId) {
        try {
          const resp = await topicsAPI.getById(topicParamId);
          const t = resp.data.data;
          setTopicContext({ id: t._id, title: t.title, documentation: t.documentation });
          intro = `Hello ${user?.name || 'there'}! 🌟 I'm your AI Mentor. You're learning the topic "${t.title}". Ask me anything based on this topic's documentation, and I'll tailor guidance to it.`;
        } catch (e) {
          // ignore fetch errors
        }
      }

      setMessages([{ role: 'assistant', content: intro }]);
    };
    init();
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (messageText = input) => {
    if (!messageText.trim() || loading) return;

    const userMessage = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiAPI.mentorChat({
        message: messageText,
        context: topicContext
          ? { mode: 'topic', topicId: topicContext.id, title: topicContext.title, documentation: topicContext.documentation }
          : 'mentoring',
        userRole: user?.preferences?.targetRole?.name,
        sessionId
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.data.response
      };
      setMessages(prev => [...prev, assistantMessage]);

      if (response.data.data.sessionId) {
        setSessionId(response.data.data.sessionId);
      }
    } catch (error) {
      toast.error('Failed to get response');
      setMessages(prev => prev.filter(m => m !== userMessage));
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

  const handleNewChat = () => {
    const roleInfo = user?.preferences?.targetRole?.name
      ? ` pursuing a career as a ${user.preferences.targetRole.name}`
      : '';
    const intro = topicContext
      ? `Hello again! 🌟 Let's continue with the topic "${topicContext.title}". Ask me anything based on its documentation.`
      : `Hello again! 🌟 I'm ready to help you with your career${roleInfo}. What would you like to discuss?`;
    setMessages([{ role: 'assistant', content: intro }]);
    setSessionId(null);
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                        flex items-center justify-center">
            <HiUserGroup className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Mentor</h1>
            <p className="text-muted-foreground text-sm">Your career guide and advisor</p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="btn-ghost text-sm"
        >
          <HiRefresh className="w-4 h-4 mr-2" />
          New Chat
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar - Career Topics */}
        <div className="hidden lg:block w-64 space-y-3">
          <p className="text-muted-foreground text-sm font-medium">Quick Topics</p>
          {CAREER_TOPICS.map((topic, index) => (
            <button
              key={index}
              onClick={() => handleSend(topic.prompt)}
              disabled={loading}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted
                       hover:bg-accent transition-colors text-left border border-border"
            >
              <span className="text-xl">{topic.icon}</span>
              <span className="text-muted-foreground text-sm">{topic.label}</span>
            </button>
          ))}

          {/* User's Role */}
          {user?.role && (
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              <p className="text-purple-400 text-sm font-medium mb-1">Your Career Goal</p>
              <p className="text-foreground">{user.preferences?.targetRole?.name || 'Not set'}</p>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${message.role === 'user'
                    ? 'bg-primary-500'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                  {message.role === 'user' ? (
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  ) : (
                    <HiUserGroup className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-2xl rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                  }`}>
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </motion.div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500
                              flex items-center justify-center">
                  <HiUserGroup className="w-4 h-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile Quick Topics */}
          {messages.length <= 1 && (
            <div className="lg:hidden mb-4">
              <p className="text-muted-foreground text-sm mb-2">Quick topics:</p>
              <div className="flex flex-wrap gap-2">
                {CAREER_TOPICS.slice(0, 4).map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(topic.prompt)}
                    className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm
                             text-muted-foreground transition-colors flex items-center gap-2"
                  >
                    <span>{topic.icon}</span>
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask for career advice..."
              rows={1}
              className="input flex-1 resize-none min-h-12 max-h-32"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="btn-primary px-4"
            >
              <HiPaperAirplane className="w-5 h-5 rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
