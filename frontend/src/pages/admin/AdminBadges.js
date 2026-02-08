/**
 * SkillForge AI - Admin Badges
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminBadges() {
  const [badges, setBadges] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '🏅', criteria: '', isActive: true });

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const res = await adminAPI.getBadges();
      setBadges(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load badges');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createBadge(formData);
      toast.success('Badge created');
      setFormData({ name: '', description: '', icon: '🏅', criteria: '', isActive: true });
      fetchBadges();
    } catch (error) {
      toast.error('Failed to create badge');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this badge?')) return;
    try {
      await adminAPI.deleteBadge(id);
      toast.success('Badge deleted');
      fetchBadges();
    } catch (error) {
      toast.error('Failed to delete badge');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Badges</h1>
        <p className="text-dark-400 mt-1">Manage skill badges.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Create Badge</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            required
            className="input"
            placeholder="Badge name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Icon (emoji)"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          />
          <textarea
            className="input"
            rows={3}
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            className="input"
            placeholder="Criteria"
            value={formData.criteria}
            onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
          />
          <button className="btn-primary" type="submit">Create</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Badges</h2>
        {badges.length === 0 ? (
          <p className="text-dark-400">No badges found.</p>
        ) : (
          <div className="space-y-3">
            {badges.map((badge) => (
              <div key={badge._id} className="p-4 bg-dark-800 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{badge.icon} {badge.name}</h3>
                  <p className="text-dark-400 text-sm">{badge.description}</p>
                </div>
                <button onClick={() => handleDelete(badge._id)} className="btn-secondary btn-sm">Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
