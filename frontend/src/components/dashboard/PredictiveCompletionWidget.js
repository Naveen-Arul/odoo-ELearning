import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiCalendar, HiClock } from 'react-icons/hi';
import { analyticsAPI } from '../../services/api';

export default function PredictiveCompletionWidget({ roadmapId }) {
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!roadmapId) {
            setLoading(false);
            return;
        }

        const fetchPrediction = async () => {
            try {
                const response = await analyticsAPI.getPredictiveCompletion(roadmapId);
                setPrediction(response.data.data);
            } catch (error) {
                console.error("Failed to fetch prediction", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPrediction();
    }, [roadmapId]);

    if (loading) return <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />;
    if (!prediction) return null;

    const completionDate = new Date(prediction.estimatedCompletion);
    const daysLeft = prediction.estimatedDays;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Estimated Completion</h3>
                    <p className="text-muted-foreground text-sm">Based on current pace</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                    <HiCalendar className="w-8 h-8 text-chart-4" />
                </div>
            </div>

            <div className="text-center py-4 bg-muted/30 rounded-lg border border-border border-dashed mb-4">
                <span className="text-3xl font-bold text-foreground block">
                    {daysLeft} Days
                </span>
                <span className="text-sm text-chart-4 font-medium">
                    Target: {completionDate.toLocaleDateString()}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-muted p-2 rounded">
                    <span className="block text-muted-foreground">Rem. Topics</span>
                    <span className="font-bold text-foreground text-lg">{prediction.remainingTopics}</span>
                </div>
                <div className="bg-muted p-2 rounded">
                    <span className="block text-muted-foreground">Pace (Topics/Day)</span>
                    <span className="font-bold text-foreground text-lg">{prediction.avgTopicsPerDay.toFixed(1)}</span>
                </div>
            </div>
        </motion.div>
    );
}
