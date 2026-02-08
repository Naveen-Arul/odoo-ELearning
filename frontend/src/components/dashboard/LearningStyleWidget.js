import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiLightBulb, HiBookOpen, HiLightningBolt } from 'react-icons/hi';
import { analyticsAPI } from '../../services/api';

export default function LearningStyleWidget() {
    const [style, setStyle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStyle = async () => {
            try {
                const response = await analyticsAPI.getLearningStyle();
                setStyle(response.data.data);
            } catch (error) {
                console.error("Failed to fetch learning style", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStyle();
    }, []);

    if (loading) return <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />;
    if (!style) return null;

    const getStyleIcon = (type) => {
        switch (type) {
            case 'Intensive': return <HiLightningBolt className="w-8 h-8 text-yellow-400" />;
            case 'Regular': return <HiBookOpen className="w-8 h-8 text-blue-400" />;
            default: return <HiLightBulb className="w-8 h-8 text-green-400" />;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Learning Style</h3>
                    <p className="text-muted-foreground text-sm">AI-detected pattern</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                    {getStyleIcon(style.learningStyle)}
                </div>
            </div>

            <div className="space-y-4">
                <div className="text-center py-2">
                    <span className="text-2xl font-bold text-primary block mb-1">
                        {style.learningStyle} Learner
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Avg. {Math.round(style.avgMinutesPerDay)} mins/day
                    </span>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Consistency</span>
                        <span className="text-foreground">{(style.preferences.consistency * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(style.preferences.consistency * 100, 100)}%` }}
                        />
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
