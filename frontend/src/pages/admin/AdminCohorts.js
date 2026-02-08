/**
 * SkillForge AI - Admin Cohorts
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminCohorts() {
  const [cohorts, setCohorts] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', capacity: 30, isActive: true });

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    try {
      const res = await adminAPI.getCohorts();
      setCohorts(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load cohorts');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createCohort(formData);
      toast.success('Cohort created');
      setFormData({ name: '', description: '', capacity: 30, isActive: true });
      fetchCohorts();
    } catch (error) {
      toast.error('Failed to create cohort');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this cohort?')) return;
    try {
      await adminAPI.deleteCohort(id);
      toast.success('Cohort deleted');
      fetchCohorts();
    } catch (error) {
      toast.error('Failed to delete cohort');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Cohorts</h1>
        <p className="text-dark-400 mt-1">Manage learning cohorts.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Create Cohort</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <input
            required
            className="input"
            placeholder="Cohort name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <textarea
            rows={3}
            className="input"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            type="number"
            className="input"
            placeholder="Capacity"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
          />
          <button className="btn-primary" type="submit">Create</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">All Cohorts</h2>
        {cohorts.length === 0 ? (
          <p className="text-dark-400">No cohorts found.</p>
        ) : (
          <div className="space-y-3">
            {cohorts.map((c) => (
              <div key={c._id} className="p-4 bg-dark-800 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{c.name}</h3>
                  <p className="text-dark-400 text-sm">{c.description}</p>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => handleDelete(c._id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
