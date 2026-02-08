/**
 * UnifiedActivityDashboard - Tabbed view with exact LeetCode and GitHub calendar UIs
 */

import React, { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { SiLeetcode } from 'react-icons/si';
import LeetCodeCalendar from './LeetCodeCalendar';
import GitHubCalendar from './GitHubCalendar';

export default function UnifiedActivityDashboard({ className = '' }) {
    const [activeTab, setActiveTab] = useState('leetcode');

    const tabs = [
        { id: 'leetcode', label: 'LeetCode', icon: SiLeetcode, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
        { id: 'github', label: 'GitHub', icon: FaGithub, color: 'text-white', bgColor: 'bg-white/10' }
    ];

    return (
        <div className={className}>
            {/* Header with Tabs */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold flex items-center gap-2">
                    <span>📊</span>
                    Activity Dashboard
                </h3>

                {/* Tab Buttons */}
                <div className="flex bg-dark-800 rounded-lg p-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === tab.id
                                    ? `${tab.bgColor} ${tab.color}`
                                    : 'text-dark-400 hover:text-white'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="rounded-xl overflow-hidden">
                {activeTab === 'leetcode' && <LeetCodeCalendar />}
                {activeTab === 'github' && <GitHubCalendar />}
            </div>
        </div>
    );
}
