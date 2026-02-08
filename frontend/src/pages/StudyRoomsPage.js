import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiUserGroup, HiPlus, HiSearch, HiLockClosed } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function StudyRoomsPage() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        isPublic: true,
        maxMembers: 5,
        targetRole: 'All'
    });

    // Filter & Join State
    const [joinId, setJoinId] = useState('');
    const [selectedRole, setSelectedRole] = useState('All');

    useEffect(() => {
        fetchRooms();
    }, [selectedRole]); // Refetch when filter changes

    const fetchRooms = async () => {
        try {
            const token = localStorage.getItem('token');
            const queryParams = new URLSearchParams();
            if (selectedRole && selectedRole !== 'All') {
                queryParams.append('targetRole', selectedRole);
            }

            const response = await fetch(`${API_URL}/social/rooms?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setRooms(data.data);
            }
        } catch (error) {
            toast.error('Failed to load study rooms');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/rooms/create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Room created successfully!');
                setShowCreateModal(false);
                fetchRooms();
                navigate(`/study-rooms/${data.data._id}`);
            }
        } catch (error) {
            toast.error('Failed to create room');
        }
    };

    const handleJoinById = async (e) => {
        e.preventDefault();
        if (!joinId.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/rooms/join-by-id`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ roomId: joinId.toUpperCase() })
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Joined room!');
                navigate(`/study-rooms/${data.data._id}`);
            } else {
                if (data.message === 'Already a member') {
                    navigate(`/study-rooms/${data.data._id}`);
                } else {
                    toast.error(data.message || 'Failed to join');
                }
            }
        } catch (error) {
            toast.error('Failed to join room. Check ID.');
        }
    };

    const handleJoin = async (roomId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/social/rooms/${roomId}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success) {
                toast.success('Joined room!');
                navigate(`/study-rooms/${roomId}`);
            } else {
                // If already member, just navigate
                if (data.message === 'Already a member') {
                    navigate(`/study-rooms/${roomId}`);
                } else {
                    toast.error(data.message || 'Failed to join');
                }
            }
        } catch (error) {
            // Check if error is because already member, if so navigate
            navigate(`/study-rooms/${roomId}`);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Study Rooms</h1>
                    <p className="text-dark-400 mt-1">Join a group and learn together</p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    {/* Join by ID */}
                    <form onSubmit={handleJoinById} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Room ID"
                            className="input py-2 text-sm w-32 uppercase"
                            value={joinId}
                            onChange={e => setJoinId(e.target.value)}
                            maxLength={6}
                        />
                        <button type="submit" className="btn-secondary whitespace-nowrap">Join</button>
                    </form>

                    {/* Filter */}
                    <select
                        className="input py-2 text-sm w-40"
                        value={selectedRole}
                        onChange={e => setSelectedRole(e.target.value)}
                    >
                        <option value="All">All Roles</option>
                        <option value="Frontend Developer">Frontend</option>
                        <option value="Backend Developer">Backend</option>
                        <option value="Full Stack Developer">Full Stack</option>
                        <option value="Mobile Developer">Mobile</option>
                        <option value="Data Scientist">Data Science</option>
                    </select>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap"
                    >
                        <HiPlus className="w-5 h-5" />
                        Create Room
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <motion.div
                        key={room._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card p-6 hover:border-primary-500/50 transition-colors"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                                <HiUserGroup className="w-6 h-6" />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${room.isPublic ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                {room.isPublic ? 'Public' : 'Private'}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{room.name}</h3>
                        <p className="text-dark-400 text-sm mb-4 line-clamp-2">{room.description}</p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-dark-700">
                            <div className="text-sm text-dark-400">
                                <span className="text-white font-medium">{room.members?.length || 0}</span>/{room.maxMembers} members
                            </div>
                            <button
                                onClick={() => handleJoin(room._id)}
                                className="btn-secondary btn-sm"
                            >
                                Join Room
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="card max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Study Room</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Room Name</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Target Role</label>
                                <select
                                    className="input w-full"
                                    value={formData.targetRole}
                                    onChange={e => setFormData({ ...formData, targetRole: e.target.value })}
                                >
                                    <option value="All">All Roles</option>
                                    <option value="Frontend Developer">Frontend Developer</option>
                                    <option value="Backend Developer">Backend Developer</option>
                                    <option value="Full Stack Developer">Full Stack Developer</option>
                                    <option value="Mobile Developer">Mobile Developer</option>
                                    <option value="Data Scientist">Data Scientist</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Description</label>
                                <textarea
                                    className="input w-full"
                                    rows="3"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-dark-300 mb-1">Max Members</label>
                                    <input
                                        type="number"
                                        min="2"
                                        max="50"
                                        className="input w-full"
                                        value={formData.maxMembers}
                                        onChange={e => setFormData({ ...formData, maxMembers: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-end mb-3">
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isPublic}
                                            onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                            className="w-5 h-5 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
                                        />
                                        Public Room
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="btn-ghost flex-1"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary flex-1">
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
