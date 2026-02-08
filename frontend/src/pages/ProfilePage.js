/**
 * SkillForge AI - Profile Page
 * User profile with stats, achievements, and activity
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  HiUser, HiMail, HiCalendar, HiClock, HiAcademicCap,
  HiFire, HiTrendingUp, HiBadgeCheck, HiPencil, HiUpload, HiTrash, HiDocumentDownload, HiEye,
  HiCheckCircle, HiXCircle, HiRefresh, HiCog, HiBriefcase, HiCode
} from 'react-icons/hi';
import { FaGithub } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { userAPI, rolesAPI, careerAPI, badgesAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import UnifiedActivityDashboard from '../components/UnifiedActivityDashboard';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, updatePreferences } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [careerData, setCareerData] = useState({
    leetcodeUsername: '',
    githubUsername: ''
  });
  const [verification, setVerification] = useState({
    leetcode: { status: 'idle', message: '' }, // idle, verifying, valid, invalid
    github: { status: 'idle', message: '' }
  });
  const [isSavingCareer, setIsSavingCareer] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const getResumeLink = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    // Prepend backend URL for local uploads
    const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    // Remove /api/v1 suffix if present for static file access if static files are at root
    // In server.js: app.use('/uploads', ...)
    // So http://localhost:5000/uploads/...
    const baseUrl = backendUrl.replace(/\/api\/v1$/, '');
    return `${baseUrl}${url}`;
  };

  const [resumeUrl, setResumeUrl] = useState('');
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [verificationTimers, setVerificationTimers] = useState({
    leetcode: null,
    github: null
  });
  const [leetcodeStats, setLeetcodeStats] = useState(null);
  const [githubStats, setGithubStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshingLeetCode, setIsRefreshingLeetCode] = useState(false);
  const [isRefreshingGitHub, setIsRefreshingGitHub] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bio: ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [editingOnboarding, setEditingOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState({
    targetRole: '',
    skillLevel: '',
    dailyStudyTime: 60,
    preferredLanguage: 'english'
  });
  const [profileData, setProfileData] = useState({
    currentStatus: 'Student',
    skills: '',
    projects: [],
    experience: []
  });
  const [roles, setRoles] = useState([]);
  const [badges, setBadges] = useState([]);

  // GitHub Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState([]);

  useEffect(() => {
    fetchData();
    fetchRoles();
    fetchStats();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || ''
      });
      setAvatarPreview(user.avatar || null);
      setOnboardingData({
        targetRole: user.preferences?.targetRole?._id || user.preferences?.targetRole || '',
        skillLevel: user.preferences?.skillLevel || 'beginner',
        dailyStudyTime: (user.preferences?.dailyStudyTime || 1) * 60,
        preferredLanguage: user.preferences?.preferredLanguage || 'english'
      });
      setProfileData({
        currentStatus: user.currentStatus || 'Student',
        skills: user.skills ? user.skills.join(', ') : '',
        projects: user.projects || [],
        experience: user.experience || []
      });
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, careerRes] = await Promise.allSettled([
        userAPI.getAnalytics(),
        userAPI.getCareerData()
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data);
      }

      if (careerRes.status === 'fulfilled') {
        const career = careerRes.value.data.data;
        setCareerData({
          leetcodeUsername: career?.leetcodeUsername || '',
          githubUsername: career?.githubUsername || ''
        });
        setVerification(prev => ({
          leetcode: {
            status: career?.leetcodeUsername ? 'valid' : 'idle',
            message: career?.leetcodeUsername ? 'Verified' : ''
          },
          github: {
            status: career?.githubUsername ? 'valid' : 'idle',
            message: career?.githubUsername ? 'Verified' : ''
          }
        }));
        setResumeUrl(career?.resumeUrl || '');
      }

      // Fetch badges
      try {
        const badgesRes = await badgesAPI.getUserBadges(user.id);
        setBadges(badgesRes.data.data || []);
      } catch (e) {
        console.error('Failed to fetch badges', e);
      }
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      const [leetcodeRes, githubRes] = await Promise.allSettled([
        careerAPI.getLatestLeetCode(),
        careerAPI.getLatestGitHub()
      ]);

      if (leetcodeRes.status === 'fulfilled' && leetcodeRes.value.data.data) {
        setLeetcodeStats(leetcodeRes.value.data.data);
      }
      if (githubRes.status === 'fulfilled' && githubRes.value.data.data) {
        setGithubStats(githubRes.value.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const refreshLeetCodeStats = async () => {
    if (!careerData.leetcodeUsername) return;
    try {
      setIsRefreshingLeetCode(true);
      const response = await careerAPI.analyzeLeetCode({
        username: careerData.leetcodeUsername,
        forceRefresh: true
      });
      if (response.data.data) {
        setLeetcodeStats(response.data.data);
        toast.success('LeetCode stats refreshed!');
      }
    } catch (error) {
      toast.error('Failed to refresh LeetCode stats');
      console.error('LeetCode refresh error:', error);
    } finally {
      setIsRefreshingLeetCode(false);
    }
  };

  const refreshGitHubStats = async () => {
    if (!careerData.githubUsername) return;
    try {
      setIsRefreshingGitHub(true);
      const response = await careerAPI.analyzeGitHub({
        username: careerData.githubUsername,
        forceRefresh: true
      });
      if (response.data.data) {
        setGithubStats(response.data.data);
        toast.success('GitHub stats refreshed!');
      }
    } catch (error) {
      toast.error('Failed to refresh GitHub stats');
      console.error('GitHub refresh error:', error);
    } finally {
      setIsRefreshingGitHub(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.getAll({ limit: 100 });
      setRoles(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const handleSaveOnboarding = async () => {
    try {
      const preferences = {
        targetRole: onboardingData.targetRole,
        skillLevel: onboardingData.skillLevel,
        dailyStudyTime: Math.round(onboardingData.dailyStudyTime / 60),
        preferredLanguage: onboardingData.preferredLanguage
      };

      await updatePreferences(preferences);
      setEditingOnboarding(false);
      toast.success('Preferences updated successfully!');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  const handleSaveCareer = async () => {
    // Check if usernames are provided and verified
    if (careerData.leetcodeUsername) {
      if (verification.leetcode.status !== 'valid') {
        toast.error('Please verify your LeetCode username first');
        return;
      }
    }

    if (careerData.githubUsername) {
      if (verification.github.status !== 'valid') {
        toast.error('Please verify your GitHub username first');
        return;
      }
    }

    // At least one username should be provided
    if (!careerData.leetcodeUsername && !careerData.githubUsername) {
      toast.error('Please provide at least one username (LeetCode or GitHub)');
      return;
    }

    try {
      setIsSavingCareer(true);
      // Save career data to user profile
      await userAPI.updateCareerData(careerData);

      // Trigger fresh analyses with the new usernames
      if (careerData.leetcodeUsername) {
        careerAPI.analyzeLeetCode({ username: careerData.leetcodeUsername }).catch(err => {
          console.warn('Failed to re-analyze LeetCode:', err);
        });
      }

      if (careerData.githubUsername) {
        careerAPI.analyzeGitHub({ username: careerData.githubUsername }).catch(err => {
          console.warn('Failed to re-analyze GitHub:', err);
        });
      }

      toast.success('Career profiles updated successfully! Analyses will refresh shortly.');
    } catch (error) {
      toast.error('Failed to update career profiles');
    } finally {
      setIsSavingCareer(false);
    }
  };

  const verifyLeetCodeUsername = async (usernameToVerify = null) => {
    // Check if usernameToVerify is a string (not an event object from button click)
    const usernameValue = (typeof usernameToVerify === 'string' && usernameToVerify)
      ? usernameToVerify
      : careerData.leetcodeUsername;

    const username = usernameValue?.trim?.() || '';
    if (!username) {
      setVerification(prev => ({
        ...prev,
        leetcode: { status: 'idle', message: '' }
      }));
      return;
    }

    setVerification(prev => ({
      ...prev,
      leetcode: { status: 'verifying', message: 'Checking...' }
    }));

    try {
      const response = await userAPI.verifyLeetCode({ username });

      if (response.data.success && response.data.data.valid) {
        const { totalSolved } = response.data.data;

        setVerification(prev => ({
          ...prev,
          leetcode: {
            status: 'valid',
            message: `✓ User found (${totalSolved} problems solved)`
          }
        }));
        toast.success(`LeetCode user "${username}" verified!`);
      } else {
        setVerification(prev => ({
          ...prev,
          leetcode: { status: 'invalid', message: '✗ User not found on LeetCode' }
        }));
        toast.error(`LeetCode user "${username}" not found`);
      }
    } catch (error) {
      console.error('LeetCode verification error:', error);
      setVerification(prev => ({
        ...prev,
        leetcode: { status: 'invalid', message: '✗ Unable to verify. Please try again.' }
      }));
      toast.error('Failed to verify LeetCode username. Please check your connection.');
    }
  };

  const verifyGitHubUsername = async (usernameToVerify = null) => {
    // Check if usernameToVerify is a string (not an event object from button click)
    const usernameValue = (typeof usernameToVerify === 'string' && usernameToVerify)
      ? usernameToVerify
      : careerData.githubUsername;

    const username = usernameValue?.trim?.() || '';
    if (!username) {
      setVerification(prev => ({
        ...prev,
        github: { status: 'idle', message: '' }
      }));
      return;
    }

    setVerification(prev => ({
      ...prev,
      github: { status: 'verifying', message: 'Checking...' }
    }));

    try {
      const response = await userAPI.verifyGitHub({ username });

      if (response.data.success && response.data.data.valid) {
        const { publicRepos, followers } = response.data.data;

        setVerification(prev => ({
          ...prev,
          github: {
            status: 'valid',
            message: `✓ User found (${publicRepos} repos, ${followers} followers)`
          }
        }));
        toast.success(`GitHub user "${username}" verified!`);
      } else {
        setVerification(prev => ({
          ...prev,
          github: { status: 'invalid', message: '✗ User not found on GitHub' }
        }));
        toast.error(`GitHub user "${username}" not found`);
      }
    } catch (error) {
      console.error('GitHub verification error:', error);
      if (error.response?.status === 404) {
        setVerification(prev => ({
          ...prev,
          github: { status: 'invalid', message: '✗ User not found on GitHub' }
        }));
        toast.error(`GitHub user "${username}" not found`);
      } else {
        setVerification(prev => ({
          ...prev,
          github: { status: 'invalid', message: '✗ Unable to verify. Please try again.' }
        }));
        toast.error('Failed to verify GitHub username. Please check your connection.');
      }
    }
  };

  // Auto-verify on username change with debounce
  const handleLeetCodeUsernameChange = (value) => {
    setCareerData({ ...careerData, leetcodeUsername: value });
    setVerification(prev => ({ ...prev, leetcode: { status: 'idle', message: '' } }));

    // Clear existing timer
    if (verificationTimers.leetcode) {
      clearTimeout(verificationTimers.leetcode);
    }

    // Set new timer for auto-verification after 2 seconds of no typing
    if (value.trim()) {
      const timer = setTimeout(() => {
        verifyLeetCodeUsername(value);
      }, 2000);
      setVerificationTimers(prev => ({ ...prev, leetcode: timer }));
    }
  };

  const handleGitHubUsernameChange = (value) => {
    setCareerData({ ...careerData, githubUsername: value });
    setVerification(prev => ({ ...prev, github: { status: 'idle', message: '' } }));

    // Clear existing timer
    if (verificationTimers.github) {
      clearTimeout(verificationTimers.github);
    }

    // Set new timer for auto-verification after 2 seconds of no typing
    if (value.trim()) {
      const timer = setTimeout(() => {
        verifyGitHubUsername(value);
      }, 2000);
      setVerificationTimers(prev => ({ ...prev, github: timer }));
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setResumeFile(file);

    try {
      setIsSavingResume(true);
      const formData = new FormData();
      formData.append('resume', file);
      // Append other career data if needed, or backend can handle partial updates if designed so.
      // Our backend handles partial updates for careerData fields. 
      // But we need to make sure we don't accidentally overwrite/clear other fields if we send empty ones?
      // The backend uses $set on specific fields or merges. The current backend implementation 
      // updates `careerData.leetcodeUsername` etc if provided.
      // So sending just 'resume' file is safe with the update we made.

      const res = await userAPI.updateCareerData(formData);

      // Backend returns updated careerData
      setCareerData(res.data.data);
      setResumeUrl(res.data.data.resumeUrl);

      toast.success('Resume uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleRemoveResume = async () => {
    try {
      setIsSavingResume(true);
      await userAPI.updateCareerData({
        ...careerData,
        resumeUrl: ''
      });
      setResumeUrl('');
      setResumeFile(null);
      toast.success('Resume removed');
    } catch (error) {
      toast.error('Failed to remove resume');
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      let dataToSubmit = {
        ...formData,
        currentStatus: profileData.currentStatus,
        skills: profileData.skills.split(',').map(s => s.trim()).filter(Boolean),
        projects: profileData.projects,
        experience: profileData.experience
      };

      if (avatarFile) {
        const data = new FormData();
        data.append('name', formData.name);
        data.append('bio', formData.bio);
        data.append('avatar', avatarFile);
        data.append('currentStatus', profileData.currentStatus);
        data.append('skills', JSON.stringify(profileData.skills.split(',').map(s => s.trim()).filter(Boolean)));
        data.append('projects', JSON.stringify(profileData.projects));
        data.append('experience', JSON.stringify(profileData.experience));
        dataToSubmit = data;
      }

      await updateProfile(dataToSubmit);
      setEditing(false);
      setAvatarFile(null); // Reset file after save
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const fetchGithubRepos = async () => {
    if (!careerData.githubUsername) {
      toast.error('Please add your GitHub username in Career Profile first');
      return;
    }

    try {
      setLoadingRepos(true);

      const response = await fetch(
        `https://api.github.com/users/${careerData.githubUsername}/repos?per_page=100&sort=updated`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();

      if (!Array.isArray(repos) || repos.length === 0) {
        toast.info('No repositories found in your GitHub account');
        return;
      }

      // Get existing project URLs to prevent duplicates
      const existingProjectUrls = new Set(
        profileData.projects.map(proj => proj.link?.toLowerCase()).filter(Boolean)
      );

      // Filter out repos that are already in projects
      const newRepos = repos.filter(repo =>
        !existingProjectUrls.has(repo.html_url.toLowerCase())
      );

      if (newRepos.length === 0) {
        toast.info('All your GitHub repositories are already imported');
        return;
      }

      // Convert all new repos to project format
      const newProjects = newRepos.map(repo => ({
        title: repo.name,
        description: repo.description || '',
        link: repo.html_url,
        techStack: repo.language ? [repo.language] : [],
        imageUrl: '',
        startDate: new Date(repo.updated_at),
        isCurrent: false
      }));

      // Add all new projects to the profile
      setProfileData(prev => ({
        ...prev,
        projects: [...prev.projects, ...newProjects]
      }));

      toast.success(`Successfully imported ${newProjects.length} project${newProjects.length > 1 ? 's' : ''} from GitHub!`);
    } catch (error) {
      console.error('GitHub fetch error:', error);
      toast.error(`Failed to fetch repositories: ${error.message}`);
    } finally {
      setLoadingRepos(false);
    }
  };

  const toggleRepoSelection = (repo) => {
    if (selectedRepos.find(r => r.id === repo.id)) {
      setSelectedRepos(selectedRepos.filter(r => r.id !== repo.id));
    } else {
      setSelectedRepos([...selectedRepos, repo]);
    }
  };

  const importSelectedRepos = () => {
    const newProjects = selectedRepos.map(repo => ({
      title: repo.name,
      description: repo.description || '',
      link: repo.html_url,
      techStack: repo.language ? [repo.language] : [],
      imageUrl: '',
      startDate: new Date(repo.updated_at),
      isCurrent: false
    }));

    setProfileData(prev => ({
      ...prev,
      projects: [...prev.projects, ...newProjects]
    }));

    setShowImportModal(false);
    setSelectedRepos([]);
    toast.success(`Imported ${newProjects.length} projects`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500
                          flex items-center justify-center text-4xl font-bold text-white overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt={formData.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
              {editing && (
                <label className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                  <HiUpload className="w-8 h-8 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>
            {stats?.streak > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white
                            px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1">
                <HiFire className="w-3 h-3" />
                {stats.streak}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Your name"
                />
                <select
                  value={profileData.currentStatus}
                  onChange={(e) => setProfileData({ ...profileData, currentStatus: e.target.value })}
                  className="input"
                >
                  <option value="Student">Student</option>
                  <option value="Working">Working</option>
                  <option value="Open to Work">Open to Work</option>
                  <option value="Freelancing">Freelancing</option>
                  <option value="Looking for Internship">Looking for Internship</option>
                </select>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Tell us about yourself..."
                />
                <div className="flex gap-2">
                  <button onClick={handleSave} className="btn-primary">
                    Save
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
                  {user?.isAdmin && (
                    <span className="badge badge-danger">Admin</span>
                  )}
                </div>
                <p className="text-primary font-medium text-sm mb-2">{profileData.currentStatus}</p>
                <p className="text-dark-400 flex items-center justify-center sm:justify-start gap-2">
                  <HiMail className="w-4 h-4" />
                  {user?.email}
                </p>
                {user?.bio && (
                  <p className="text-dark-300 mt-2">{user.bio}</p>
                )}
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-dark-500">
                  <span className="flex items-center gap-1">
                    <HiCalendar className="w-4 h-4" />
                    Joined {new Date(user?.createdAt).toLocaleDateString('en-US', {
                      month: 'short', year: 'numeric'
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <HiBadgeCheck className="w-4 h-4" />
                    {user?.role?.title || 'Learner'}
                  </span>
                </div>
                <button
                  onClick={() => setEditing(true)}
                  className="btn-ghost mt-3 text-sm"
                >
                  <HiPencil className="w-4 h-4 mr-1" />
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Professional Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiBriefcase className="w-5 h-5" />
            Professional Profile
          </h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
              <HiPencil className="w-4 h-4 mr-1" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Skills (comma separated)</label>
              <input
                type="text"
                value={profileData.skills}
                onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                className="input w-full"
                placeholder="e.g. React, Node.js, Python"
              />
            </div>

            {/* Projects Edit */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-dark-300">Projects</label>
                <button
                  onClick={fetchGithubRepos}
                  className="text-xs flex items-center gap-1 text-white bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-600 transition-colors"
                >
                  <FaGithub /> Import from GitHub
                </button>
              </div>
              {profileData.projects.map((proj, idx) => (
                <div key={idx} className="p-3 bg-dark-800 rounded mb-2 space-y-2">
                  <input
                    placeholder="Project Title"
                    className="input w-full"
                    value={proj.title}
                    onChange={(e) => {
                      const newProjects = [...profileData.projects];
                      newProjects[idx].title = e.target.value;
                      setProfileData({ ...profileData, projects: newProjects });
                    }}
                  />
                  <textarea
                    placeholder="Description"
                    className="input w-full"
                    value={proj.description}
                    onChange={(e) => {
                      const newProjects = [...profileData.projects];
                      newProjects[idx].description = e.target.value;
                      setProfileData({ ...profileData, projects: newProjects });
                    }}
                  />
                  <input
                    placeholder="Tech Stack (comma separated)"
                    className="input w-full"
                    value={proj.techStack?.join(', ')}
                    onChange={(e) => {
                      const newProjects = [...profileData.projects];
                      newProjects[idx].techStack = e.target.value.split(',').map(s => s.trim());
                      setProfileData({ ...profileData, projects: newProjects });
                    }}
                  />
                  <button
                    onClick={() => {
                      const newProjects = profileData.projects.filter((_, i) => i !== idx);
                      setProfileData({ ...profileData, projects: newProjects });
                    }}
                    className="text-red-400 text-sm"
                  >
                    Remove Project
                  </button>
                </div>
              ))}
              <button
                onClick={() => setProfileData({
                  ...profileData,
                  projects: [...profileData.projects, { title: '', description: '', techStack: [] }]
                })}
                className="btn-secondary btn-sm"
              >
                + Add Project
              </button>
            </div>

            {/* Experience Edit */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Experience</label>
              {profileData.experience.map((exp, idx) => (
                <div key={idx} className="p-3 bg-dark-800 rounded mb-2 space-y-2">
                  <input
                    placeholder="Job Title"
                    className="input w-full"
                    value={exp.title}
                    onChange={(e) => {
                      const newExp = [...profileData.experience];
                      newExp[idx].title = e.target.value;
                      setProfileData({ ...profileData, experience: newExp });
                    }}
                  />
                  <input
                    placeholder="Company"
                    className="input w-full"
                    value={exp.company}
                    onChange={(e) => {
                      const newExp = [...profileData.experience];
                      newExp[idx].company = e.target.value;
                      setProfileData({ ...profileData, experience: newExp });
                    }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="input w-full"
                      value={exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const newExp = [...profileData.experience];
                        newExp[idx].startDate = e.target.value;
                        setProfileData({ ...profileData, experience: newExp });
                      }}
                    />
                    <input
                      type="date"
                      className="input w-full"
                      value={exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        const newExp = [...profileData.experience];
                        newExp[idx].endDate = e.target.value;
                        setProfileData({ ...profileData, experience: newExp });
                      }}
                    />
                  </div>
                  <textarea
                    placeholder="Description"
                    className="input w-full"
                    value={exp.description}
                    onChange={(e) => {
                      const newExp = [...profileData.experience];
                      newExp[idx].description = e.target.value;
                      setProfileData({ ...profileData, experience: newExp });
                    }}
                  />
                  <button
                    onClick={() => {
                      const newExp = profileData.experience.filter((_, i) => i !== idx);
                      setProfileData({ ...profileData, experience: newExp });
                    }}
                    className="text-red-400 text-sm"
                  >
                    Remove Experience
                  </button>
                </div>
              ))}
              <button
                onClick={() => setProfileData({
                  ...profileData,
                  experience: [...profileData.experience, { title: '', company: '', startDate: '', description: '' }]
                })}
                className="btn-secondary btn-sm"
              >
                + Add Experience
              </button>
            </div>

            <div className="flex gap-2 pt-4 border-t border-dark-700">
              <button onClick={handleSave} className="btn-primary">
                Save Changes
              </button>
              <button onClick={() => setEditing(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Skills View */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.skills ? (
                  profileData.skills.split(',').map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded text-sm border border-primary-500/20">
                      {skill.trim()}
                    </span>
                  ))
                ) : (
                  <p className="text-dark-500 text-sm">No skills added yet.</p>
                )}
              </div>
            </div>

            {/* Projects View */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-2">Projects</h3>
              {profileData.projects.length > 0 ? (
                <div className="grid gap-3">
                  {profileData.projects.map((proj, i) => (
                    <div key={i} className="p-3 bg-dark-800 rounded border border-dark-700">
                      <h4 className="font-bold text-white">{proj.title}</h4>
                      <p className="text-sm text-dark-300">{proj.description}</p>
                      <div className="flex gap-2 mt-2">
                        {proj.techStack?.map((tech, ti) => (
                          <span key={ti} className="text-xs text-dark-400 bg-black/20 px-1.5 py-0.5 rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-sm">No projects added yet.</p>
              )}
            </div>

            {/* Experience View */}
            <div>
              <h3 className="text-sm font-medium text-dark-400 mb-2">Experience</h3>
              {profileData.experience.length > 0 ? (
                <div className="space-y-4 border-l-2 border-dark-700 pl-4 ml-1">
                  {profileData.experience.map((exp, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 bg-dark-600 rounded-full border-2 border-dark-900"></div>
                      <h4 className="font-bold text-white">{exp.title} <span className="text-dark-400 font-normal">at {exp.company}</span></h4>
                      <p className="text-xs text-dark-500 mb-1">
                        {new Date(exp.startDate).toLocaleDateString()} - {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
                      </p>
                      <p className="text-sm text-dark-300">{exp.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-sm">No experience added yet.</p>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Learning Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiCog className="w-5 h-5" />
            Learning Preferences
          </h2>
          {!editingOnboarding && (
            <button
              onClick={() => setEditingOnboarding(true)}
              className="btn-ghost text-sm"
            >
              <HiPencil className="w-4 h-4 mr-1" />
              Edit
            </button>
          )}
        </div>

        {editingOnboarding ? (
          <div className="space-y-4">
            {/* Target Role */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Target Role
              </label>
              <select
                value={onboardingData.targetRole}
                onChange={(e) => setOnboardingData({ ...onboardingData, targetRole: e.target.value })}
                className="input"
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Skill Level
              </label>
              <select
                value={onboardingData.skillLevel}
                onChange={(e) => setOnboardingData({ ...onboardingData, skillLevel: e.target.value })}
                className="input"
              >
                <option value="beginner">🌱 Beginner - Just starting out</option>
                <option value="intermediate">🌿 Intermediate - 1-2 years experience</option>
                <option value="advanced">🌳 Advanced - 3+ years experience</option>
              </select>
            </div>

            {/* Daily Study Time */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Daily Study Time
              </label>
              <select
                value={onboardingData.dailyStudyTime}
                onChange={(e) => setOnboardingData({ ...onboardingData, dailyStudyTime: parseInt(e.target.value) })}
                className="input"
              >
                <option value="30">30 minutes - Light learning</option>
                <option value="60">1 hour - Balanced approach</option>
                <option value="90">1.5 hours - Serious learner</option>
                <option value="120">2+ hours - Intensive study</option>
              </select>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Preferred Video Language
              </label>
              <select
                value={onboardingData.preferredLanguage}
                onChange={(e) => setOnboardingData({ ...onboardingData, preferredLanguage: e.target.value })}
                className="input"
              >
                <option value="english">🇺🇸 English</option>
                <option value="tamil">🇮🇳 Tamil</option>
                <option value="hi">🇮🇳 Hindi</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveOnboarding} className="btn-primary">
                Save Changes
              </button>
              <button onClick={() => setEditingOnboarding(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-dark-800 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 mb-1">
                <HiAcademicCap className="w-4 h-4" />
                <span className="text-sm">Target Role</span>
              </div>
              <p className="text-white font-medium">
                {user?.preferences?.targetRole?.name || 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-dark-800 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 mb-1">
                <HiTrendingUp className="w-4 h-4" />
                <span className="text-sm">Skill Level</span>
              </div>
              <p className="text-white font-medium capitalize">
                {user?.preferences?.skillLevel === 'beginner' && '🌱 Beginner'}
                {user?.preferences?.skillLevel === 'intermediate' && '🌿 Intermediate'}
                {user?.preferences?.skillLevel === 'advanced' && '🌳 Advanced'}
                {!user?.preferences?.skillLevel && 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-dark-800 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 mb-1">
                <HiClock className="w-4 h-4" />
                <span className="text-sm">Daily Study Time</span>
              </div>
              <p className="text-white font-medium">
                {user?.preferences?.dailyStudyTime
                  ? `${user.preferences.dailyStudyTime} hour${user.preferences.dailyStudyTime > 1 ? 's' : ''}`
                  : 'Not set'}
              </p>
            </div>
            <div className="p-4 bg-dark-800 rounded-xl">
              <div className="flex items-center gap-2 text-dark-400 mb-1">
                <HiUser className="w-4 h-4" />
                <span className="text-sm">Preferred Language</span>
              </div>
              <p className="text-white font-medium capitalize">
                {user?.preferences?.preferredLanguage === 'english' && '🇺🇸 English'}
                {user?.preferences?.preferredLanguage === 'tamil' && '🇮🇳 Tamil'}
                {user?.preferences?.preferredLanguage === 'hi' && '🇮🇳 Hindi'}
                {!user?.preferences?.preferredLanguage && 'Not set'}
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Badges & Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <HiBadgeCheck className="w-5 h-5" />
            Badges & Achievements
          </h2>
          <span className="text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded-full">
            {badges.length} Unlocked
          </span>
        </div>

        {badges.length > 0 ? (
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {badges.map((badge, i) => (
              <div key={i} className="flex flex-col items-center text-center group cursor-help p-2 rounded-xl hover:bg-dark-800/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/10 
                               border border-primary-500/30 flex items-center justify-center text-2xl mb-2
                               group-hover:scale-110 transition-transform duration-200 shadow-lg shadow-primary-500/5">
                  {badge.icon}
                </div>
                <h3 className="text-xs font-semibold text-white truncate w-full">{badge.name}</h3>
                <p className="text-[10px] text-dark-400 leading-tight mt-0.5 line-clamp-2 h-6 overflow-hidden">
                  {badge.description}
                </p>
                <span className="text-[9px] text-dark-500 mt-1">
                  {new Date(badge.unlockedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-dark-400 bg-dark-800/50 rounded-xl border border-dashed border-dark-700">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-dark-700 flex items-center justify-center text-dark-500">
              <HiBadgeCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-dark-300">No badges unlocked yet</p>
            <p className="text-xs mt-1 max-w-xs mx-auto">Complete roadmaps, finish interviews, and level up to earn special badges!</p>
          </div>
        )}
      </motion.div>

      {/* Enrolled Roadmaps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Active Roadmaps</h2>
        {user?.enrolledRoadmaps?.length > 0 ? (
          <div className="space-y-3">
            {user.enrolledRoadmaps.map((enrollment) => (
              <div
                key={enrollment.roadmap?._id || enrollment._id}
                className="flex items-center gap-4 p-3 bg-dark-800 rounded-xl"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  <HiAcademicCap className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {enrollment.roadmap?.title || 'Roadmap'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 progress h-1.5">
                      <div
                        className="progress-bar"
                        style={{ width: `${enrollment.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-dark-400 text-sm">
                      {enrollment.progress || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-400 text-center py-4">
            No active roadmaps. Explore and enroll in one!
          </p>
        )}
      </motion.div>

      {/* Career Profiles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Career Profiles</h2>
        <div className="space-y-4">
          {/* LeetCode Username */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              LeetCode Username
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={careerData.leetcodeUsername}
                  onChange={(e) => handleLeetCodeUsernameChange(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="e.g., johndoe"
                />
                {verification.leetcode.status === 'verifying' && (
                  <HiRefresh className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 animate-spin" />
                )}
                {verification.leetcode.status === 'valid' && (
                  <HiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                )}
                {verification.leetcode.status === 'invalid' && (
                  <HiXCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>
              <button
                onClick={verifyLeetCodeUsername}
                disabled={verification.leetcode.status === 'verifying' || !careerData.leetcodeUsername}
                className="px-4 py-2 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30
                         disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors
                         flex items-center gap-2 whitespace-nowrap"
                title="Verify username manually"
              >
                <HiBadgeCheck className="w-4 h-4" />
                Verify
              </button>
            </div>
            {verification.leetcode.status !== 'idle' && (
              <div className={`flex items-center gap-2 mt-2 text-sm ${verification.leetcode.status === 'valid' ? 'text-accent-400' :
                verification.leetcode.status === 'invalid' ? 'text-red-400' : 'text-amber-400'
                }`}>
                {verification.leetcode.message}
              </div>
            )}
          </div>

          {/* GitHub Username */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              GitHub Username
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={careerData.githubUsername}
                  onChange={(e) => handleGitHubUsernameChange(e.target.value)}
                  className="input w-full pr-10"
                  placeholder="e.g., johndoe"
                />
                {verification.github.status === 'verifying' && (
                  <HiRefresh className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400 animate-spin" />
                )}
                {verification.github.status === 'valid' && (
                  <HiCheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-accent-400" />
                )}
                {verification.github.status === 'invalid' && (
                  <HiXCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />
                )}
              </div>
              <button
                onClick={verifyGitHubUsername}
                disabled={verification.github.status === 'verifying' || !careerData.githubUsername}
                className="px-4 py-2 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30
                         disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors
                         flex items-center gap-2 whitespace-nowrap"
                title="Verify username manually"
              >
                <HiBadgeCheck className="w-4 h-4" />
                Verify
              </button>
            </div>
            {verification.github.status !== 'idle' && (
              <div className={`flex items-center gap-2 mt-2 text-sm ${verification.github.status === 'valid' ? 'text-accent-400' :
                verification.github.status === 'invalid' ? 'text-red-400' : 'text-amber-400'
                }`}>
                {verification.github.message}
              </div>
            )}
          </div>

          <div className="pt-2 text-xs text-dark-400">
            <p>* At least one username is required. Usernames will be automatically verified as you type.</p>
          </div>

          {/* LeetCode Stats Display */}
          {leetcodeStats && (
            <div className="mt-6 pt-6 border-t border-dark-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <span className="text-lg">📊</span>
                  LeetCode Stats
                </h3>
                <button
                  onClick={refreshLeetCodeStats}
                  disabled={isRefreshingLeetCode}
                  className="px-3 py-1.5 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30
                           disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors
                           flex items-center gap-1.5 text-sm"
                >
                  <HiRefresh className={`w-4 h-4 ${isRefreshingLeetCode ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-white">{leetcodeStats.leetcode?.stats?.totalSolved || 0}</p>
                  <p className="text-xs text-dark-400">Total Solved</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-400">{leetcodeStats.leetcode?.stats?.easySolved || 0}</p>
                  <p className="text-xs text-dark-400">Easy</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-400">{leetcodeStats.leetcode?.stats?.mediumSolved || 0}</p>
                  <p className="text-xs text-dark-400">Medium</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-400">{leetcodeStats.leetcode?.stats?.hardSolved || 0}</p>
                  <p className="text-xs text-dark-400">Hard</p>
                </div>
              </div>
              {(leetcodeStats.leetcode?.stats?.ranking || leetcodeStats.leetcode?.skillLevel) && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {leetcodeStats.leetcode?.stats?.ranking && (
                    <div className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm">
                      <span className="text-dark-400">Ranking: </span>
                      <span className="text-white font-medium">#{leetcodeStats.leetcode.stats.ranking.toLocaleString()}</span>
                    </div>
                  )}
                  {leetcodeStats.leetcode?.skillLevel && (
                    <div className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm">
                      <span className="text-dark-400">Level: </span>
                      <span className="text-white font-medium capitalize">{leetcodeStats.leetcode.skillLevel}</span>
                    </div>
                  )}
                  {leetcodeStats.leetcode?.stats?.acceptanceRate > 0 && (
                    <div className="px-3 py-1.5 bg-dark-700 rounded-lg text-sm">
                      <span className="text-dark-400">Acceptance: </span>
                      <span className="text-white font-medium">{leetcodeStats.leetcode.stats.acceptanceRate}%</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-dark-500 mt-3">
                Last updated: {new Date(leetcodeStats.analyzedAt).toLocaleDateString()}
              </p>

              {/* Unified Activity Dashboard */}
              <div className="mt-6 pt-6 border-t border-dark-600">
                <UnifiedActivityDashboard />
              </div>
            </div>
          )}

          {/* GitHub Stats Display */}
          {githubStats && (
            <div className="mt-6 pt-6 border-t border-dark-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                  <span className="text-lg">🐙</span>
                  GitHub Stats
                </h3>
                <button
                  onClick={refreshGitHubStats}
                  disabled={isRefreshingGitHub}
                  className="px-3 py-1.5 bg-primary-500/20 text-primary-400 hover:bg-primary-500/30
                           disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors
                           flex items-center gap-1.5 text-sm"
                >
                  <HiRefresh className={`w-4 h-4 ${isRefreshingGitHub ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-white">{githubStats.github?.stats?.publicRepos || 0}</p>
                  <p className="text-xs text-dark-400">Repositories</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-amber-400">{githubStats.github?.stats?.totalStars || 0}</p>
                  <p className="text-xs text-dark-400">Stars</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-400">{githubStats.github?.stats?.totalForks || 0}</p>
                  <p className="text-xs text-dark-400">Forks</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-400">{githubStats.github?.stats?.followers || 0}</p>
                  <p className="text-xs text-dark-400">Followers</p>
                </div>
              </div>
              {githubStats.github?.languageBreakdown?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-dark-400 mb-2">Top Languages:</p>
                  <div className="flex flex-wrap gap-2">
                    {githubStats.github.languageBreakdown.slice(0, 5).map((lang, idx) => (
                      <div key={idx} className="px-2 py-1 bg-dark-700 rounded text-xs">
                        <span className="text-white">{lang.language}</span>
                        <span className="text-dark-400 ml-1">({lang.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-dark-500 mt-3">
                Last updated: {new Date(githubStats.analyzedAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoadingStats && !leetcodeStats && !githubStats && (
            <div className="mt-6 pt-6 border-t border-dark-700 text-center py-8">
              <HiRefresh className="w-6 h-6 text-primary-400 animate-spin mx-auto mb-2" />
              <p className="text-dark-400 text-sm">Loading stats...</p>
            </div>
          )}
        </div>

        {/* Resume Upload */}
        <div className="mt-6 pt-6 border-t border-dark-700">
          <label className="block text-sm font-medium text-dark-300 mb-2">Upload Resume (PDF)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed
                            border-dark-600 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={handleResumeUpload}
                disabled={isSavingResume}
                className="hidden"
              />
              <HiUpload className="w-5 h-5 text-dark-400" />
              <span className="text-dark-400 text-sm">
                {isSavingResume ? 'Uploading...' : (resumeFile?.name || 'Choose PDF or drag here')}
              </span>
            </label>
            {resumeUrl && (
              <button
                onClick={handleRemoveResume}
                disabled={isSavingResume}
                className="btn-ghost text-red-400 hover:text-red-300"
              >
                <HiTrash className="w-5 h-5" />
              </button>
            )}
          </div>
          {resumeUrl && (
            <div className="mt-3 p-3 bg-dark-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiDocumentDownload className="w-5 h-5 text-accent-400" />
                <span className="text-sm text-accent-400">Resume uploaded</span>
              </div>
              <a
                href={resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost text-primary-400 hover:text-primary-300 text-sm"
              >
                <HiEye className="w-4 h-4 mr-1" />
                View
              </a>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6 gap-2">
          <button
            onClick={handleSaveCareer}
            disabled={isSavingCareer || isSavingResume}
            className="btn-primary"
          >
            {isSavingCareer ? 'Saving...' : 'Save Profiles'}
          </button>
        </div>
      </motion.div>
    </div >
  );
}

// Stat Card Component
function StatCard({ icon: Icon, value, label, color }) {
  const colors = {
    primary: 'bg-primary-500/20 text-primary-400',
    secondary: 'bg-secondary-500/20 text-secondary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    warning: 'bg-amber-500/20 text-amber-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-4"
    >
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-dark-400 text-sm">{label}</p>
    </motion.div>
  );
}

// Format time helper
function formatTime(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
