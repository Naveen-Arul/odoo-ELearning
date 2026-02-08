/**
 * SkillForge AI - Outcomes Page
 */

import React, { useEffect, useState } from 'react';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function OutcomesPage() {
  const [outcomes, setOutcomes] = useState([]);
  const [formData, setFormData] = useState({
    status: 'applied',
    company: '',
    role: '',
    source: '',
    salary: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    fetchOutcomes();
  }, []);

  const fetchOutcomes = async () => {
    try {
      const res = await userAPI.getOutcomes();
      setOutcomes(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load outcomes');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await userAPI.addOutcome(formData);
      toast.success('Outcome added');
      setFormData({ status: 'applied', company: '', role: '', source: '', salary: '', location: '', notes: '' });
      fetchOutcomes();
    } catch (error) {
      toast.error('Failed to add outcome');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Outcomes</h1>
        <p className="text-dark-400 mt-1">Track applications, interviews, and placements.</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Add Outcome</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            className="input"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
            <option value="offer">Offer</option>
            <option value="placed">Placed</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="input"
              placeholder="Company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            <input
              className="input"
              placeholder="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              className="input"
              placeholder="Source (LinkedIn, referral...)"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
            <input
              className="input"
              placeholder="Salary (optional)"
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <textarea
            className="input"
            rows={3}
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <button className="btn-primary" type="submit">Save</button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">History</h2>
        {outcomes.length === 0 ? (
          <p className="text-dark-400">No outcomes yet.</p>
        ) : (
          <div className="space-y-3">
            {outcomes.map((o, idx) => (
              <div key={idx} className="p-4 bg-dark-800 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{o.company || 'Unknown'} · {o.role || 'Role'}</h3>
                  <p className="text-dark-400 text-sm">{o.status} · {o.source || 'N/A'}</p>
                </div>
                <span className="text-xs text-dark-300">{o.date ? new Date(o.date).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
