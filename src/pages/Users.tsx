import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { computeGlobalUserStats } from '../utils/stats';
import type { UserStats } from '../utils/stats';
import { Link } from 'react-router-dom';

export default function Users() {
    const { users, userChallenges, challenges, loading } = useData();
    const [statsList, setStatsList] = useState<UserStats[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        if (loading) return;

        const computed = computeGlobalUserStats(users, userChallenges, challenges);
        
        // Default sort by longest streak descending
        computed.sort((a, b) => b.currentStreak - a.currentStreak);
        
        setStatsList(computed);
    }, [users, userChallenges, challenges, loading]);


    const filtered = statsList.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentList = filtered.slice(startIndex, startIndex + itemsPerPage);

    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
        return colors[name.charCodeAt(0) % colors.length] || colors[0];
    };

    return (
        <div className="main-content">
            <div className="flex-between page-header">
                <div>
                    <h1>Community Members</h1>
                    <p>Manage and view progress for all {statsList.length} registered practitioners.</p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <Search size={18} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-secondary)' }} />
                        <input 
                            type="text" 
                            className="glass-input" 
                            placeholder="Search by name, email, or phone..." 
                            style={{ paddingLeft: '40px' }}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className="data-table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading user data...</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Practitioner</th>
                                    <th>Contact</th>
                                    <th>Consistency</th>
                                    <th>Current Streak</th>
                                    <th>Best Streak</th>
                                    <th>Total Days</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentList.map(u => (
                                    <tr key={u.userId}>
                                        <td>
                                            <Link to={`/users/${u.userId}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                                                <div style={{ 
                                                    width: '36px', height: '36px', borderRadius: '50%', 
                                                    background: getAvatarColor(u.name), color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                                }}>
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ fontWeight: 500 }}>{u.name}</div>
                                            </Link>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px' }}>{u.phone}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.email}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', background: 'var(--success)', width: `${u.consistencyRate}%` }}></div>
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: 500 }}>{u.consistencyRate}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {u.currentStreak > 2 ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                                    🔥 {u.currentStreak} Days
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '13px', fontWeight: 500 }}>{u.currentStreak} Days</span>
                                            )}
                                        </td>
                                        <td><span style={{ fontSize: '13px' }}>{u.bestStreak} Days</span></td>
                                        <td><span style={{ fontSize: '13px' }}>{u.totalDays} Days</span></td>
                                        <td>
                                            {u.practicedToday ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '12px', fontWeight: 500 }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                                    Practiced Today
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 500 }}>
                                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {!loading && filtered.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 0 0', marginTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filtered.length)} of {filtered.length} entries
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                className="glass-button secondary" 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(c => c - 1)}
                            >
                                <ChevronLeft size={16} /> Prev
                            </button>
                            <button 
                                className="glass-button secondary" 
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(c => c + 1)}
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
