import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { computeGlobalUserStats } from '../utils/stats';
import type { UserStats } from '../utils/stats';

type SortMetric = 'currentStreak' | 'bestStreak' | 'totalDays' | 'consistencyRate';

export default function Leaderboard() {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<UserStats[]>([]);
    const [metric, setMetric] = useState<SortMetric>('currentStreak');

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
                setUsers(computed);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const sortedUsers = [...users].sort((a, b) => b[metric] - a[metric]);
    const top3 = sortedUsers.slice(0, 3);
    const rest = sortedUsers.slice(3, 50); // limit to top 50

    const PodiumItem = ({ user, position }: { user?: UserStats, position: 1 | 2 | 3 }) => {
        if (!user) return <div style={{ flex: 1 }}></div>;
        
        const heights = { 1: 160, 2: 120, 3: 100 };
        const colors = { 1: '#fbbf24', 2: '#94a3b8', 3: '#b45309' };
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', flex: 1, padding: '10px' }}>
                <div style={{ fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>{user.name}</div>
                <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 700, 
                    color: colors[position], 
                    marginBottom: '10px',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    {user[metric]} <span style={{ fontSize: '12px' }}>{metric === 'consistencyRate' ? '%' : ''}</span>
                </div>
                <div style={{ 
                    width: '100%', 
                    height: `${heights[position]}px`, 
                    background: `linear-gradient(to top, ${colors[position]}33, ${colors[position]}88)`,
                    borderTop: `4px solid ${colors[position]}`,
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '10px',
                    fontSize: '32px',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '0px 2px 4px rgba(0,0,0,0.2)'
                }}>
                    {position}
                </div>
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="flex-between page-header">
                <div>
                    <h1>Community Leaderboard</h1>
                    <p>Honoring the most dedicated practitioners.</p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '40px', justifyContent: 'center' }}>
                    {[
                        { id: 'currentStreak', label: '🔥 Current Streak' },
                        { id: 'bestStreak', label: '🏆 Longest Streak' },
                        { id: 'totalDays', label: '📅 Total Days' },
                        { id: 'consistencyRate', label: '📊 Consistency' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`glass-button ${metric === tab.id ? '' : 'secondary'}`}
                            onClick={() => setMetric(tab.id as SortMetric)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {!loading && users.length > 0 && (
                    <div style={{ display: 'flex', maxWidth: '600px', margin: '0 auto 40px auto', alignItems: 'flex-end', height: '250px' }}>
                        <PodiumItem position={2} user={top3[1]} />
                        <PodiumItem position={1} user={top3[0]} />
                        <PodiumItem position={3} user={top3[2]} />
                    </div>
                )}
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                            <th>Practitioner</th>
                            <th style={{ textAlign: 'right' }}>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rest.map((r, i) => (
                            <tr key={r.userId}>
                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    #{i + 4}
                                </td>
                                <td>
                                    <div style={{ fontWeight: 500 }}>{r.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.email}</div>
                                </td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                    {r[metric]}{metric === 'consistencyRate' ? '%' : ''}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
