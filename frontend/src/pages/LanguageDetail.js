/**
 * SkillForge AI - Language Detail Page
 * Learn a specific programming language
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactPlayer from 'react-player';
import {
  HiChevronLeft, HiPlay,
  HiCheck, HiLockClosed
} from 'react-icons/hi';
import { languagesAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function LanguageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState(null);
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTopic, setActiveTopic] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [selectedVideoLang, setSelectedVideoLang] = useState('english');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [langRes, topicsRes] = await Promise.all([
        languagesAPI.getById(id),
        languagesAPI.getTopics(id)
      ]);

      const languageData = langRes.data.data?.language || langRes.data.data;
      const userProgress = langRes.data.data?.userProgress || null;

      setLanguage(languageData);
      setTopics(topicsRes.data.data || []);
      setProgress(userProgress);

      // Set active topic to first incomplete topic or first topic
      const firstIncompleteTopic = topicsRes.data.data?.find(
        t => !userProgress?.completedTopics?.includes(t._id)
      );
      if (firstIncompleteTopic) {
        setActiveTopic(firstIncompleteTopic);
        setExpandedTopic(firstIncompleteTopic._id);
      } else if (topicsRes.data.data?.length > 0) {
        setActiveTopic(topicsRes.data.data[0]);
        setExpandedTopic(topicsRes.data.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch language:', error);
      toast.error('Failed to load language');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicComplete = async (topicId) => {
    try {
      await languagesAPI.completeTopic(topicId);
      toast.success('Topic marked as complete!');
      fetchData();
    } catch (error) {
      toast.error('Failed to update progress');
    }
  };

  const isTopicCompleted = (topicId) => {
    return progress?.completedTopics?.includes(topicId);
  };

  const getTopicStatus = (topic, index) => {
    if (isTopicCompleted(topic._id)) return 'completed';
    if (index === 0) return 'available';

    // Check if previous topic is completed
    const prevTopic = topics[index - 1];
    if (prevTopic && isTopicCompleted(prevTopic._id)) return 'available';

    return 'locked';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!language) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-400">Language not found</p>
        <Link to="/languages" className="btn-primary mt-4">
          Back to Languages
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/languages')}
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors"
        >
          <HiChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            {language.name}
          </h1>
          <p className="text-dark-400">{language.description}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Topics List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-white">Topics</h2>
          {topics.map((topic, index) => {
            const status = getTopicStatus(topic, index);
            return (
              <motion.div
                key={topic._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => {
                    if (status !== 'locked') {
                      setActiveTopic(topic);
                      setExpandedTopic(topic._id);
                    }
                  }}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    activeTopic?._id === topic._id
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : status === 'locked'
                      ? 'bg-dark-800/50 opacity-60 cursor-not-allowed'
                      : 'bg-dark-800 hover:bg-dark-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      status === 'completed' ? 'bg-accent-500' :
                      status === 'locked' ? 'bg-dark-600' : 'bg-primary-500'
                    }`}>
                      {status === 'completed' ? (
                        <HiCheck className="w-4 h-4 text-white" />
                      ) : status === 'locked' ? (
                        <HiLockClosed className="w-4 h-4 text-dark-400" />
                      ) : (
                        <span className="text-white text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{topic.title}</h3>
                      <p className="text-dark-400 text-sm">{topic.duration || '10 min'}</p>
                    </div>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {activeTopic ? (
            <div className="card overflow-hidden">
              {/* Video Content */}
              <div className="p-4 lg:p-6">
                <div className="space-y-4">
                  {/* Language Selector */}
                  <div className="flex gap-2">
                    {['english', 'tamil', 'hindi'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSelectedVideoLang(lang)}
                        className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                          selectedVideoLang === lang
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-700 text-dark-400 hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  {/* Video Player */}
                  <div className="aspect-video bg-dark-900 rounded-xl overflow-hidden">
                    {activeTopic.videoLinks?.[selectedVideoLang]?.url || activeTopic.videoLinks?.[selectedVideoLang] ? (
                      <ReactPlayer
                        url={activeTopic.videoLinks?.[selectedVideoLang]?.url || activeTopic.videoLinks[selectedVideoLang]}
                        width="100%"
                        height="100%"
                        controls
                        config={{
                          youtube: {
                            playerVars: { modestbranding: 1 }
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-dark-400">
                          No video available for {selectedVideoLang}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                      {activeTopic.title}
                    </h2>
                    <p className="text-dark-400">{activeTopic.description}</p>
                  </div>
                </div>
              </div>

              {/* Complete Button */}
              {!isTopicCompleted(activeTopic._id) && (
                <div className="p-4 border-t border-dark-700">
                  <button
                    onClick={() => handleTopicComplete(activeTopic._id)}
                    className="btn-accent w-full justify-center"
                  >
                    <HiCheck className="w-5 h-5 mr-2" />
                    Mark as Complete
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-dark-400">Select a topic to start learning</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
