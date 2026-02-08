import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiExclamation, HiShieldCheck, HiTrendingDown } from 'react-icons/hi';
import { analyticsAPI } from '../../services/api';

export default function DropOffRiskWidget() {
    const [risk, setRisk] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRisk = async () => {
            try {
                const response = await analyticsAPI.getDropOffRisk();
                setRisk(response.data.data);
            } catch (error) {
                console.error("Failed to fetch drop-off risk", error);
            } finally {
                setLoading(false);
            }
        };
        fetchRisk();
    }, []);

    if (loading) return <div className="h-48 bg-gray-800 rounded-xl animate-pulse" />;
    if (!risk) return null;

    const getRiskColor = (level) => {
        switch (level) {
            case 'Critical': return 'text-red-500';
            case 'High': return 'text-orange-500';
            case 'Medium': return 'text-yellow-500';
            default: return 'text-green-500';
        }
    };

    const getRiskIcon = (level) => {
        if (level === 'Low') return <HiShieldCheck className="w-8 h-8 text-green-500" />;
        return <HiExclamation className={`w-8 h-8 ${getRiskColor(level)}`} />;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-foreground mb-1">Retention Risk</h3>
                    <p className="text-muted-foreground text-sm">Engagement Analysis</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                    {getRiskIcon(risk.riskLevel)}
                </div>
            </div>

            <div className="text-center py-4">
                <span className={`text-3xl font-bold block mb-1 ${getRiskColor(risk.riskLevel)}`}>
                    {risk.riskLevel} Risk
                </span>
                <span className="text-xs text-muted-foreground">
                    Studied {risk.studiedDays} of last 7 days
                </span>
            </div>

            {risk.recommendations?.length > 0 && (
                <div className="mt-4 bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Suggestions:</p>
                    <ul className="text-sm text-foreground/80 space-y-1">
                        {risk.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-center gap-2">
                                <HiTrendingDown className="w-3 h-3 text-primary" />
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </motion.div>
    );
}
