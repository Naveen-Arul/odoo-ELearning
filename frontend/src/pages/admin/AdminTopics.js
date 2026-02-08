/**
 * SkillForge AI - Admin Topics Management
 * CRUD operations for learning topics with YouTube video auto-generation
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiPencil, HiTrash, HiSearch, HiX,
  HiBookOpen, HiPlay, HiCheck, HiLink, HiSparkles,
  HiRefresh, HiExternalLink
} from 'react-icons/hi';
import { adminAPI, roadmapsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminTopics() {
  const [searchParams] = useSearchParams();
  const [topics, setTopics] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoadmap, setSelectedRoadmap] = useState(searchParams.get('roadmap') || '');
  const [showModal, setShowModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    roadmap: '',
    order: 0,
    videoLinks: { english: '', tamil: '', hindi: '' },
    documentation: '',
    estimatedDuration: 30,
    isActive: true
  });

  // Video generation state
  const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);
  const [videoSuggestions, setVideoSuggestions] = useState([]);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [selectedVideoLang, setSelectedVideoLang] = useState('english');
  const [generatedContent, setGeneratedContent] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedRoadmap]);

  const getRoadmapTitle = (topic) => {
    const roadmapId = topic.roadmap?._id || topic.roadmap;
    return roadmaps.find((roadmap) => roadmap._id === roadmapId)?.title || topic.roadmap?.title || 'No roadmap';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [topicsRes, roadmapsRes] = await Promise.all([
        adminAPI.getTopics(selectedRoadmap ? { roadmapId: selectedRoadmap } : {}),
        adminAPI.getRoadmaps()
      ]);
      setTopics(topicsRes.data.data || []);
      setRoadmaps(roadmapsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        title: topic.title || '',
        description: topic.description || '',
        roadmap: topic.roadmap?._id || topic.roadmap || '',
        order: topic.order || 0,
        videoLinks: {
          english: topic.videoLinks?.english?.url || '',
          tamil: topic.videoLinks?.tamil?.url || '',
          hindi: topic.videoLinks?.hindi?.url || ''
        },
        documentation: topic.documentation?.content || '',
        estimatedDuration: topic.estimatedDuration || 30,
        isActive: topic.isActive !== false
      });
    } else {
      setEditingTopic(null);
      setFormData({
        title: '',
        description: '',
        roadmap: selectedRoadmap || '',
        order: topics.length,
        videoLinks: { english: '', tamil: '', hindi: '' },
        documentation: '',
        estimatedDuration: 30,
        isActive: true
      });
    }
    setVideoSuggestions([]);
    setShowVideoSuggestions(false);
    setGeneratedContent(null);
    setShowModal(true);
  };

  // Generate YouTube videos based on topic title
  const handleGenerateVideos = async (language = 'english') => {
    if (!formData.title || formData.title.length < 3) {
      toast.error('Enter a topic title (min 3 characters) first');
      return;
    }

    setGeneratingVideos(true);
    setSelectedVideoLang(language);

    try {
      const response = await adminAPI.generateTopicVideos({
        title: formData.title,
        language,
        roadmapId: formData.roadmap,
        minRelevance: 50, // Lowered from 90 to find more videos
        generateContent: !formData.description && !formData.documentation
      });

      const { videos, generatedContent: content } = response.data.data;

      setVideoSuggestions(videos);
      setShowVideoSuggestions(true);

      if (content) {
        setGeneratedContent(content);
      }

      if (videos.length === 0) {
        toast('No videos found. Try a different title or language.', { icon: '🔍' });
      } else {
        toast.success(`Found ${videos.length} relevant videos (sorted by popularity)`);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to generate videos';
      toast.error(message);
    } finally {
      setGeneratingVideos(false);
    }
  };


  // Select a video and fill the URL + auto-set duration
  const handleSelectVideo = (video) => {
    setFormData(prev => ({
      ...prev,
      videoLinks: {
        ...prev.videoLinks,
        [selectedVideoLang]: video.url
      },
      // Auto-set duration from video (only if not already set or this is English/primary video)
      estimatedDuration: selectedVideoLang === 'english' || !prev.estimatedDuration
        ? (video.duration || prev.estimatedDuration)
        : prev.estimatedDuration
    }));
    toast.success(`${selectedVideoLang.charAt(0).toUpperCase() + selectedVideoLang.slice(1)} video selected (${video.duration || '?'} min)`);
  };

  // Apply generated content (description, documentation, and duration)
  const handleApplyGeneratedContent = () => {
    if (generatedContent) {
      setFormData(prev => ({
        ...prev,
        description: generatedContent.description || prev.description,
        documentation: generatedContent.documentation || prev.documentation,
        estimatedDuration: generatedContent.estimatedDuration || prev.estimatedDuration
      }));
      toast.success('Generated content applied');
      setGeneratedContent(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description);
    payload.append('roadmapId', formData.roadmap);
    payload.append('estimatedDuration', String(formData.estimatedDuration || 0));
    payload.append('isActive', String(formData.isActive));
    payload.append('videoEnglish', formData.videoLinks.english || '');
    payload.append('videoTamil', formData.videoLinks.tamil || '');
    payload.append('videoHindi', formData.videoLinks.hindi || '');

    if (formData.documentation?.trim()) {
      payload.append('documentationTitle', formData.title);
      payload.append('documentationContent', formData.documentation);
    }

    try {
      if (editingTopic) {
        await adminAPI.updateTopic(editingTopic._id, payload);
        toast.success('Topic updated successfully');
      } else {
        await adminAPI.createTopic(payload);
        toast.success('Topic created successfully');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save topic');
    }
  };

  const handleDelete = async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) return;

    try {
      await adminAPI.deleteTopic(topicId);
      // Remove from local state immediately
      setTopics((prev) => prev.filter((t) => t._id !== topicId));
      toast.success('Topic deleted');
    } catch (error) {
      toast.error('Failed to delete topic');
    }
  };

  const filteredTopics = topics.filter(topic =>
    topic.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get relevance badge color
  const getRelevanceBadgeColor = (relevance) => {
    if (relevance >= 95) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (relevance >= 90) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">Topics</h1>
          <p className="text-dark-400 mt-1">Manage learning content and videos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <HiPlus className="w-5 h-5 mr-2" />
          Add Topic
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
            placeholder="Search topics..."
          />
        </div>
        <select
          value={selectedRoadmap}
          onChange={(e) => setSelectedRoadmap(e.target.value)}
          className="input w-full sm:w-64"
        >
          <option value="">All Roadmaps</option>
          {roadmaps.map((roadmap) => (
            <option key={roadmap._id} value={roadmap._id}>
              {roadmap.title}
            </option>
          ))}
        </select>
      </div>

      {/* Topics List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTopics.map((topic, index) => (
            <motion.div
              key={topic._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="card p-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-secondary-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-secondary-400 font-medium">{topic.order || index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-white">{topic.title}</h3>
                      <p className="text-dark-400 text-sm line-clamp-1">
                        {topic.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-dark-500">
                        <span>{getRoadmapTitle(topic)}</span>
                        <span>•</span>
                        <span>{topic.estimatedDuration || 30} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Video Status */}
                      <div className="flex gap-1">
                        {['english', 'tamil', 'hindi'].map((lang) => (
                          <span
                            key={lang}
                            className={`w-6 h-6 rounded flex items-center justify-center text-xs ${topic.videoLinks?.[lang]?.url
                              ? 'bg-accent-500/20 text-accent-400'
                              : 'bg-dark-700 text-dark-500'
                              }`}
                            title={`${lang.charAt(0).toUpperCase() + lang.slice(1)} video`}
                          >
                            {lang.charAt(0).toUpperCase()}
                          </span>
                        ))}
                      </div>

                      <span className={`badge ${topic.isActive ? 'badge-accent' : 'badge-secondary'}`}>
                        {topic.isActive ? 'Active' : 'Inactive'}
                      </span>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenModal(topic)}
                          className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white transition-colors"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(topic._id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 text-dark-400 hover:text-red-400 transition-colors"
                        >
                          <HiTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {filteredTopics.length === 0 && !loading && (
        <div className="text-center py-12">
          <HiBookOpen className="w-12 h-12 text-dark-600 mx-auto mb-3" />
          <p className="text-dark-400">No topics found</p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingTopic ? 'Edit Topic' : 'Add New Topic'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-700 text-dark-400"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="input"
                      required
                      placeholder="e.g., Introduction to React"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Roadmap *
                    </label>
                    <select
                      value={formData.roadmap}
                      onChange={(e) => setFormData({ ...formData, roadmap: e.target.value })}
                      className="input"
                      required
                    >
                      <option value="">Select a roadmap</option>
                      {roadmaps.map((roadmap) => (
                        <option key={roadmap._id} value={roadmap._id}>
                          {roadmap.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input h-20"
                    placeholder="Brief description of the topic..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      className="input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })}
                      className="input"
                    />
                  </div>
                </div>

                {/* Video Links with Auto-Generate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-dark-300">
                      <HiPlay className="w-4 h-4 inline mr-1" />
                      Video Links (YouTube)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleGenerateVideos(selectedVideoLang)}
                      disabled={generatingVideos || formData.title.length < 3}
                      className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                    >
                      {generatingVideos ? (
                        <>
                          <HiRefresh className="w-4 h-4 mr-1 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <HiSparkles className="w-4 h-4 mr-1" />
                          Auto-Generate Videos
                        </>
                      )}
                    </button>
                  </div>

                  {/* Language tabs for video generation */}
                  <div className="flex gap-2 mb-3">
                    {['english', 'tamil', 'hindi'].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => {
                          setSelectedVideoLang(lang);
                          if (showVideoSuggestions) {
                            handleGenerateVideos(lang);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedVideoLang === lang
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-700 text-dark-400 hover:text-white'
                          }`}
                      >
                        {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        {formData.videoLinks[lang] && (
                          <HiCheck className="w-3 h-3 inline ml-1 text-green-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Video suggestions */}
                  <AnimatePresence>
                    {showVideoSuggestions && videoSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 bg-dark-800 rounded-lg border border-dark-700"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-dark-300">
                            Found {videoSuggestions.length} videos with ≥90% relevance
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowVideoSuggestions(false)}
                            className="text-dark-400 hover:text-white"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {videoSuggestions.map((video, idx) => (
                            <div
                              key={video.videoId || idx}
                              className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-700 transition-colors cursor-pointer group"
                              onClick={() => handleSelectVideo(video)}
                            >
                              {/* Thumbnail */}
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-24 h-16 object-cover rounded"
                              />

                              {/* Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm text-white font-medium line-clamp-2 group-hover:text-primary-400">
                                  {video.title}
                                </h4>
                                <p className="text-xs text-dark-500 mt-1">
                                  {video.channelTitle} • {video.duration || '?'} min
                                  {video.viewCountText && ` • ${video.viewCountText}`}
                                </p>
                              </div>

                              {/* Relevance badge */}
                              <div className={`px-2 py-1 rounded text-xs font-bold border ${getRelevanceBadgeColor(video.relevance)}`}>
                                {video.relevance}%
                              </div>

                              {/* Select button */}
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 bg-primary-500 text-white px-2 py-1 rounded text-xs transition-opacity"
                              >
                                Select
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Manual video URL inputs */}
                  <div className="space-y-2">
                    {['english', 'tamil', 'hindi'].map((lang) => (
                      <div key={lang} className="flex items-center gap-2">
                        <span className="w-16 text-dark-400 text-sm capitalize">{lang}:</span>
                        <input
                          type="url"
                          value={formData.videoLinks[lang] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            videoLinks: { ...formData.videoLinks, [lang]: e.target.value }
                          })}
                          className="input flex-1"
                          placeholder={`https://youtube.com/watch?v=...`}
                        />
                        {formData.videoLinks[lang] && (
                          <a
                            href={formData.videoLinks[lang]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-primary-400"
                          >
                            <HiExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated content suggestion */}
                {generatedContent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-accent-400">
                        <HiSparkles className="w-4 h-4 inline mr-1" />
                        AI-Generated Content Available
                      </span>
                      <button
                        type="button"
                        onClick={handleApplyGeneratedContent}
                        className="btn-primary text-xs py-1 px-3"
                      >
                        Apply Content
                      </button>
                    </div>
                    <p className="text-xs text-dark-400">
                      Description and documentation have been generated based on the video. Click "Apply Content" to use them.
                    </p>
                  </motion.div>
                )}

                {/* Documentation */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Documentation (Markdown)
                  </label>
                  <textarea
                    value={formData.documentation}
                    onChange={(e) => setFormData({ ...formData, documentation: e.target.value })}
                    className="input h-40 font-mono text-sm"
                    required={!editingTopic}
                    placeholder="# Topic Title&#10;&#10;Write your documentation in Markdown format..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-dark-300">
                    Active (visible to users)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    <HiCheck className="w-4 h-4 mr-2" />
                    {editingTopic ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
