import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiCode, HiCalendar, HiUserGroup } from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';
import toast from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

export default function HackathonsPage() {
    const [hackathons, setHackathons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHackathons();
    }, []);

    const fetchHackathons = async () => {
        try {
            const response = await fetch(`${API_URL}/hackathons`);
            const data = await response.json();
            if (data.success) {
                setHackathons(data.data);
            }
        } catch (error) {
            console.error('Failed to load hackathons', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Please login to register');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/hackathons/${id}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ team: 'Solo' }) // Simplified for now
            });
            const data = await response.json();
            if (data.success) {
                toast.success('Successfully registered!');
                fetchHackathons(); // Refresh to update UI
            } else {
                toast.error(data.message || 'Failed to register');
            }
        } catch (error) {
            toast.error('Registration failed');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Community Hackathons</h1>
                    <p className="text-muted-foreground mt-1">Build together, win prizes, and level up.</p>
                </div>
            </div>

            <div className="grid gap-6">
                {hackathons.length === 0 && !loading && (
                    <div className="text-center py-20 card">
                        <HiCode className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold text-foreground">No Active Hackathons</h3>
                        <p className="text-muted-foreground">Check back later for upcoming events!</p>
                    </div>
                )}

                {hackathons.map((hackathon) => (
                    <motion.div
                        key={hackathon._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card p-6 flex flex-col md:flex-row gap-6"
                    >
                        <div className="w-full md:w-64 h-48 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center flex-shrink-0">
                            <HiTrophy className="w-20 h-20 text-primary/40" />
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">{hackathon.title}</h2>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                                        <div className="flex items-center gap-1">
                                            <HiCalendar className="w-4 h-4 text-primary" />
                                            {new Date(hackathon.startDate).toLocaleDateString()} - {new Date(hackathon.endDate).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <HiUserGroup className="w-4 h-4 text-primary" />
                                            {hackathon.participants?.length || 0} Participants
                                        </div>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${hackathon.status === 'active' ? 'bg-green-500/20 text-green-500' :
                                    hackathon.status === 'upcoming' ? 'bg-blue-500/20 text-blue-500' :
                                        'bg-muted text-muted-foreground'
                                    }`}>
                                    {hackathon.status.toUpperCase()}
                                </span>
                            </div>

                            <p className="text-muted-foreground mb-6 line-clamp-3">{hackathon.description}</p>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handleRegister(hackathon._id)}
                                    className="btn-primary"
                                    disabled={hackathon.status === 'completed'}
                                >
                                    Register Now
                                </button>
                                <button className="btn-secondary">View Details</button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
