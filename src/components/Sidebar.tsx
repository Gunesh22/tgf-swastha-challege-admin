import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BarChart2, Medal, Settings, Sun, FileText, RefreshCw, Edit2, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function Sidebar() {
    const location = useLocation();
    const {
        lastUpdated,
        refreshing,
        dailyReadCount,
        dailyReadLimit,
        refreshData,
        setDailyReadLimit,
        resetDailyReadCount,
        error
    } = useData();

    const [isEditingLimit, setIsEditingLimit] = useState(false);
    const [tempLimit, setTempLimit] = useState(String(dailyReadLimit));
    const [timeStr, setTimeStr] = useState('');

    useEffect(() => {
        setTempLimit(String(dailyReadLimit));
    }, [dailyReadLimit]);

    const getRelativeTime = (isoString: string | null) => {
        if (!isoString) return 'Never synced';
        const diffMs = Date.now() - new Date(isoString).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 min ago';
        if (diffMins < 60) return `${diffMins} mins ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hr ago';
        if (diffHours < 24) return `${diffHours} hrs ago`;
        return new Date(isoString).toLocaleDateString();
    };

    useEffect(() => {
        const update = () => {
            setTimeStr(getRelativeTime(lastUpdated));
        };
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    const handleSaveLimit = () => {
        const val = Number(tempLimit);
        if (!isNaN(val) && val > 0) {
            setDailyReadLimit(val);
            setIsEditingLimit(false);
        }
    };

    const handleSync = async () => {
        if (refreshing) return;
        if (dailyReadCount >= dailyReadLimit) {
            if (window.confirm(`Warning: Daily Firestore read limit (${dailyReadLimit}) has been reached. Syncing will consume additional reads. Do you want to override and sync anyway?`)) {
                await refreshData(true);
            }
        } else {
            await refreshData();
        }
    };

    const pct = Math.min(100, Math.round((dailyReadCount / dailyReadLimit) * 100));
    let barClass = '';
    if (pct >= 90) barClass = 'danger';
    else if (pct >= 70) barClass = 'warning';

    const navItems = [
        { path: '/', label: 'Overview', icon: LayoutDashboard },
        { path: '/users', label: 'All Users', icon: Users },
        { path: '/leaderboard', label: 'Leaderboard', icon: Medal },
        { path: '/analytics', label: 'Analytics', icon: BarChart2 },
        { path: '/challenges', label: 'Manage Challenges', icon: Settings },
        { path: '/content', label: 'Content Management', icon: FileText },
    ];

    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <Sun size={28} />
                TGF Admin
            </div>

            <div className="nav-links">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <Icon size={20} />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* Quota Management Widget */}
            <div className="quota-card">
                <div className="quota-status">
                    <span>Firestore Reads</span>
                    <span style={{ fontWeight: 600 }}>
                        {dailyReadCount.toLocaleString()} / {dailyReadLimit.toLocaleString()}
                    </span>
                </div>

                <div className="quota-progress-bg">
                    <div 
                        className={`quota-progress-bar ${barClass}`} 
                        style={{ width: `${pct}%` }}
                    ></div>
                </div>

                {error && (
                    <div style={{ color: 'var(--danger)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', margin: '2px 0' }}>
                        <AlertTriangle size={12} />
                        {error}
                    </div>
                )}

                {isEditingLimit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="quota-edit-inline">
                            <input
                                type="number"
                                className="quota-edit-input"
                                value={tempLimit}
                                onChange={(e) => setTempLimit(e.target.value)}
                                placeholder="Limit"
                                min="10"
                            />
                            <button className="quota-btn-edit" onClick={handleSaveLimit} title="Save Limit">
                                <Check size={14} />
                            </button>
                            <button 
                                className="quota-btn-edit" 
                                onClick={() => setIsEditingLimit(false)}
                                title="Cancel"
                                style={{ color: 'var(--danger)' }}
                            >
                                ✕
                            </button>
                        </div>
                        <button 
                            className="glass-button secondary"
                            onClick={() => {
                                if (window.confirm('Reset today\'s read counter? (Does not reset Firestore actual billing)')) {
                                    resetDailyReadCount();
                                    setIsEditingLimit(false);
                                }
                            }}
                            style={{ padding: '4px 8px', fontSize: '10px', height: '24px', display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <RotateCcw size={10} /> Reset Counter
                        </button>
                    </div>
                ) : (
                    <div className="quota-meta">
                        <span>Synced: {timeStr}</span>
                        <button 
                            className="quota-btn-edit" 
                            onClick={() => setIsEditingLimit(true)} 
                            title="Edit Daily Limit"
                        >
                            <Edit2 size={12} />
                        </button>
                    </div>
                )}

                <button
                    onClick={handleSync}
                    className="glass-button secondary"
                    disabled={refreshing}
                    style={{ 
                        width: '100%', 
                        fontSize: '12px', 
                        height: '32px', 
                        padding: '0 8px',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Syncing...' : 'Sync Database'}
                </button>
            </div>
        </div>
    );
}
