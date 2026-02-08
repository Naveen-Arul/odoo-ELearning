/**
 * SkillForge AI - Admin Assessments
 */

import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminAssessments() {
  const [submissions, setSubmissions] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, badgesRes] = await Promise.all([
        adminAPI.getProjectSubmissions(),
        adminAPI.getBadges()
      ]);
      setSubmissions(subsRes.data.data || []);
      setBadges(badgesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load submissions');
    }
  };

  const updateStatus = async (id, status, badgeId) => {
    try {
      await adminAPI.updateSubmissionStatus(id, { status, badgeId });
      toast.success('Submission updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update submission');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Assessments</h1>
        <p className="text-dark-400 mt-1">Review project submissions and award badges.</p>
      </div>

      <div className="card p-6">
        {submissions.length === 0 ? (
          <p className="text-dark-400">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <div key={sub._id} className="p-4 bg-dark-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{sub.title}</h3>
                    <p className="text-dark-400 text-sm">{sub.user?.name} · {sub.roadmap?.title || 'General'}</p>
                  </div>
                  <span className="text-xs text-dark-300 bg-dark-700 px-2 py-1 rounded">
                    {sub.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary btn-sm" onClick={() => updateStatus(sub._id, 'approved', sub.awardedBadge?._id)}>
                    Approve
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => updateStatus(sub._id, 'rejected')}>
                    Reject
                  </button>
                  <select
                    className="input py-1 text-sm"
                    value={sub.awardedBadge?._id || ''}
                    onChange={(e) => updateStatus(sub._id, sub.status, e.target.value || undefined)}
                  >
                    <option value="">Award badge</option>
                    {badges.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
