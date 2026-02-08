/**
 * HeatmapCalendar - Reusable GitHub/LeetCode style activity calendar
 * Accepts data, year, color scheme, and optional callbacks
 */

import React, { useState, useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { format, startOfYear, endOfYear } from 'date-fns';

export default function HeatmapCalendar({
    data = {},
    year = new Date().getFullYear(),
    colorScheme = 'green', // 'green' | 'blue' | 'purple' | 'orange'
    source = 'activity',
    onDayClick = null,
    showLabels = true,
    className = ''
}) {
    const [hoveredValue, setHoveredValue] = useState(null);
    const currentYear = new Date().getFullYear();

    const colorScales = {
        green: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
        blue: ['#161b22', '#0a3069', '#0550ae', '#0969da', '#54aeff'],
        purple: ['#161b22', '#3b1f60', '#5a32a3', '#7c3aed', '#a78bfa'],
        orange: ['#161b22', '#5c2d0e', '#953d14', '#ea580c', '#fb923c']
    };

    const colors = colorScales[colorScheme] || colorScales.green;

    // Convert data object to array format
    const heatmapValues = useMemo(() => {
        const values = [];
        const start = startOfYear(new Date(year, 0, 1));
        const end = year === currentYear ? new Date() : endOfYear(new Date(year, 0, 1));

        let current = new Date(start);
        while (current <= end) {
            const dateStr = format(current, 'yyyy-MM-dd');
            const count = typeof data[dateStr] === 'object' ? data[dateStr].total || 0 : data[dateStr] || 0;
            values.push({ date: dateStr, count });
            current.setDate(current.getDate() + 1);
        }
        return values;
    }, [data, year, currentYear]);

    const getColorClass = (value) => {
        if (!value || value.count === 0) return 'color-empty';
        if (value.count <= 2) return 'color-scale-1';
        if (value.count <= 5) return 'color-scale-2';
        if (value.count <= 8) return 'color-scale-3';
        return 'color-scale-4';
    };

    const getTooltipText = (value) => {
        if (!value || !value.date) return null;
        const dateFormatted = format(new Date(value.date), 'MMM d, yyyy');
        if (value.count === 0) {
            return `No activity on ${dateFormatted}`;
        }
        return `${value.count} ${source === 'github' ? 'contribution' : 'submission'}${value.count > 1 ? 's' : ''} on ${dateFormatted}`;
    };

    return (
        <div className={className}>
            <div className="bg-dark-800 rounded-xl p-4 overflow-x-auto">
                <CalendarHeatmap
                    startDate={startOfYear(new Date(year, 0, 1))}
                    endDate={year === currentYear ? new Date() : endOfYear(new Date(year, 0, 1))}
                    values={heatmapValues}
                    classForValue={getColorClass}
                    titleForValue={getTooltipText}
                    showWeekdayLabels={showLabels}
                    gutterSize={2}
                    onClick={(value) => onDayClick && value && onDayClick(value)}
                    onMouseOver={(event, value) => setHoveredValue(value)}
                    onMouseLeave={() => setHoveredValue(null)}
                />
            </div>

            {/* Legend and Tooltip */}
            <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-dark-400 min-h-[1.25rem]">
                    {hoveredValue && hoveredValue.date && (
                        <span className="text-white">{getTooltipText(hoveredValue)}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-dark-400">
                    <span>Less</span>
                    <div className="flex gap-1">
                        {colors.map((color, i) => (
                            <div
                                key={i}
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: color }}
                                title={i === 0 ? '0' : `${(i - 1) * 3 + 1}-${i * 3}`}
                            />
                        ))}
                    </div>
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
