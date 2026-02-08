import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    HiStar,
    HiChartBar,
    HiUserGroup,
    HiFire,
    HiAcademicCap,
    HiBadgeCheck
} from 'react-icons/hi';
import { useAuthStore } from '../store/authStore';
import { leaderboardAPI } from '../services/api';

export default function LeaderboardPage() {
    const { user } = useAuthStore();
    const [topUsers, setTopUsers] = useState([]);
    const [currentUserRank, setCurrentUserRank] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const [topRes, myRankRes] = await Promise.all([
                    leaderboardAPI.getTop(50),
                    leaderboardAPI.getMyRank()
                ]);

                setTopUsers(topRes.data.data);
                setCurrentUserRank(myRankRes.data.data);
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[500px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Find user in top list or use valid fallback
    const userInList = topUsers.find(u => u.userId === user?.id) || currentUserRank;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
                    <p className="text-muted-foreground mt-1">See where you stand among other learners.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6">
                <StatsCard
                    title="Your Rank"
                    value={`#${currentUserRank?.rank || '-'}`}
                    icon={HiStar}
                    color="from-yellow-400/20 to-yellow-600/10 text-yellow-500"
                    subValue={currentUserRank?.rank > 0 && currentUserRank?.rank <= 10 ? "Top 10!" : "Keep climbing!"}
                />
                <StatsCard
                    title="Current Level"
                    value={currentUserRank?.level || 1}
                    icon={HiAcademicCap}
                    color="from-primary/20 to-primary/10 text-primary"
                    subValue={`${currentUserRank?.xp || 0} XP`}
                />
                <StatsCard
                    title="Overall Score"
                    value={currentUserRank?.overallScore || 0}
                    icon={HiChartBar}
                    color="from-green-500/20 to-green-600/10 text-green-500"
                    subValue="Career Readiness"
                />
            </div>

            {/* Leaderboard Table */}
            <div className="card overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                        <HiUserGroup className="w-5 h-5 text-primary" />
                        Top Learners
                    </h2>
                    <span className="text-sm text-muted-foreground">Updated in real-time</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4 w-20 text-center">Rank</th>
                                <th className="px-6 py-4">Learner</th>
                                <th className="px-6 py-4 hidden md:table-cell">Target Role</th>
                                <th className="px-6 py-4 text-center">Level</th>
                                <th className="px-6 py-4 text-center">XP</th>
                                <th className="px-6 py-4 text-center">Score</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {topUsers.map((learner) => (
                                <tr
                                    key={learner.userId || learner._id}
                                    className={`
                    transition-colors hover:bg-muted/30
                    ${learner.userId === user?.id ? 'bg-primary/5 hover:bg-primary/10' : ''}
                  `}
                                >
                                    <td className="px-6 py-4 text-center font-medium">
                                        {getRankBadge(learner.rank)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                                                {learner.profileImage ? (
                                                    <img src={learner.profileImage} alt={learner.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-semibold text-muted-foreground">
                                                        {learner.name?.[0]?.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className={`font-medium ${learner.userId === user?.id ? 'text-primary' : 'text-foreground'}`}>
                                                    {learner.name} {learner.userId === user?.id && '(You)'}
                                                </p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    {/* Badges Display */}
                                                    {learner.badges && learner.badges.length > 0 && (
                                                        <div className="flex -space-x-1">
                                                            {learner.badges.slice(0, 3).map((badge, i) => (
                                                                <div key={i} className="w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center text-xs" title={badge.name}>
                                                                    {badge.icon}
                                                                </div>
                                                            ))}
                                                            {learner.badges.length > 3 && (
                                                                <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground">
                                                                    +{learner.badges.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <span className="text-xs text-muted-foreground md:hidden ml-1">
                                                        • {learner.targetRole}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 hidden md:table-cell text-muted-foreground">
                                        {learner.targetRole || 'Explorer'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary-foreground border border-secondary/20">
                                            Lvl {learner.level}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-medium text-foreground">
                                        {learner.xp?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold text-primary">
                                        {learner.overallScore}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {topUsers.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                        No rankings yet. Start learning to climb the leaderboard!
                    </div>
                )}
            </div>
        </div>
    );
}

// Components
function StatsCard({ title, value, icon: Icon, color, subValue }) {
    return (
        <div className="card p-5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br ${color} rounded-bl-3xl`}>
                <Icon className="w-12 h-12" />
            </div>
            <div className="flex flex-col gap-1 relative z-10">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
                {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
            </div>
        </div>
    );
}

function getRankBadge(rank) {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="text-muted-foreground">#{rank}</span>;
}
