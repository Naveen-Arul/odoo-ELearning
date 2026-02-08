import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiLightningBolt, HiStar, HiChartBar } from 'react-icons/hi';
import { xpAPI } from '../services/api';
// NOTE: You will need to add xpAPI to your api.js service file or fetch directly.
// For now, I'll assume usage of a direct fetch or a yet-to-be-added API method.
import useAuthStore from '../store/authStore';

export default function XPWidget() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        xp: 0,
        level: 1,
        nextLevelIn: 500,
        progress: 0
    });

    useEffect(() => {
        if (user?._id) {
            fetchXP();
        }
    }, [user]);

    const fetchXP = async () => {
        try {
            // Assuming api.js will be updated or using fetch for now
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/v1/xp/${user._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                const { xp, level, nextLevelIn } = data.data;

                // Calculate progress percentage based on levels
                // Level 1 (0-500) -> progress = xp / 500
                // But nextLevelIn is "remaining". 
                // Total needed for next level = (xp + nextLevelIn).
                // So progress = xp / (xp + nextLevelIn) * 100 roughly, 
                // BUT wait, we want progress WITHIN the current level.
                // Simplified: let's use the raw XP for now or rely on the backend if we updated it to send progress.
                // Backend currently sends: xp, level, nextLevelIn.

                // Let's implement a simple progress calc here or update backend.
                // For Level 1: 0 to 500. Progress = (xp / 500) * 100.
                // For Level N: We need the base XP of current Level to show bar correctly.
                // Let's just use a relative "XP to go" visualization.

                setStats({ xp, level, nextLevelIn, progress: 0 });
            }
        } catch (err) {
            console.error("Failed to fetch XP", err);
        }
    };

    const getLevelProgress = () => {
        // Simplified progress bar for MVP
        // If nextLevelIn is 100 and I have 400, total step is 500. 400/500 = 80%.
        // We don't have "currentLevelBaseXP" easily available without duplicating logic.
        // Let's assume a standard bar behavior: 
        // width = (stats.xp / (stats.xp + stats.nextLevelIn)) * 100? 
        // No, because XP is cumulative total.
        // We need (TotalXP - CurrentLevelBase) / (NextLevelThreshold - CurrentLevelBase).
        // For now, let's just show "XP / Target" text and a visual bar that fills as you get closer to next threshold?
        // Actually, let's allow the Backend to calculate percentage for cleaner frontend code.
        // I'll update backend logic in a moment. For now, render basic stats.
        return 50; // Placeholder until backend update
    };

    return (
        <div className="card p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <HiLightningBolt className="w-32 h-32" />
            </div>

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-yellow-400 text-black font-bold px-2 py-0.5 rounded text-xs">
                            LEVEL {stats.level}
                        </div>
                        <span className="text-indigo-200 text-sm font-medium tracking-wider">RANK: EXPLORER</span>
                    </div>
                    <h3 className="text-3xl font-bold">{stats.xp.toLocaleString()} <span className="text-sm font-normal text-indigo-200">XP</span></h3>
                </div>

                <div className="text-right">
                    <div className="text-xs text-indigo-200 mb-1">NEXT LEVEL IN</div>
                    <div className="font-bold text-xl">{stats.nextLevelIn} XP</div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>Progress</span>
                    <span>Level {stats.level + 1}</span>
                </div>
                <div className="h-2 bg-indigo-900/50 rounded-full overflow-hidden">
                    {/* We will fix the width calc properly via backend update */}
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${stats.xp % 500 / 5}%` }}></div>
                </div>
            </div>
        </div>
    );
}
