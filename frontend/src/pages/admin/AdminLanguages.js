/**
 * SkillForge AI - Admin Languages Management
 * CRUD operations for programming languages and their topics
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlus, HiPencil, HiTrash, HiSearch, HiX,
  HiCode, HiBookOpen, HiUsers,
  HiChevronDown, HiChevronUp, HiSparkles, HiRefresh, HiExternalLink, HiCheck
} from 'react-icons/hi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminLanguages() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState(null);
  const [editingTopic, setEditingTopic] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [expandedLanguages, setExpandedLanguages] = useState(new Set());
  const [languageTopics, setLanguageTopics] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    logo: null,
    color: '#3B82F6',
    useCases: '',
    isActive: true
  });
  const [topicFormData, setTopicFormData] = useState({
    title: '',
    description: '',
    level: 'beginner',
    order: 0,
    keyConcepts: '',
    estimatedDuration: 0,
    videoLinks: { english: '', tamil: '', hindi: '' },
    isActive: true
  });

  // Video generation state
  const [showVideoSuggestions, setShowVideoSuggestions] = useState(false);
  const [videoSuggestions, setVideoSuggestions] = useState([]);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [selectedVideoLang, setSelectedVideoLang] = useState('english');

  const normalizeUseCases = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) return [value];
    return [];
  };

  const isImagePath = (value) => (
    typeof value === 'string' &&
    (value.startsWith('/') || /^https?:\/\//i.test(value) || /\.(png|jpe?g|gif|webp|svg)$/i.test(value))
  );

  const getLogoSrc = (logoPath) => {
    if (!logoPath) return '';
    if (/^https?:\/\//i.test(logoPath)) return logoPath;
    if (logoPath.startsWith('/logo/')) {
      return `${process.env.PUBLIC_URL || ''}${logoPath}`;
    }
    if (logoPath.startsWith('/uploads/')) {
      return `${process.env.PUBLIC_URL || ''}${logoPath}`;
    }
    const baseUrl = process.env.REACT_APP_API_URL?.replace('/api/v1', '') || 'http://localhost:5001';
    return `${baseUrl}${logoPath}`;
  };

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getLanguages();
      setLanguages(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      toast.error('Failed to load languages');
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguageTopics = async (languageId) => {
    if (languageTopics[languageId]) return; // Already loaded

    try {
      const response = await adminAPI.getLanguageTopics(languageId);
      setLanguageTopics(prev => ({
        ...prev,
        [languageId]: response.data.data || []
      }));
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Failed to load topics');
    }
  };

  const toggleExpanded = async (languageId) => {
    const newExpanded = new Set(expandedLanguages);
    if (newExpanded.has(languageId)) {
      newExpanded.delete(languageId);
    } else {
      newExpanded.add(languageId);
      await fetchLanguageTopics(languageId);
    }
    setExpandedLanguages(newExpanded);
  };

  const handleOpenModal = (language = null) => {
    if (language) {
      setEditingLanguage(language);
      setFormData({
        name: language.name || '',
        description: language.description || '',
        icon: language.icon || '',
        logo: null,
        color: language.color || '#3B82F6',
        useCases: normalizeUseCases(language.useCases).join(', ') || '',
        isActive: language.isActive !== false
      });
    } else {
      setEditingLanguage(null);
      setFormData({
        name: '',
        description: '',
        icon: '',
        logo: null,
        color: '#3B82F6',
        useCases: '',
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleOpenTopicModal = (language, topic = null) => {
    setSelectedLanguage(language);
    if (topic) {
      setEditingTopic(topic);
      setTopicFormData({
        title: topic.title || '',
        description: topic.description || '',
        level: topic.level || 'beginner',
        order: topic.order || 0,
        keyConcepts: topic.keyConcepts?.join(', ') || '',
        estimatedDuration: topic.estimatedDuration || 0,
        videoLinks: {
          english: topic.videoLinks?.english?.url || topic.videoLinks?.english || '',
          tamil: topic.videoLinks?.tamil?.url || topic.videoLinks?.tamil || '',
          hindi: topic.videoLinks?.hindi?.url || topic.videoLinks?.hindi || ''
        },
        isActive: topic.isActive !== false
      });
    } else {
      setEditingTopic(null);
      setTopicFormData({
        title: '',
        description: '',
        level: 'beginner',
        order: 0,
        keyConcepts: '',
        estimatedDuration: 0,
        videoLinks: { english: '', tamil: '', hindi: '' },
        isActive: true
      });
    }
    setShowTopicModal(true);
    setShowVideoSuggestions(false);
    setVideoSuggestions([]);
  };

  // Generate YouTube videos based on topic title and language
  const handleGenerateVideos = async (language = 'english') => {
    if (!topicFormData.title || topicFormData.title.length < 3) {
      toast.error('Enter a topic title (min 3 characters) first');
      return;
    }

    setGeneratingVideos(true);
    setSelectedVideoLang(language);

    try {
      const response = await adminAPI.generateTopicVideos({
        title: `${selectedLanguage?.name || ''} ${topicFormData.title}`,
        language,
        skillLevel: topicFormData.level,
        minRelevance: 50
      });

      const { videos } = response.data.data;
      setVideoSuggestions(videos);
      setShowVideoSuggestions(true);

      if (videos.length === 0) {
        toast(`No ${language} videos found. Try a different title.`, { icon: '🔍' });
      } else {
        toast.success(`Found ${videos.length} ${language} videos`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to search videos');
    } finally {
      setGeneratingVideos(false);
    }
  };

  // Select a video
  const handleSelectVideo = (video) => {
    setTopicFormData(prev => ({
      ...prev,
      videoLinks: {
        ...prev.videoLinks,
        [selectedVideoLang]: video.url
      },
      estimatedDuration: prev.estimatedDuration || video.duration || 30
    }));
    toast.success(`${selectedVideoLang.charAt(0).toUpperCase() + selectedVideoLang.slice(1)} video selected`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitData = new FormData();
    submitData.append('name', formData.name);
    submitData.append('description', formData.description);
    submitData.append('icon', formData.icon);
    submitData.append('color', formData.color);
    submitData.append('isActive', formData.isActive);

    // Handle useCases array
    const useCasesArray = formData.useCases.split(',').map(uc => uc.trim()).filter(Boolean);
    useCasesArray.forEach(uc => submitData.append('useCases[]', uc));

    // Add logo file if selected
    if (formData.logo) {
      submitData.append('logo', formData.logo);
    }

    try {
      if (editingLanguage) {
        await adminAPI.updateLanguage(editingLanguage._id, submitData);
        toast.success('Language updated successfully');
      } else {
        await adminAPI.createLanguage(submitData);
        toast.success('Language created successfully');
      }
      setShowModal(false);
      fetchLanguages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save language');
    }
  };

  const handleTopicSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...topicFormData,
      keyConcepts: topicFormData.keyConcepts.split(',').map(kc => kc.trim()).filter(Boolean),
      videoLinks: {
        english: topicFormData.videoLinks.english ? { url: topicFormData.videoLinks.english } : undefined,
        tamil: topicFormData.videoLinks.tamil ? { url: topicFormData.videoLinks.tamil } : undefined,
        hindi: topicFormData.videoLinks.hindi ? { url: topicFormData.videoLinks.hindi } : undefined
      }
    };

    try {
      if (editingTopic) {
        await adminAPI.updateLanguageTopic(editingTopic._id, data);
        toast.success('Topic updated successfully');
      } else {
        await adminAPI.createLanguageTopic(selectedLanguage._id, data);
        toast.success('Topic created successfully');
      }
      setShowTopicModal(false);
      // Refresh topics for this language
      const response = await adminAPI.getLanguageTopics(selectedLanguage._id);
      setLanguageTopics(prev => ({
        ...prev,
        [selectedLanguage._id]: response.data.data || []
      }));
      fetchLanguages(); // Refresh to update counts
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save topic');
    }
  };

  const handleDelete = async (languageId) => {
    if (!window.confirm('Are you sure you want to delete this language?')) return;

    try {
      await adminAPI.deleteLanguage(languageId);
      toast.success('Language deleted');
      fetchLanguages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete language');
    }
  };

  const handleDeleteTopic = async (topicId, languageId) => {
    if (!window.confirm('Are you sure you want to delete this topic?')) return;

    try {
      await adminAPI.deleteLanguageTopic(topicId);
      toast.success('Topic deleted');
      // Refresh topics
      const response = await adminAPI.getLanguageTopics(languageId);
      setLanguageTopics(prev => ({
        ...prev,
        [languageId]: response.data.data || []
      }));
      fetchLanguages();
    } catch (error) {
      toast.error('Failed to delete topic');
    }
  };

  const filteredLanguages = languages.filter(language =>
    language.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'beginner': return 'bg-emerald-500/15 text-emerald-500';
      case 'intermediate': return 'bg-amber-500/15 text-amber-500';
      case 'advanced': return 'bg-rose-500/15 text-rose-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <HiCode className="text-primary" />
            Programming Languages
          </h1>
          <p className="mt-2 text-muted-foreground">Manage programming languages and their topics</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn btn-primary flex items-center gap-2"
        >
          <HiPlus className="w-5 h-5" />
          Add Language
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* Languages List */}
      <div className="space-y-4">
        {filteredLanguages.map((language) => {
          const isExpanded = expandedLanguages.has(language._id);
          const topics = languageTopics[language._id] || [];
          const totalTopics = language.topicsCount ?? (
            (language.levels?.beginner?.length || 0) +
            (language.levels?.intermediate?.length || 0) +
            (language.levels?.advanced?.length || 0)
          );
          const useCases = normalizeUseCases(language.useCases);

          const rawLogo = language.logo || (isImagePath(language.icon) ? language.icon : '');
          const logoSrc = getLogoSrc(rawLogo);

          return (
            <motion.div
              key={language._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card overflow-hidden"
            >
              {/* Language Header */}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0">
                        {logoSrc ? (
                          <img
                            src={logoSrc}
                            alt={language.name}
                            className="w-10 h-10 object-contain rounded-lg bg-muted/60 border border-border p-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        {language.icon && !isImagePath(language.icon) ? (
                          <span className={`text-3xl ${logoSrc ? 'hidden' : ''}`}>{language.icon}</span>
                        ) : (
                          <HiCode className={`w-10 h-10 text-muted-foreground ${logoSrc ? 'hidden' : ''}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-foreground">{language.name || 'Untitled'}</h3>
                          <span
                            className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: language.color || '#3B82F6' }}
                            title={`Color: ${language.color || '#3B82F6'}`}
                          />
                          {!language.isActive && (
                            <span className="badge badge-danger">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2">{language.description || 'No description available'}</p>
                      </div>
                    </div>
                    <div className="mt-3"></div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <HiBookOpen className="w-4 h-4" />
                        <span className="font-medium">{totalTopics}</span> topics
                      </span>
                      <span className="flex items-center gap-1.5">
                        <HiUsers className="w-4 h-4" />
                        <span className="font-medium">{language.stats?.learnerCount || 0}</span> learners
                      </span>
                      {useCases.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {useCases.slice(0, 2).join(' • ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpanded(language._id)}
                      className="p-2 text-muted-foreground hover:bg-muted/60 rounded-lg transition-colors"
                      title="View Topics"
                    >
                      {isExpanded ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => handleOpenTopicModal(language)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Add Topic"
                    >
                      <HiPlus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleOpenModal(language)}
                      className="p-2 text-muted-foreground hover:bg-muted/60 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <HiPencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(language._id)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Topics List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-muted/30"
                  >
                    <div className="p-6">
                      {topics.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No topics yet. Add one to get started!</p>
                      ) : (
                        <div className="space-y-2">
                          {topics.map((topic) => (
                            <div
                              key={topic._id}
                              className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-foreground">{topic.title}</h4>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${getLevelBadgeColor(topic.level)}`}>
                                    {topic.level}
                                  </span>
                                  {!topic.isActive && (
                                    <span className="badge badge-danger">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">{topic.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  <span>Order: {topic.order}</span>
                                  <span>Duration: {topic.estimatedDuration} mins</span>
                                  {topic.keyConcepts?.length > 0 && (
                                    <span>{topic.keyConcepts.length} concepts</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleOpenTopicModal(language, topic)}
                                  className="p-2 text-muted-foreground hover:bg-muted/60 rounded-lg transition-colors"
                                  title="Edit Topic"
                                >
                                  <HiPencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTopic(topic._id, language._id)}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Delete Topic"
                                >
                                  <HiTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {filteredLanguages.length === 0 && (
        <div className="text-center py-12">
          <HiCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">No languages found</p>
        </div>
      )}

      {/* Language Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {editingLanguage ? 'Edit Language' : 'Add New Language'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      Language Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input"
                      placeholder="e.g., Python, JavaScript"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="input"
                      placeholder="Brief description of the language..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Icon (emoji)
                      </label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="input"
                        placeholder="🐍"
                      />
                    </div>

                    <div>
                      <label className="label">
                        Color
                      </label>
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full h-10 px-3 py-1 border border-input rounded-lg bg-background"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      Logo Image (recommended)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFormData({ ...formData, logo: e.target.files[0] })}
                      className="input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Upload a logo image (PNG, JPG, SVG, WebP). Max 5MB.</p>
                    {editingLanguage?.logo && (
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={getLogoSrc(editingLanguage.logo)}
                          alt="Current logo"
                          className="w-12 h-12 object-contain border border-border rounded bg-muted/60 p-1"
                        />
                        <span className="text-xs text-muted-foreground">Current logo</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="label">
                      Use Cases (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.useCases}
                      onChange={(e) => setFormData({ ...formData, useCases: e.target.value })}
                      className="input"
                      placeholder="Web Development, Data Science, AI"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-foreground">
                      Active (visible to users)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                    >
                      {editingLanguage ? 'Update' : 'Create'} Language
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topic Modal */}
      <AnimatePresence>
        {showTopicModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
            onClick={() => setShowTopicModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-foreground">
                    {editingTopic ? 'Edit Topic' : 'Add New Topic'}
                  </h2>
                  <button
                    onClick={() => setShowTopicModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                {selectedLanguage && (
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm text-foreground">
                      Adding topic to: <strong>{selectedLanguage.name}</strong>
                    </p>
                  </div>
                )}

                <form onSubmit={handleTopicSubmit} className="space-y-4">
                  <div>
                    <label className="label">
                      Topic Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={topicFormData.title}
                      onChange={(e) => setTopicFormData({ ...topicFormData, title: e.target.value })}
                      className="input"
                      placeholder="e.g., Variables and Data Types"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={topicFormData.description}
                      onChange={(e) => setTopicFormData({ ...topicFormData, description: e.target.value })}
                      className="input"
                      placeholder="Brief description of the topic..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        Level *
                      </label>
                      <select
                        required
                        value={topicFormData.level}
                        onChange={(e) => setTopicFormData({ ...topicFormData, level: e.target.value })}
                        className="input"
                      >
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        Order
                      </label>
                      <input
                        type="number"
                        value={topicFormData.order}
                        onChange={(e) => setTopicFormData({ ...topicFormData, order: parseInt(e.target.value) || 0 })}
                        className="input"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      Estimated Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={topicFormData.estimatedDuration}
                      onChange={(e) => setTopicFormData({ ...topicFormData, estimatedDuration: parseInt(e.target.value) || 0 })}
                      className="input"
                      placeholder="30"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Key Concepts (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={topicFormData.keyConcepts}
                      onChange={(e) => setTopicFormData({ ...topicFormData, keyConcepts: e.target.value })}
                      className="input"
                      placeholder="Variables, Data Types, Type Conversion"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label">Video Links (YouTube)</label>
                      <button
                        type="button"
                        onClick={() => handleGenerateVideos(selectedVideoLang)}
                        disabled={generatingVideos || topicFormData.title.length < 3}
                        className="btn btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
                      >
                        {generatingVideos ? (
                          <>
                            <HiRefresh className="w-4 h-4 mr-1 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <HiSparkles className="w-4 h-4 mr-1" />
                            Auto-Find Videos
                          </>
                        )}
                      </button>
                    </div>

                    {/* Language tabs */}
                    <div className="flex gap-2 mb-3">
                      {['english', 'tamil', 'hindi'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setSelectedVideoLang(lang);
                            if (showVideoSuggestions) handleGenerateVideos(lang);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedVideoLang === lang
                              ? 'bg-primary/20 text-primary border border-primary/30'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          {topicFormData.videoLinks[lang] && (
                            <HiCheck className="w-3 h-3 inline ml-1 text-green-500" />
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
                          className="mb-4 p-3 bg-muted/50 rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">
                              Found {videoSuggestions.length} {selectedVideoLang} videos
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowVideoSuggestions(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {videoSuggestions.map((video, idx) => (
                              <div
                                key={video.videoId || idx}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer group"
                                onClick={() => handleSelectVideo(video)}
                              >
                                <img
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="w-24 h-16 object-cover rounded"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm text-foreground font-medium line-clamp-2 group-hover:text-primary">
                                    {video.title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {video.channelTitle} • {video.duration || '?'} min
                                    {video.viewCountText && ` • ${video.viewCountText}`}
                                  </p>
                                </div>
                                <div className="px-2 py-1 rounded text-xs font-bold bg-primary/10 text-primary">
                                  {video.relevance}%
                                </div>
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
                          <span className="w-16 text-muted-foreground text-sm capitalize">{lang}:</span>
                          <input
                            type="url"
                            value={topicFormData.videoLinks[lang] || ''}
                            onChange={(e) => setTopicFormData({
                              ...topicFormData,
                              videoLinks: { ...topicFormData.videoLinks, [lang]: e.target.value }
                            })}
                            className="input flex-1"
                            placeholder="https://youtube.com/watch?v=..."
                          />
                          {topicFormData.videoLinks[lang] && (
                            <a
                              href={topicFormData.videoLinks[lang]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary"
                            >
                              <HiExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="topicActive"
                      checked={topicFormData.isActive}
                      onChange={(e) => setTopicFormData({ ...topicFormData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary border-input rounded focus:ring-ring"
                    />
                    <label htmlFor="topicActive" className="text-sm font-medium text-foreground">
                      Active (visible to learners)
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTopicModal(false)}
                      className="btn btn-secondary flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary flex-1"
                    >
                      {editingTopic ? 'Update' : 'Create'} Topic
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
