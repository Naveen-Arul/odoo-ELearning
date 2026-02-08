import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { HiDownload, HiExternalLink, HiCheck, HiX, HiClock } from 'react-icons/hi';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function CandidatesView({ jobs }) {
    const [selectedJobId, setSelectedJobId] = useState(jobs.length > 0 ? jobs[0]._id : '');
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (selectedJobId) {
            fetchCandidates(selectedJobId);
        }
    }, [selectedJobId]);

    const fetchCandidates = async (jobId) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/jobs/${jobId}/applications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCandidates(data.data);
            } else {
                toast.error('Failed to load candidates');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error fetching candidates');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (applicationId, newStatus) => {
        const toastId = toast.loading('Updating status...');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/jobs/applications/${applicationId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success('Status updated', { id: toastId });
                // Refresh list
                fetchCandidates(selectedJobId);
            } else {
                toast.error('Failed to update', { id: toastId });
            }
        } catch (error) {
            toast.error('Error updating status', { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Candidate Management</h2>
                <select
                    className="input w-64"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                >
                    {jobs.map(job => (
                        <option key={job._id} value={job._id}>{job.title}</option>
                    ))}
                </select>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-dark-700 text-dark-300 uppercase text-xs">
                            <tr>
                                <th className="p-4">Candidate</th>
                                <th className="p-4">Applied Date</th>
                                <th className="p-4">Match Score</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {loading ? (
                                <tr><td colSpan="5" className="p-8 text-center text-dark-400">Loading candidates...</td></tr>
                            ) : candidates.length === 0 ? (
                                <tr><td colSpan="5" className="p-8 text-center text-dark-400">No applications yet for this job.</td></tr>
                            ) : (
                                candidates.map(app => (
                                    <tr key={app._id} className="hover:bg-dark-800 transition-colors">
                                        <td className="p-4">
                                            <div>
                                                <div className="font-medium text-white">{app.applicant?.name || 'Unknown'}</div>
                                                <div className="text-sm text-dark-400">{app.applicant?.email}</div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-dark-300">
                                            {new Date(app.appliedAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${app.matchScore >= 80 ? 'bg-green-900/30 text-green-400' :
                                                    app.matchScore >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                                                        'bg-red-900/30 text-red-400'
                                                }`}>
                                                {app.matchScore}% Match
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`capitalize px-2 py-1 rounded text-xs ${app.status === 'shortlisted' ? 'bg-green-600 text-white' :
                                                    app.status === 'rejected' ? 'bg-red-600 text-white' :
                                                        'bg-dark-600 text-dark-300'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => updateStatus(app._id, 'shortlisted')}
                                                className="p-2 bg-green-900/50 text-green-400 rounded hover:bg-green-900"
                                                title="Shortlist"
                                            >
                                                <HiCheck />
                                            </button>
                                            <button
                                                onClick={() => updateStatus(app._id, 'rejected')}
                                                className="p-2 bg-red-900/50 text-red-400 rounded hover:bg-red-900"
                                                title="Reject"
                                            >
                                                <HiX />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
