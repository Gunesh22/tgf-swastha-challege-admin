import { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { computeGlobalUserStats } from '../utils/stats';
import type { UserStats } from '../utils/stats';

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Analytics() {
    const [, setLoading] = useState(true);
    const [stats, setStats] = useState<UserStats[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const uSnap = await getDocs(collection(db, 'users'));
                const ucSnap = await getDocs(collection(db, 'user_challenges'));
                const cSnap = await getDocs(collection(db, 'challenges'));
                
                const uData: any[] = [];
                const ucData: any[] = [];
                const cData: any[] = [];
                
                uSnap.forEach(d => uData.push({id: d.id, ...d.data()}));
                ucSnap.forEach(d => ucData.push(d.data()));
                cSnap.forEach(d => cData.push({id: d.id, ...d.data()}));

                const computed = computeGlobalUserStats(uData, ucData, cData);
                setStats(computed);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Derived stats
    const totalLogins = stats.reduce((sum, s) => sum + s.totalDays, 0);
    const avgConsistency = stats.length > 0 ? Math.round(stats.reduce((sum, s) => sum + s.consistencyRate, 0) / stats.length) : 0;
    const activeStreaksCount = stats.filter(s => s.currentStreak > 0).length;
    const todayCount = stats.filter(s => s.practicedToday).length;
    
    // Streaks distribution
    const streaksDist = {
        '0': stats.filter(s => s.currentStreak === 0).length,
        '1-2': stats.filter(s => s.currentStreak >= 1 && s.currentStreak <= 2).length,
        '3-5': stats.filter(s => s.currentStreak >= 3 && s.currentStreak <= 5).length,
        '6-10': stats.filter(s => s.currentStreak >= 6 && s.currentStreak <= 10).length,
        '10+': stats.filter(s => s.currentStreak > 10).length,
    };
    const streakData = Object.keys(streaksDist).map(k => ({ name: k, users: streaksDist[k as keyof typeof streaksDist] }));

    // Consistency distribution
    const constDist = {
        '0-25%': stats.filter(s => s.consistencyRate <= 25).length,
        '26-50%': stats.filter(s => s.consistencyRate > 25 && s.consistencyRate <= 50).length,
        '51-75%': stats.filter(s => s.consistencyRate > 50 && s.consistencyRate <= 75).length,
        '76-100%': stats.filter(s => s.consistencyRate > 75).length,
    };
    const constData = Object.keys(constDist).map(k => ({ name: k, value: constDist[k as keyof typeof constDist] }));

    // Helper functions for smart insights
    const mostConsistent = [...stats].sort((a,b) => b.consistencyRate - a.consistencyRate)[0]?.name;
    const bestStreakUser = [...stats].sort((a,b) => b.bestStreak - a.bestStreak)[0]?.name;

    return (
        <div className="main-content">
            <div className="flex-between page-header">
                <div>
                    <h1>Comprehensive Analytics</h1>
                    <p>Deep-dive insights into user retention and consistency trends.</p>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="glass-panel stat-card">
                    <div className="stat-label">Total Logged Practices</div>
                    <div className="stat-value">{totalLogins}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Average Consistency</div>
                    <div className="stat-value">{avgConsistency}%</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Active Streaks</div>
                    <div className="stat-value">{activeStreaksCount}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Today's Participation</div>
                    <div className="stat-value">{stats.length > 0 ? Math.round((todayCount / stats.length) * 100) : 0}%</div>
                </div>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Streak Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={streakData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="users" fill="#8b5cf6" radius={[4,4,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ marginBottom: '20px', fontSize: '15px' }}>Consistency Breakdown</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={constData.filter(d => d.value > 0)}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {constData.filter(d => d.value > 0).map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={PIE_COLORS[constData.indexOf(entry) % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
                        {constData.filter(d => d.value > 0).map((d) => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[constData.indexOf(d)] }}></div>
                                {d.name} ({d.value})
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginTop: '32px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '16px' }}>🤖 AI Health Insights</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
                        🌟 <strong>{bestStreakUser || "Someone"}</strong> holds the all-time highest streak record.
                    </li>
                    <li style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
                        📊 <strong>{mostConsistent || "Someone"}</strong> is statistically the most consistent practitioner.
                    </li>
                    <li style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
                        🔔 Currently <strong>{stats.length - activeStreaksCount} users</strong> are highly at risk of losing consistency to 0 streak.
                    </li>
                </ul>
            </div>
        </div>
    );
}
