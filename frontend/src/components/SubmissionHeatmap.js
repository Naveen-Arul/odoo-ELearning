/**
 * SubmissionHeatmap Component
 * LeetCode-style activity calendar with submissions and streak stats
 */

import React, { useState, useEffect } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { format, subDays, startOfYear, endOfYear } from 'date-fns';
import { HiFire, HiCalendar, HiLightningBolt, HiTrendingUp, HiRefresh } from 'react-icons/hi';
import { careerAPI } from '../services/api';

export default function SubmissionHeatmap({ className = '' }) {
    const [heatmapData, setHeatmapData] = useState({});
    const [stats, setStats] = useState({
        totalSubmissions: 0,
        activeDays: 0,
        currentStreak: 0,
        maxStreak: 0
    });
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [hoveredValue, setHoveredValue] = useState(null);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

    useEffect(() => {
        fetchHeatmapData();
    }, [selectedYear]);

    const fetchHeatmapData = async () => {
        try {
            setLoading(true);
            const response = await careerAPI.getLeetCodeHeatmap(selectedYear);
            if (response.data.success) {
                setHeatmapData(response.data.data.heatmapData || {});
                setStats(response.data.data.stats || {
                    totalSubmissions: 0,
                    activeDays: 0,
                    currentStreak: 0,
                    maxStreak: 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch heatmap data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Convert heatmap data to array format for react-calendar-heatmap
    const getHeatmapValues = () => {
        const values = [];
        const startDate = startOfYear(new Date(selectedYear, 0, 1));
        const endDate = selectedYear === currentYear ? new Date() : endOfYear(new Date(selectedYear, 0, 1));

        let current = new Date(startDate);
        while (current <= endDate) {
            const dateStr = format(current, 'yyyy-MM-dd');
            values.push({
                date: dateStr,
                count: heatmapData[dateStr] || 0
            });
            current.setDate(current.getDate() + 1);
        }
        return values;
    };

    // Get color class based on submission count
    const getColorClass = (value) => {
        if (!value || value.count === 0) return 'color-empty';
        if (value.count <= 2) return 'color-scale-1';
        if (value.count <= 5) return 'color-scale-2';
        if (value.count <= 8) return 'color-scale-3';
        return 'color-scale-4';
    };

    // Get tooltip text
    const getTooltipText = (value) => {
        if (!value || !value.date) return null;
        const dateFormatted = format(new Date(value.date), 'MMM d, yyyy');
        if (value.count === 0) {
            return `No submissions on ${dateFormatted}`;
        }
        return `${value.count} submission${value.count > 1 ? 's' : ''} on ${dateFormatted}`;
    };

    const statItems = [
        { icon: HiLightningBolt, label: 'Total Submissions', value: stats.totalSubmissions, color: 'text-blue-400' },
        { icon: HiCalendar, label: 'Active Days', value: stats.activeDays, color: 'text-green-400' },
        { icon: HiFire, label: 'Current Streak', value: `${stats.currentStreak} days`, color: 'text-orange-400' },
        { icon: HiTrendingUp, label: 'Max Streak', value: `${stats.maxStreak} days`, color: 'text-purple-400' }
    ];

    if (loading) {
        return (
            <div className={`animate-pulse ${className}`}>
                <div className="h-8 bg-muted rounded w-48 mb-4"></div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 bg-muted rounded-lg"></div>
                    ))}
                </div>
                <div className="h-32 bg-muted rounded-lg"></div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header with Year Filter */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    Submission Activity
                </h3>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1.5 bg-dark-700 text-white border border-dark-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <button
                        onClick={fetchHeatmapData}
                        className="p-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <HiRefresh className="w-4 h-4 text-dark-400" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {statItems.map((item, index) => (
                    <div key={index} className="p-3 bg-dark-800 rounded-xl text-center">
                        <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                        <p className="text-lg font-bold text-white">{item.value}</p>
                        <p className="text-xs text-dark-400">{item.label}</p>
                    </div>
                ))}
            </div>

            {/* Heatmap Calendar */}
            <div className="bg-dark-800 rounded-xl p-4 overflow-x-auto">
                <CalendarHeatmap
                    startDate={startOfYear(new Date(selectedYear, 0, 1))}
                    endDate={selectedYear === currentYear ? new Date() : endOfYear(new Date(selectedYear, 0, 1))}
                    values={getHeatmapValues()}
                    classForValue={getColorClass}
                    titleForValue={getTooltipText}
                    showWeekdayLabels
                    gutterSize={2}
                    onMouseOver={(event, value) => setHoveredValue(value)}
                    onMouseLeave={() => setHoveredValue(null)}
                />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-dark-400">
                    {hoveredValue && hoveredValue.date && (
                        <span className="text-white">
                            {getTooltipText(hoveredValue)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                    <span>Less</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded bg-dark-600" title="0 submissions" />
                        <div className="w-3 h-3 rounded bg-green-900/50" title="1-2 submissions" />
                        <div className="w-3 h-3 rounded bg-green-700/70" title="3-5 submissions" />
                        <div className="w-3 h-3 rounded bg-green-500/80" title="6-8 submissions" />
                        <div className="w-3 h-3 rounded bg-green-400" title="9+ submissions" />
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
