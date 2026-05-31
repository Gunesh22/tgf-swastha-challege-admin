import { useState, useEffect } from 'react';
import { Users, UserCheck, CheckCircle, TrendingDown, Flame, Trophy, RefreshCw, Activity, ArrowRight, Download } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { computeGlobalUserStats } from '../utils/stats';
import type { UserStats } from '../utils/stats';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

interface Challenge {
    id: string;
    name: string;
    title?: string;
    durationDays: number;
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);

    // Global data
    const [globalStats, setGlobalStats] = useState<UserStats[]>([]);
    const [recentActivity, setRecentActivity] = useState<{user: string, date: string, type: string}[]>([]);

    // Challenge-wise data
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
    const [challengeStats, setChallengeStats] = useState({
        totalUsers: 0,
        activeToday: 0,
        completionRate: 0,
        dropOffDay: 0
    });
    const [retentionData, setRetentionData] = useState<{ day: string, active: number }[]>([]);
    const [rawEnrollments, setRawEnrollments] = useState<any[]>([]);
    const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

    // 1. Fetch challenges, users, and compute global stats
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // Fetch challenges
                const cSnap = await getDocs(collection(db, 'challenges'));
                const fetchedChallenges: Challenge[] = [];
                cSnap.forEach(doc => fetchedChallenges.push({ id: doc.id, ...doc.data() } as Challenge));
                setChallenges(fetchedChallenges);
                if (fetchedChallenges.length > 0) {
                    setSelectedChallengeId(fetchedChallenges[0].id);
                }

                // Fetch users
                const uSnap = await getDocs(collection(db, 'users'));
                const uData: any[] = [];
                const profilesMap: Record<string, any> = {};
                uSnap.forEach(doc => {
                    uData.push({ id: doc.id, ...doc.data() });
                    profilesMap[doc.id] = doc.data();
                });
                setUserProfiles(profilesMap);

                // Fetch all user_challenges for global stats
                const ucSnap = await getDocs(collection(db, 'user_challenges'));
                const ucData: any[] = [];
                ucSnap.forEach(doc => ucData.push(doc.data()));

                // Compute global stats (pass challenges for proper consistency calculation)
                const computed = computeGlobalUserStats(uData, ucData, fetchedChallenges);
                setGlobalStats(computed);

                // Build real recent activity
                const todayStr = new Date().toISOString().split('T')[0];
                const activityEntries: {user: string, date: string, type: string, sortDate: string}[] = [];
                computed.forEach(u => {
                    if (u.lastPracticeDate) {
                        activityEntries.push({
                            user: u.name,
                            date: u.lastPracticeDate === todayStr ? 'Today' : u.lastPracticeDate,
                            type: 'completed practice',
                            sortDate: u.lastPracticeDate
                        });
                    }
                });
                activityEntries.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
                setRecentActivity(activityEntries.slice(0, 5));

            } catch (err) {
                console.error('Error fetching data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, []);

    // 2. Fetch enrollments for the selected challenge
    useEffect(() => {
        if (!selectedChallengeId || challenges.length === 0) return;

        const fetchEnrollments = async () => {
            try {
                const selectedChallenge = challenges.find(c => c.id === selectedChallengeId);
                if (!selectedChallenge) return;

                const duration = selectedChallenge.durationDays;

                const q = query(
                    collection(db, 'user_challenges'),
                    where('challengeId', '==', selectedChallengeId)
                );

                const querySnapshot = await getDocs(q);
                const enrollments: any[] = [];
                querySnapshot.forEach(docSnap => enrollments.push(docSnap.data()));
                setRawEnrollments(enrollments);

                // Compute challenge-specific statistics
                const totalUsers = enrollments.length;
                let activeToday = 0;
                let completedUsers = 0;
                const todayStr = new Date().toISOString().split('T')[0];

                const dayCounts = new Array(duration).fill(0);

                enrollments.forEach(enroll => {
                    const progress = enroll.completedDays || {};
                    const progressKeys = Object.keys(progress);

                    // Check if active today
                    if (progressKeys.some((dateStr: string) => dateStr.split('T')[0] === todayStr)) {
                        activeToday++;
                    }

                    // Check completion
                    if (progressKeys.length >= duration) {
                        completedUsers++;
                    }

                    // Tally for retention chart
                    for (let i = 1; i <= duration; i++) {
                        if (progressKeys.length >= i) {
                            dayCounts[i - 1]++;
                        }
                    }
                });

                const completionRate = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

                // Find biggest drop-off day
                let dropOffDay = 0;
                let maxDrop = 0;
                for (let i = 0; i < dayCounts.length - 1; i++) {
                    const drop = dayCounts[i] - dayCounts[i + 1];
                    if (drop > maxDrop) {
                        maxDrop = drop;
                        dropOffDay = i + 1;
                    }
                }

                setChallengeStats({
                    totalUsers,
                    activeToday,
                    completionRate,
                    dropOffDay: dropOffDay || 1
                });

                // Build retention chart
                const cData = dayCounts.map((count, index) => ({
                    day: `Day ${index + 1}`,
                    active: count
                }));
                setRetentionData(cData);

            } catch (err) {
                console.error('Error fetching enrollments', err);
            }
        };

        fetchEnrollments();
    }, [selectedChallengeId, challenges]);

    // Excel export
    const handleExportExcel = () => {
        const challengeName = challenges.find(c => c.id === selectedChallengeId)?.title || challenges.find(c => c.id === selectedChallengeId)?.name || "Challenge";
        const duration = challenges.find(c => c.id === selectedChallengeId)?.durationDays || 11;

        const exportData = rawEnrollments.map(enroll => {
            const user = userProfiles[enroll.userId] || {};
            const completedCount = Object.keys(enroll.completedDays || {}).length;

            return {
                Name: user.name || 'Unknown',
                Phone: user.phone || enroll.userId || 'Unknown',
                Email: user.email || 'N/A',
                "Challenge Start Date": enroll.startDate || 'N/A',
                "Days Completed": completedCount,
                "Is Finished?": completedCount >= duration ? "Yes" : "No"
            };
        });

        if (exportData.length === 0) {
            alert('No data to export for this challenge.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Participants");
        XLSX.writeFile(wb, `${challengeName}_Participants.xlsx`);
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw className="animate-spin" size={32} color="var(--accent)" />
            </div>
        );
    }

    // Global KPIs
    const totalUsers = globalStats.length;
    const practicedToday = globalStats.filter(s => s.practicedToday).length;
    const practicedPct = totalUsers > 0 ? Math.round((practicedToday / totalUsers) * 100) : 0;
    const avgStreak = totalUsers > 0 ? Math.round(globalStats.reduce((sum, s) => sum + s.currentStreak, 0) / totalUsers) : 0;
    const bestStreak = globalStats.length > 0 ? Math.max(...globalStats.map(s => s.bestStreak)) : 0;
    const topStreakers = [...globalStats].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5);

    return (
        <div className="main-content">
            {/* Page Header */}
            <div className="flex-between page-header">
                <div>
                    <h1>Dashboard Analytics</h1>
                    <p>Monitor real-time engagement across your active cohorts.</p>
                </div>
            </div>

            {/* ─── GLOBAL OVERVIEW KPIs ─── */}
            <div className="dashboard-grid">
                <div className="glass-panel stat-card">
                    <div className="flex-between">
                        <div>
                            <div className="stat-label">Total Users</div>
                            <div className="stat-value">{totalUsers}</div>
                        </div>
                        <div className="stat-icon" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}><Users size={20} /></div>
                    </div>
                </div>

                <div className="glass-panel stat-card">
                    <div className="flex-between">
                        <div>
                            <div className="stat-label">Practiced Today</div>
                            <div className="stat-value">{practicedToday} <span style={{fontSize: '14px', fontWeight: 500, color: 'var(--success)'}}>({practicedPct}%)</span></div>
                        </div>
                        <div className="stat-icon" style={{ color: 'var(--success)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}><UserCheck size={20} /></div>
                    </div>
                </div>

                <div className="glass-panel stat-card">
                    <div className="flex-between">
                        <div>
                            <div className="stat-label">Avg Streak</div>
                            <div className="stat-value">{avgStreak} Days</div>
                        </div>
                        <div className="stat-icon" style={{ color: '#f59e0b', background: '#fef3c7', border: '1px solid #fde68a' }}><Flame size={20} /></div>
                    </div>
                </div>

                <div className="glass-panel stat-card">
                    <div className="flex-between">
                        <div>
                            <div className="stat-label">Best Streak Ever</div>
                            <div className="stat-value">{bestStreak} Days</div>
                        </div>
                        <div className="stat-icon" style={{ color: '#8b5cf6', background: '#f3e8ff', border: '1px solid #e9d5ff' }}><Trophy size={20} /></div>
                    </div>
                </div>
            </div>

            {/* ─── CHALLENGE-WISE SECTION ─── */}
            {challenges.length > 0 && (
                <>
                    <div className="flex-between" style={{ marginBottom: '20px', marginTop: '16px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Challenge Analytics</h2>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select
                                className="glass-input"
                                style={{ width: '280px', cursor: 'pointer', fontWeight: 600, margin: 0 }}
                                value={selectedChallengeId}
                                onChange={(e) => setSelectedChallengeId(e.target.value)}
                            >
                                {challenges.map(c => (
                                    <option key={c.id} value={c.id}>
                                        📊 {c.title || c.name} ({c.durationDays} Days)
                                    </option>
                                ))}
                            </select>
                            <button
                                className="glass-button"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                                onClick={handleExportExcel}
                                disabled={rawEnrollments.length === 0}
                            >
                                <Download size={18} /> Export Excel
                            </button>
                        </div>
                    </div>

                    {/* Challenge-specific KPIs */}
                    <div className="dashboard-grid">
                        <div className="glass-panel stat-card">
                            <div className="flex-between">
                                <div>
                                    <div className="stat-label">Enrollments</div>
                                    <div className="stat-value">{challengeStats.totalUsers}</div>
                                </div>
                                <div className="stat-icon" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}><Users size={20} /></div>
                            </div>
                        </div>

                        <div className="glass-panel stat-card">
                            <div className="flex-between">
                                <div>
                                    <div className="stat-label">Active Today</div>
                                    <div className="stat-value">{challengeStats.activeToday}</div>
                                </div>
                                <div className="stat-icon" style={{ color: 'var(--success)', background: '#ecfdf5', border: '1px solid #a7f3d0' }}><UserCheck size={20} /></div>
                            </div>
                        </div>

                        <div className="glass-panel stat-card">
                            <div className="flex-between">
                                <div>
                                    <div className="stat-label">Completion Rate</div>
                                    <div className="stat-value">{challengeStats.completionRate}%</div>
                                </div>
                                <div className="stat-icon" style={{ color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe' }}><CheckCircle size={20} /></div>
                            </div>
                        </div>

                        <div className="glass-panel stat-card">
                            <div className="flex-between">
                                <div>
                                    <div className="stat-label">Biggest Drop-off</div>
                                    <div className="stat-value">Day {challengeStats.dropOffDay}</div>
                                </div>
                                <div className="stat-icon" style={{ color: 'var(--danger)', background: '#fef2f2', border: '1px solid #fecaca' }}><TrendingDown size={20} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Retention Curve */}
                    <div className="glass-panel" style={{ marginBottom: '32px' }}>
                        <div style={{ padding: '24px 24px 0 24px' }}>
                            <h2 style={{ fontSize: '18px' }}>Challenge Retention Curve</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>How many users successfully complete each day over time.</p>
                        </div>
                        <div className="chart-container">
                            {challengeStats.totalUsers === 0 ? (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                    No active enrollments for this challenge yet.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={retentionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} tickMargin={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--bg-container)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '8px',
                                                boxShadow: 'var(--shadow-md)'
                                            }}
                                        />
                                        <Area type="step" dataKey="active" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </>
            )}

            {challenges.length === 0 && (
                <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>No Challenges Found</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Create your first challenge in the Manage Challenges tab to start tracking analytics!</p>
                </div>
            )}

            {/* ─── BOTTOM ROW: Top Streakers + Live Feed ─── */}
            <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <div className="flex-between" style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Flame size={18} color="#f59e0b"/> Top Streakers</h3>
                        <Link to="/leaderboard" style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Full List <ArrowRight size={14}/></Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {topStreakers.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No active streakers yet.</div> : topStreakers.map((u, i) => (
                            <Link to={`/users/${u.userId}`} key={u.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)', width: '20px' }}>#{i+1}</div>
                                    <div style={{ fontWeight: 500, fontSize: '14px' }}>{u.name}</div>
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 600, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px' }}>
                                    {u.currentStreak} Days
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                        <Activity size={18} color="#3b82f6" /> Recent Activity
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {recentActivity.length === 0 ? <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No recent activity.</div> : recentActivity.map((r, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginTop: '6px' }}></div>
                                <div>
                                    <div style={{ fontSize: '14px' }}><span style={{ fontWeight: 600 }}>{r.user}</span> {r.type}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.date}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
