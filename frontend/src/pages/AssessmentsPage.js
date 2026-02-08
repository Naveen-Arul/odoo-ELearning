/**
 * SkillForge AI - Assessments Page
 * Project submissions and badges
 */

import React, { useEffect, useState } from 'react';
import { assessmentsAPI, roadmapsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AssessmentsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    roadmapId: '',
    title: '',
    description: '',
    repoUrl: '',
    demoUrl: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, badgesRes, roadmapsRes] = await Promise.all([
        assessmentsAPI.getMySubmissions(),
        assessmentsAPI.getMyBadges(),
        roadmapsAPI.getMyEnrolled()
      ]);
      setSubmissions(subsRes.data.data || []);
      setBadges(badgesRes.data.data || []);
      const enrolled = roadmapsRes.data.data || [];
      setRoadmaps(enrolled.map(er => er.roadmap).filter(Boolean));
    } catch (error) {
      toast.error('Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await assessmentsAPI.createSubmission(formData);
      toast.success('Project submitted');
      setFormData({ roadmapId: '', title: '', description: '', repoUrl: '', demoUrl: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit project');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Assessments</h1>
        <p className="text-dark-400 mt-1">Submit projects, track reviews, and earn badges.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Submit a Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Roadmap (optional)</label>
            <select
              value={formData.roadmapId}
              onChange={(e) => setFormData({ ...formData, roadmapId: e.target.value })}
              className="input"
            >
              <option value="">Select roadmap</option>
              {roadmaps.map((rm) => (
                <option key={rm._id} value={rm._id}>{rm.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Project Title *</label>
            <input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="My Portfolio App"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              placeholder="What you built and key features"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Repo URL</label>
              <input
                value={formData.repoUrl}
                onChange={(e) => setFormData({ ...formData, repoUrl: e.target.value })}
                className="input"
                placeholder="https://github.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Demo URL</label>
              <input
                value={formData.demoUrl}
                onChange={(e) => setFormData({ ...formData, demoUrl: e.target.value })}
                className="input"
                placeholder="https://demo..."
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            Submit Project
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Your Submissions</h2>
        {loading ? (
          <p className="text-dark-400">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-dark-400">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub._id} className="p-4 bg-dark-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{sub.title}</h3>
                    <p className="text-dark-400 text-sm">{sub.roadmap?.title || 'General'}</p>
                  </div>
                  <span className="text-xs text-dark-300 bg-dark-700 px-2 py-1 rounded">
                    {sub.status}
                  </span>
                </div>
                {sub.awardedBadge && (
                  <p className="text-emerald-400 text-sm mt-2">🏅 {sub.awardedBadge.name}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Your Badges</h2>
        {badges.length === 0 ? (
          <p className="text-dark-400">No badges yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b._id} className="px-3 py-2 bg-dark-800 rounded-xl text-sm text-white">
                {b.badge?.icon || '🏅'} {b.badge?.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
