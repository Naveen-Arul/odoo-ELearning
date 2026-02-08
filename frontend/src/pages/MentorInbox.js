import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { mentorsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
    HiInbox,
    HiCheckCircle,
    HiXCircle,
    HiVideoCamera,
    HiCalendar,
    HiClock,
    HiUser
} from 'react-icons/hi';

const MentorInbox = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await mentorsAPI.getRequests();
            setRequests(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load session requests');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status, meetingLink = '') => {
        setProcessingId(id);
        try {
            if (status === 'accepted' && !meetingLink) {
                // Simple prompt for now, could be a modal
                const link = window.prompt('Please enter the meeting link (e.g. Zoom/Meet):');
                if (!link) {
                    setProcessingId(null);
                    return;
                }
                meetingLink = link;
            }

            const res = await mentorsAPI.updateRequestStatus(id, { status, meetingLink });

            // Update local state
            setRequests(requests.map(req =>
                req._id === id ? { ...req, status: res.data.data.status, meetingLink: res.data.data.meetingLink } : req
            ));

            toast.success(`Session ${status}`);
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <HiInbox className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Mentor Inbox</h1>
                        <p className="text-gray-500">Manage your mentoring session requests</p>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border shadow-sm">
                        <HiInbox className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No Requests Yet</h3>
                        <p className="text-gray-500 mt-2">When students book a session with you, they'll appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map((request) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={request._id}
                                className="bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mr-10 relative">

                                    {/* Status Badge */}
                                    <span className={`absolute top-0 right-0 md:static px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(request.status)}`}>
                                        {request.status}
                                    </span>

                                    {/* Mentee Info */}
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={request.mentee?.avatar || `https://ui-avatars.com/api/?name=${request.mentee?.name || 'User'}`}
                                            alt={request.mentee?.name}
                                            className="w-14 h-14 rounded-full object-cover border-2 border-indigo-50"
                                        />
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">{request.mentee?.name}</h3>
                                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <HiCalendar className="w-4 h-4" />
                                                    {new Date(request.scheduledAt).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <HiClock className="w-4 h-4" />
                                                    {new Date(request.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({request.duration} min)
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Message & Topics */}
                                    <div className="flex-1 max-w-2xl bg-gray-50 p-4 rounded-lg">
                                        {request.topics && request.topics.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {request.topics.map((t, i) => (
                                                    <span key={i} className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-gray-600 text-sm line-clamp-2 md:line-clamp-none">
                                            "{request.message || 'No message provided'}"
                                        </p>
                                        {request.meetingLink && (
                                            <div className="mt-2 text-sm text-indigo-600 font-medium flex items-center gap-1">
                                                <HiVideoCamera className="w-4 h-4" />
                                                <a href={request.meetingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                    Join Meeting
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {request.status === 'pending' && (
                                        <div className="flex flex-col sm:flex-row gap-2 min-w-[140px]">
                                            <button
                                                onClick={() => handleStatusUpdate(request._id, 'accepted')}
                                                disabled={processingId === request._id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                {processingId === request._id ? '...' : <><HiCheckCircle className="w-5 h-5" /> Accept</>}
                                            </button>
                                            <button
                                                onClick={() => handleStatusUpdate(request._id, 'rejected')}
                                                disabled={processingId === request._id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-red-50 hover:text-red-600 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                {processingId === request._id ? '...' : <><HiXCircle className="w-5 h-5" /> Reject</>}
                                            </button>
                                        </div>
                                    )}

                                    {request.status !== 'pending' && (
                                        <div className="min-w-[140px] text-center text-sm text-gray-400 italic">
                                            {request.status === 'accepted' ? 'Session Scheduled' : 'Request Processed'}
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorInbox;
