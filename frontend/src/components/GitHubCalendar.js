/**
 * GitHubCalendar - Exact replica of GitHub's contribution calendar
 * Fetches live data dynamically based on user's GitHub ID
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FaGithub } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { careerAPI } from '../services/api';

export default function GitHubCalendar({ className = '' }) {
    const [data, setData] = useState({ heatmapData: {}, stats: {} });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [noUsername, setNoUsername] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const containerRef = useRef(null);

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await careerAPI.getGitHubHeatmap(selectedYear);
            if (response.data.success && response.data.data) {
                const { heatmapData, stats } = response.data.data;
                // Check if no data exists (user might not have username set)
                if (Object.keys(heatmapData || {}).length === 0 && stats?.totalContributions === 0) {
                    setNoUsername(true);
                } else {
                    setNoUsername(false);
                }
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch GitHub data:', error);
            setData({ heatmapData: {}, stats: { totalContributions: 0, activeDays: 0 } });
            setNoUsername(true);
        } finally {
            setLoading(false);
        }
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const { weeks, monthLabels } = useMemo(() => {
        const weeksArr = [];
        const today = new Date();

        const startDate = new Date(selectedYear, 0, 1);
        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 0) {
            startDate.setDate(startDate.getDate() - dayOfWeek);
        }

        const endDate = selectedYear === currentYear
            ? today
            : new Date(selectedYear, 11, 31);

        let currentWeek = [];
        let current = new Date(startDate);
        let prevMonth = -1;
        let monthStartWeeks = {};

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const month = current.getMonth();
            const year = current.getFullYear();

            if (year === selectedYear && month !== prevMonth && current.getDay() === 0) {
                monthStartWeeks[month] = weeksArr.length;
                prevMonth = month;
            }

            currentWeek.push({
                date: dateStr,
                count: data.heatmapData?.[dateStr] || 0,
                day: current.getDay(),
                month,
                year,
                isCurrentYear: year === selectedYear
            });

            if (currentWeek.length === 7) {
                weeksArr.push(currentWeek);
                currentWeek = [];
            }
            current.setDate(current.getDate() + 1);
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: null, count: 0, day: currentWeek.length, month: -1, year: -1, isCurrentYear: false });
            }
            weeksArr.push(currentWeek);
        }

        const orderedMonths = [];
        for (let m = 0; m < 12; m++) {
            if (monthStartWeeks[m] !== undefined) {
                orderedMonths.push({
                    month: m,
                    weekIndex: monthStartWeeks[m],
                    label: months[m]
                });
            }
        }

        return { weeks: weeksArr, monthLabels: orderedMonths };
    }, [data.heatmapData, selectedYear, currentYear]);

    const getColor = (count, isCurrentYear) => {
        if (!isCurrentYear) return '#0d1117';
        if (count === 0) return '#161b22';
        if (count <= 2) return '#0e4429';
        if (count <= 5) return '#006d32';
        if (count <= 8) return '#26a641';
        return '#39d353';
    };

    const handleMouseEnter = (e, day) => {
        if (!day.date) return;
        const rect = e.target.getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
            setTooltip({
                date: day.date,
                count: day.count,
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top
            });
        }
    };

    const totalContributions = Object.values(data.heatmapData || {}).reduce((a, b) => a + b, 0);

    if (loading) {
        return (
            <div className={`bg-[#0d1117] rounded-lg ${className}`}>
                <div className="animate-pulse p-4">
                    <div className="h-6 bg-[#161b22] w-64 rounded mb-4"></div>
                    <div className="h-[140px] bg-[#161b22] rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[#0d1117] p-4 relative ${className}`} ref={containerRef}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[#e6edf3] text-base font-normal">
                    {totalContributions} contributions in {selectedYear}
                </h3>
            </div>

            {/* No username notice */}
            {noUsername && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-3">
                    <FaGithub className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="text-sm">
                        <span className="text-blue-400">Connect your GitHub account</span>
                        <span className="text-[#7d8590]"> to see your contribution activity. </span>
                        <Link to="/career" className="text-blue-400 hover:underline">Go to Career Page →</Link>
                    </div>
                </div>
            )}

            {/* Main Container */}
            <div className="flex gap-3">
                {/* Calendar Section */}
                <div className="flex-1 border border-[#30363d] rounded-md p-3 bg-[#0d1117] relative">
                    {/* Month Labels - evenly spaced */}
                    <div className="flex justify-between mb-2 text-[11px] text-[#7d8590]" style={{ paddingLeft: '32px' }}>
                        {monthLabels.map((label) => (
                            <span key={label.month} className="text-center" style={{ minWidth: '40px' }}>
                                {label.label}
                            </span>
                        ))}
                    </div>

                    {/* Calendar with day labels */}
                    <div className="flex">
                        {/* Day Labels */}
                        <div className="flex flex-col text-[9px] text-[#7d8590] pr-1" style={{ width: '28px' }}>
                            <div style={{ height: '13px' }}></div>
                            <div style={{ height: '13px' }} className="flex items-center">Mon</div>
                            <div style={{ height: '13px' }}></div>
                            <div style={{ height: '13px' }} className="flex items-center">Wed</div>
                            <div style={{ height: '13px' }}></div>
                            <div style={{ height: '13px' }} className="flex items-center">Fri</div>
                            <div style={{ height: '13px' }}></div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex overflow-x-auto flex-1" style={{ gap: '3px' }}>
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col" style={{ gap: '3px' }}>
                                    {week.map((day, dayIndex) => (
                                        <div
                                            key={dayIndex}
                                            className={`rounded-sm ${day.date && day.isCurrentYear ? 'cursor-pointer hover:ring-1 hover:ring-[#58a6ff]' : ''} transition-all`}
                                            style={{
                                                width: '11px',
                                                height: '11px',
                                                backgroundColor: getColor(day.count, day.isCurrentYear)
                                            }}
                                            onMouseEnter={(e) => day.date && day.isCurrentYear && handleMouseEnter(e, day)}
                                            onMouseLeave={() => setTooltip(null)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer - Color legend */}
                    <div className="flex items-center justify-end mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-[#7d8590]">
                            <span>Less</span>
                            <div className="flex gap-[2px]">
                                {['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'].map((color, i) => (
                                    <div key={i} className="w-[10px] h-[10px] rounded-sm" style={{ backgroundColor: color }} />
                                ))}
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                </div>

                {/* Year Buttons */}
                <div className="flex flex-col gap-1" style={{ minWidth: '60px' }}>
                    {years.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors text-left ${selectedYear === year
                                    ? 'bg-[#1f6feb] text-white font-medium'
                                    : 'text-[#7d8590] hover:bg-[#21262d]'
                                }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="mt-4">
                <div className="flex items-center gap-4 text-sm text-[#7d8590]">
                    <span className="text-[#e6edf3] font-medium">{totalContributions}</span> contributions
                    <span>•</span>
                    <span className="text-[#e6edf3] font-medium">{data.stats?.activeDays || 0}</span> active days
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute z-[9999] px-2.5 py-1.5 bg-[#1c2128] border border-[#30363d] text-[#e6edf3] text-xs rounded shadow-xl pointer-events-none whitespace-nowrap"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y - 8}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <strong>{tooltip.count} contribution{tooltip.count !== 1 ? 's' : ''}</strong> on{' '}
                    {new Date(tooltip.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            )}
        </div>
    );
}
