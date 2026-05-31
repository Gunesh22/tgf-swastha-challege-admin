import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { computeGlobalUserStats } from '../utils/stats';
import type { UserStats } from '../utils/stats';
import { ChevronLeft } from 'lucide-react';

export default function UserDetail() {
    const { id } = useParams();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<UserStats | null>(null);
    const [userChallenges, setUserChallenges] = useState<any[]>([]);
    const [challengeMap, setChallengeMap] = useState<Record<string, {title: string, name?: string, durationDays: number}>>({});

    useEffect(() => {
        if (!id) return;
        
        const fetchUser = async () => {
            try {
                // Fetch the user document
                const uSnap = await getDoc(doc(db, 'users', id));
                if (!uSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const userData = { id: uSnap.id, ...uSnap.data() };

                // Fetch this user's challenge enrollments
                const q = query(collection(db, 'user_challenges'), where('userId', '==', id));
                const ucSnap = await getDocs(q);
                const ucData: any[] = [];
                ucSnap.forEach(d => ucData.push(d.data()));
                setUserChallenges(ucData);

                // Fetch all challenges to resolve IDs to names
                const cSnap = await getDocs(collection(db, 'challenges'));
                const cMap: Record<string, {title: string, name?: string, durationDays: number}> = {};
                const cData: any[] = [];
                cSnap.forEach(d => {
                    const data = d.data();
                    cMap[d.id] = { title: data.title || data.name || d.id, name: data.name, durationDays: data.durationDays || 0 };
                    cData.push({ id: d.id, ...data });
                });
                setChallengeMap(cMap);

                // Compute stats for this single user
                const computed = computeGlobalUserStats([userData], ucData, cData);
                setStats(computed[0] || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    if (loading) return <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading user profile...</div>;
    
    if (!stats) return <div className="main-content">User not found</div>;

    return (
        <div className="main-content">
            <div style={{ marginBottom: '20px' }}>
                <Link to="/users" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
                    <ChevronLeft size={16} /> Back to Users
                </Link>
            </div>
            
            <div className="flex-between page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                        width: '80px', height: '80px', borderRadius: '50%', 
                        background: '#3b82f6', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '32px'
                    }}>
                        {stats.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 style={{ marginBottom: '4px' }}>{stats.name}</h1>
                        <p>{stats.email} • {stats.phone}</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="glass-panel stat-card">
                    <div className="stat-label">Current Streak</div>
                    <div className="stat-value">{stats.currentStreak} 🔥</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Best Streak</div>
                    <div className="stat-value">{stats.bestStreak} 🏆</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Total Days Practiced</div>
                    <div className="stat-value">{stats.totalDays}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="stat-label">Consistency Rate</div>
                    <div className="stat-value">{stats.consistencyRate}%</div>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                <h3 style={{ marginBottom: '20px', fontSize: '18px' }}>Challenge History</h3>
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Challenge</th>
                                <th>Progress</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userChallenges.map((uc, i) => {
                                const completed = Object.keys(uc.completedDays || {}).length;
                                const challengeInfo = challengeMap[uc.challengeId];
                                const challengeTitle = challengeInfo?.title || uc.challengeId;
                                const duration = challengeInfo?.durationDays || 0;
                                const isFinished = duration > 0 && completed >= duration;
                                const progressPct = duration > 0 ? Math.min(100, Math.round((completed / duration) * 100)) : 0;

                                return (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{challengeTitle}</div>
                                            {duration > 0 && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{duration}-Day Challenge</div>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: isFinished ? 'var(--success)' : 'var(--accent)', width: `${progressPct}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 600 }}>{completed}/{duration || '?'} Days</span>
                                            </div>
                                        </td>
                                        <td>
                                            {isFinished ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                                    ✅ Completed
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                                                    🔄 In Progress
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {userChallenges.length === 0 && (
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No challenges enrolled.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
