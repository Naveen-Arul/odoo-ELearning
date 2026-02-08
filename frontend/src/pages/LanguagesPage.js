/**
 * SkillForge AI - Programming Languages Page
 * Browse and learn programming languages
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiSearch, HiCode, HiBookOpen, HiChevronRight } from 'react-icons/hi';
import { languagesAPI } from '../services/api';

const languageIcons = {
  python: '🐍',
  javascript: '💛',
  'javascript': '💛',
  java: '☕',
  'java': '☕',
  c: '⚡',
  'c': '⚡',
  'c++': '⚡',
  cpp: '⚡',
  csharp: '💜',
  'c#': '💜',
  go: '🔵',
  rust: '🦀',
  typescript: '💙',
  'typescript': '💙',
  ruby: '💎',
  php: '🐘',
  swift: '🧡',
  kotlin: '🟣',
};

const renderLanguageIcon = (language, sizeClass = 'text-4xl') => {
  // Prioritize uploaded logo from admin
  if (language.logo) {
    const logoUrl = language.logo.startsWith('/uploads/')
      ? `${process.env.PUBLIC_URL || ''}${language.logo}`
      : `${process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5001'}${language.logo}`;
    return (
      <img
        src={logoUrl}
        alt={language.name}
        className="w-12 h-12 object-contain"
        onError={(e) => {
          // Hide image and show emoji/icon fallback
          e.target.style.display = 'none';
          const fallback = e.target.parentElement?.querySelector('[data-emoji]');
          if (fallback) fallback.style.display = 'block';
        }}
      />
    );
  }

  // Final fallback to emoji/icon
  const langName = language?.name?.toLowerCase() || '';
  return (
    <span className={sizeClass}>
      {language.icon || languageIcons[langName] || '💻'}
    </span>
  );
};

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [myProgress, setMyProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [languagesRes, progressRes] = await Promise.all([
        languagesAPI.getAll(),
        languagesAPI.getMyProgress()
      ]);
      setLanguages(languagesRes.data.data || []);
      setMyProgress(progressRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (languageId) => {
    return myProgress.find(p => p.language === languageId);
  };

  const filteredLanguages = languages.filter(lang => {
    const matchesSearch = lang.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || lang.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Programming Languages</h1>
        <p className="text-muted-foreground mt-1">
          Master programming languages with structured tutorials and exercises
        </p>
      </div>

      {/* My Progress */}
      {myProgress.length > 0 && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">Continue Learning</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
            {myProgress.map((progress) => {
              const lang = languages.find(l => l._id === progress.language);
              if (!lang) return null;
              return (
                <Link
                  key={progress._id}
                  to={`/languages/${lang._id}`}
                  className="flex-shrink-0 bg-muted/40 rounded-lg p-4 hover:bg-muted/60
                             transition-colors min-w-48"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {renderLanguageIcon(lang, 'text-3xl')}
                    <div>
                      <h3 className="font-medium text-foreground">{lang.name}</h3>
                      <p className="text-muted-foreground text-sm">{lang.level}</p>
                    </div>
                  </div>
                  <div className="progress mb-2">
                    <div
                      className="progress-bar"
                      style={{ width: `${progress.progressPercentage || 0}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {progress.progressPercentage || 0}% complete
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
            placeholder="Search languages..."
          />
        </div>
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="input py-2 w-40"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Languages Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-xl mb-4" />
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLanguages.map((language, index) => {
            const progress = getProgress(language._id);
            return (
              <motion.div
                key={language._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-hover p-6"
              >
                <div className="flex items-start gap-4 mb-4">
                  {renderLanguageIcon(language)}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{language.name}</h3>
                    <span className={`badge ${language.level === 'beginner' ? 'badge-accent' :
                        language.level === 'intermediate' ? 'badge-warning' : 'badge-danger'
                      }`}>
                      {language.level}
                    </span>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {language.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <HiBookOpen className="w-4 h-4" />
                    <span>{language.topicsCount || 0} topics</span>
                  </div>
                </div>

                {progress && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground">{progress.progressPercentage || 0}%</span>
                    </div>
                    <div className="progress">
                      <div
                        className="progress-bar"
                        style={{ width: `${progress.progressPercentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                <Link
                  to={`/languages/${language._id}`}
                  className="btn-primary w-full justify-center"
                >
                  {progress ? 'Continue' : 'Start Learning'}
                  <HiChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
