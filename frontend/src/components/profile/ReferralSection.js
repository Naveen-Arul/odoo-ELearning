import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiTicket, HiDuplicate, HiUsers } from 'react-icons/hi';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ReferralSection() {
    const [referralData, setReferralData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        try {
            // First check stats (existing code)
            const statsRes = await api.get('/referrals/stats');
            if (statsRes.data.data.referralCode) {
                setReferralData(statsRes.data.data);
            } else {
                // If no code, generate one
                const genRes = await api.post('/referrals/generate');
                setReferralData({ ...genRes.data.data, count: 0 });
            }
        } catch (error) {
            console.error("Failed to fetch referral data", error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!referralData?.referralCode) return;
        const link = `${window.location.origin}/register?ref=${referralData.referralCode}`;
        navigator.clipboard.writeText(link);
        toast.success('Referral link copied!');
    };

    if (loading) return <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/20 rounded-lg">
                    <HiTicket className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Refer a Friend</h3>
                    <p className="text-indigo-200 text-sm">Earn badges for inviting others</p>
                </div>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-dashed border-indigo-500/30">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <span className="block text-2xl font-bold text-white">
                            {referralData?.referralCode || '----'}
                        </span>
                        <span className="text-xs text-indigo-300 uppercase tracking-wider">Your Code</span>
                    </div>
                    <div className="border-l border-indigo-500/30">
                        <span className="block text-2xl font-bold text-white">
                            {referralData?.count || 0}
                        </span>
                        <span className="text-xs text-indigo-300 uppercase tracking-wider">Referred</span>
                    </div>
                </div>
            </div>

            <button
                onClick={copyToClipboard}
                className="w-full btn-primary flex items-center justify-center gap-2 py-3"
            >
                <HiDuplicate className="w-5 h-5" />
                Copy Referral Link
            </button>

            {referralData?.referrals?.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-medium text-indigo-200 mb-3 flex items-center gap-2">
                        <HiUsers className="w-4 h-4" />
                        Recent Referrals
                    </h4>
                    <div className="space-y-2">
                        {referralData.referrals.slice(0, 3).map((ref) => (
                            <div key={ref._id} className="flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                                    {ref.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm text-white font-medium">{ref.name}</p>
                                    <p className="text-xs text-gray-400">Joined {new Date(ref.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
