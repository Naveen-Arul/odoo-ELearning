/**
 * LeetCodeCalendar - Exact replica of LeetCode's submission calendar
 * Fetches live data dynamically based on user's LeetCode ID
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { HiInformationCircle, HiChevronDown } from 'react-icons/hi';
import { SiLeetcode } from 'react-icons/si';
import { Link } from 'react-router-dom';
import { careerAPI } from '../services/api';

export default function LeetCodeCalendar({ className = '' }) {
    const [data, setData] = useState({ heatmapData: {}, stats: {} });
    const [selectedYear, setSelectedYear] = useState('current');
    const [loading, setLoading] = useState(true);
    const [noUsername, setNoUsername] = useState(false);
    const [tooltip, setTooltip] = useState(null);
    const containerRef = useRef(null);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const year = selectedYear === 'current' ? currentYear : parseInt(selectedYear);
            const response = await careerAPI.getLeetCodeHeatmap(year);
            if (response.data.success && response.data.data) {
                const { heatmapData, stats } = response.data.data;
                // Check if no data exists (user might not have username set)
                if (Object.keys(heatmapData || {}).length === 0 && stats?.totalSubmissions === 0) {
                    setNoUsername(true);
                } else {
                    setNoUsername(false);
                }
                setData(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch LeetCode data:', error);
            setData({ heatmapData: {}, stats: { activeDays: 0, maxStreak: 0 } });
            setNoUsername(true);
        } finally {
            setLoading(false);
        }
    };

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Generate calendar data based on selection
    const { weeks, monthLabels, displayYear } = useMemo(() => {
        const weeksArr = [];
        const today = new Date();
        const isCurrentView = selectedYear === 'current';
        const yearNum = isCurrentView ? currentYear : parseInt(selectedYear);

        let startDate, endDate;

        if (isCurrentView) {
            startDate = new Date(today);
            startDate.setFullYear(startDate.getFullYear() - 1);
            startDate.setDate(startDate.getDate() + 1);
            endDate = today;
        } else {
            startDate = new Date(yearNum, 0, 1);
            endDate = yearNum === currentYear ? today : new Date(yearNum, 11, 31);
        }

        const dayOfWeek = startDate.getDay();
        if (dayOfWeek !== 0) {
            startDate.setDate(startDate.getDate() - dayOfWeek);
        }

        let currentWeek = [];
        let current = new Date(startDate);
        let prevMonth = -1;
        let monthStartWeeks = {};

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const month = current.getMonth();
            const year = current.getFullYear();

            const isInRange = isCurrentView || year === yearNum;
            if (isInRange && month !== prevMonth && current.getDay() === 0) {
                if (monthStartWeeks[month] === undefined) {
                    monthStartWeeks[month] = weeksArr.length;
                }
                prevMonth = month;
            }

            currentWeek.push({
                date: dateStr,
                count: data.heatmapData?.[dateStr] || 0,
                day: current.getDay(),
                month,
                year,
                isInRange
            });

            if (currentWeek.length === 7) {
                weeksArr.push(currentWeek);
                currentWeek = [];
            }
            current.setDate(current.getDate() + 1);
        }

        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({ date: null, count: 0, day: currentWeek.length, month: -1, year: -1, isInRange: false });
            }
            weeksArr.push(currentWeek);
        }

        const orderedMonths = [];
        if (isCurrentView) {
            const startMonth = (today.getMonth() + 1) % 12;
            for (let i = 0; i < 12; i++) {
                const m = (startMonth + i) % 12;
                if (monthStartWeeks[m] !== undefined) {
                    orderedMonths.push({
                        month: m,
                        weekIndex: monthStartWeeks[m],
                        label: months[m]
                    });
                }
            }
        } else {
            for (let m = 0; m < 12; m++) {
                if (monthStartWeeks[m] !== undefined) {
                    orderedMonths.push({
                        month: m,
                        weekIndex: monthStartWeeks[m],
                        label: months[m]
                    });
                }
            }
        }

        return { weeks: weeksArr, monthLabels: orderedMonths, displayYear: yearNum };
    }, [data.heatmapData, selectedYear, currentYear]);

    const getColor = (count, isInRange) => {
        if (!isInRange) return '#1a1a1a';
        if (count === 0) return '#2d2d2d';
        if (count === 1) return '#0e4429';
        if (count <= 3) return '#006d32';
        if (count <= 6) return '#26a641';
        return '#39d353';
    };

    const handleMouseEnter = (e, day) => {
        if (!day.date || !day.isInRange) return;
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

    const totalSubmissions = Object.values(data.heatmapData || {}).reduce((a, b) => a + b, 0);
    const activeDays = data.stats?.activeDays || Object.keys(data.heatmapData || {}).filter(k => data.heatmapData[k] > 0).length;
    const maxStreak = data.stats?.maxStreak || 0;

    if (loading) {
        return (
            <div className={`bg-[#1a1a1a] rounded-lg p-5 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-[#2d2d2d] w-72 rounded mb-4"></div>
                    <div className="h-[118px] bg-[#2d2d2d] rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[#1a1a1a] rounded-lg p-5 relative ${className}`} ref={containerRef}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                    <span className="text-white text-xl font-bold">{totalSubmissions}</span>
                    <span className="text-[#8a8a8a] text-sm">
                        submissions {selectedYear === 'current' ? 'in the past one year' : `in ${displayYear}`}
                    </span>
                    <HiInformationCircle className="w-4 h-4 text-[#666] cursor-help" />
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-5 text-sm">
                        <span className="text-[#8a8a8a]">Total active days: <span className="text-white font-medium">{activeDays}</span></span>
                        <span className="text-[#8a8a8a]">Max streak: <span className="text-white font-medium">{maxStreak}</span></span>
                    </div>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="appearance-none bg-[#333] text-white text-sm px-3 py-1.5 pr-8 rounded cursor-pointer border border-[#444] focus:outline-none focus:border-[#555] hover:bg-[#3a3a3a]"
                        >
                            <option value="current">Current</option>
                            <option value={currentYear}>{currentYear}</option>
                            <option value={currentYear - 1}>{currentYear - 1}</option>
                            <option value={currentYear - 2}>{currentYear - 2}</option>
                        </select>
                        <HiChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* No username notice */}
            {noUsername && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
                    <SiLeetcode className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="text-sm">
                        <span className="text-amber-400">Connect your LeetCode account</span>
                        <span className="text-[#8a8a8a]"> to see your submission activity. </span>
                        <Link to="/career" className="text-amber-400 hover:underline">Go to Career Page →</Link>
                    </div>
                </div>
            )}

            {/* Calendar Container */}
            <div className="overflow-x-auto pb-2">
                {/* Month Labels - evenly spaced across the width */}
                <div className="flex justify-between mb-3 text-[12px] text-[#757575] px-1" style={{ minWidth: '750px' }}>
                    {monthLabels.map((label) => (
                        <span key={label.month} className="text-center" style={{ minWidth: '50px' }}>
                            {label.label}
                        </span>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="flex" style={{ gap: '3px', minWidth: '750px' }}>
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="flex flex-col" style={{ gap: '3px' }}>
                            {week.map((day, dayIndex) => (
                                <div
                                    key={dayIndex}
                                    className={`rounded-[3px] ${day.date && day.isInRange ? 'cursor-pointer hover:ring-1 hover:ring-white/40' : ''} transition-all`}
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: getColor(day.count, day.isInRange)
                                    }}
                                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="absolute z-[9999] px-2.5 py-1.5 bg-[#333] text-white text-xs rounded shadow-xl pointer-events-none whitespace-nowrap border border-[#555]"
                    style={{
                        left: `${tooltip.x}px`,
                        top: `${tooltip.y - 8}px`,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <strong>{tooltip.count}</strong> submission{tooltip.count !== 1 ? 's' : ''} on{' '}
                    {new Date(tooltip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            )}
        </div>
    );
}
