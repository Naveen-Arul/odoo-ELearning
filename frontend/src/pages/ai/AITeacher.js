/**
 * SkillForge AI - AI Teacher Page
 * Get explanations and learn concepts
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiAcademicCap, HiPaperAirplane, HiLightBulb, HiBookOpen,
  HiCode, HiSparkles, HiRefresh
} from 'react-icons/hi';
import ReactMarkdown from 'react-markdown';
import { aiAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const SUGGESTED_TOPICS = [
  'Explain Object-Oriented Programming',
  'What is REST API?',
  'How does React Virtual DOM work?',
  'Explain Database Normalization',
  'What are Design Patterns?',
  'Explain Big O Notation'
];

export default function AITeacher() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! 👋 I'm your AI Teacher. I can explain programming concepts, answer technical questions, and help you understand complex topics. What would you like to learn today?`
    }]);
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
        context: 'teaching',
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
    setMessages([{
      role: 'assistant',
      content: `Hello ${user?.name || 'there'}! 👋 I'm your AI Teacher. What would you like to learn today?`
    }]);
    setSessionId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-4 lg:-m-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:px-6 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500
                        flex items-center justify-center shadow-lg shadow-primary-500/20">
            <HiAcademicCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">AI Teacher</h1>
            <p className="text-muted-foreground text-xs">Learn concepts and get explanations</p>
          </div>
        </div>
        <button
          onClick={handleNewChat}
          className="btn-ghost text-xs hover:bg-muted/50"
        >
          <HiRefresh className="w-3 h-3 mr-1.5" />
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 scroll-smooth">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm ${message.role === 'user'
              ? 'bg-primary-500'
              : 'bg-gradient-to-br from-primary-500 to-secondary-500'
              }`}>
              {message.role === 'user' ? (
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              ) : (
                <HiAcademicCap className="w-4 h-4 text-white" />
              )}
            </div>
            <div className={`max-w-3xl rounded-2xl px-4 py-2 text-sm shadow-sm ${message.role === 'user'
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500
                          flex items-center justify-center shadow-sm">
              <HiAcademicCap className="w-4 h-4 text-white" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 lg:p-6 border-t border-border bg-card/50 backdrop-blur-sm">
        {/* Suggested Topics */}
        {messages.length <= 1 && (
          <div className="mb-3 overflow-x-auto pb-2 scrollbar-none">
            <p className="text-muted-foreground text-xs mb-2 font-medium px-1">Suggested topics:</p>
            <div className="flex gap-2">
              {SUGGESTED_TOPICS.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(topic)}
                  className="px-3 py-1.5 bg-muted/50 hover:bg-primary/10 hover:text-primary
                           border border-border hover:border-primary/20 rounded-full text-xs
                           text-muted-foreground transition-all whitespace-nowrap"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask AI Teacher..."
            rows={1}
            className="input flex-1 resize-none min-h-[44px] max-h-32 text-sm py-3 pl-4 pr-12 rounded-xl
                     bg-muted/30 focus:bg-background transition-colors border-border/50 shadow-sm"
            style={{ height: 'auto' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-1.5 top-1.5 p-2 btn-primary rounded-lg shadow-sm"
          >
            <HiPaperAirplane className="w-4 h-4 rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
}
