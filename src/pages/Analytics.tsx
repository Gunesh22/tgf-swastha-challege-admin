import { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { computeGlobalUserStats } from '../utils/stats';
import { 
    Search, 
    Database, 
    Calendar, 
    Check, 
    X, 
    Smile, 
    Award, 
    Activity, 
    FileText,
    TrendingUp,
    MessageSquare,
    Clock
} from 'lucide-react';

const getHabitDisplayName = (habitId: string) => {
    const habitMeta: Record<string, string> = {
        'early_rising': '🌅 Early Rising (प्रातः काल)',
        'morning_hydration': '💧 Morning Hydration (उषापान)',
        'yogasana': '🧘 Daily Yogasana (योगासन)',
        'conscious_breathing': '💨 Conscious Breathing (प्राणायाम)',
        'mindful_eating': '🥗 Mindful Eating (सचेत भोजन)',
        'gratitude': '💖 Gratitude Practice (कृतज्ञता)',
        'digital_detox': '🌙 Sleep Digital Detox',
        'water': '💧 Drink Water',
        'meditate': '🧘 Meditate (ध्यान)',
        'read': '📚 Read Book',
        'exercise': '💪 Exercise (व्यायाम)',
        'journal': '✍️ Journaling',
        'sleep': '🌙 Sleep 8 Hours',
        'diet': '🥗 Healthy Meal'
    };
    return habitMeta[habitId] || habitId;
};

const formatCreatedAt = (createdAt: any) => {
    if (!createdAt) return 'N/A';
    if (createdAt.toDate) {
        return createdAt.toDate().toLocaleString();
    }
    if (createdAt.seconds) {
        return new Date(createdAt.seconds * 1000).toLocaleString();
    }
    return new Date(createdAt).toLocaleString();
};

export default function Analytics() {
    const { users: rawUsers, userChallenges, challenges, loading } = useData();
    const [stats, setStats] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'explorer'>('overview');

    // Explorer State (grouped challenge-wise)
    const [selectedChallengeId, setSelectedChallengeId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userSearchQuery, setUserSearchQuery] = useState('');

    useEffect(() => {
        if (loading) return;
        const computed = computeGlobalUserStats(rawUsers, userChallenges, challenges);
        setStats(computed);
    }, [rawUsers, userChallenges, challenges, loading]);

    // Auto-select challenge initially
    useEffect(() => {
        if (challenges.length > 0 && !selectedChallengeId) {
            setSelectedChallengeId(challenges[0].id);
        }
    }, [challenges, selectedChallengeId]);

    // Get enrollments for the selected challenge
    const enrollmentsForChallenge = userChallenges.filter(uc => uc.challengeId === selectedChallengeId);

    // Get users who are in these enrollments
    const enrolledUsers = rawUsers.filter(u => 
        enrollmentsForChallenge.some(uc => uc.userId === u.id)
    );

    // Filter enrolled users by search query
    const filteredEnrolledUsers = enrolledUsers.filter(u => {
        const query = userSearchQuery.toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(query) ||
            (u.email || '').toLowerCase().includes(query) ||
            (u.phone || '').toLowerCase().includes(query)
        );
    });

    // Auto-select user when challenge changes or search query changes
    useEffect(() => {
        if (filteredEnrolledUsers.length > 0) {
            const isCurrentSelectedValid = filteredEnrolledUsers.some(u => u.id === selectedUserId);
            if (!isCurrentSelectedValid) {
                setSelectedUserId(filteredEnrolledUsers[0].id);
            }
        } else {
            setSelectedUserId('');
        }
    }, [selectedChallengeId, userSearchQuery, filteredEnrolledUsers.length]);

    // Get the active user challenge document
    const activeUserChallenge = enrollmentsForChallenge.find(uc => uc.userId === selectedUserId);

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Clock className="animate-spin" size={32} color="var(--accent)" />
            </div>
        );
    }

    // --- Overview Metrics ---
    const totalUsers = rawUsers.length;
    const totalEnrollments = userChallenges.length;
    const avgConsistency = stats.length > 0 
        ? Math.round(stats.reduce((sum, s) => sum + s.consistencyRate, 0) / stats.length) 
        : 0;
    const todayCount = stats.filter(s => s.practicedToday).length;

    // Challenge breakdown
    const challengeBreakdown = challenges.map(c => {
        const enrollments = userChallenges.filter(uc => uc.challengeId === c.id);
        const enrollCount = enrollments.length;
        let avgProgress = 0;
        if (enrollCount > 0) {
            const totalProgress = enrollments.reduce((sum, uc) => {
                const completed = Object.keys(uc.completedDays || {}).length;
                const duration = c.durationDays || 1;
                return sum + Math.round((Math.min(completed, duration) / duration) * 100);
            }, 0);
            avgProgress = Math.round(totalProgress / enrollCount);
        }
        return {
            title: c.title || c.name || 'Unnamed',
            enrollCount,
            avgProgress
        };
    }).sort((a, b) => b.enrollCount - a.enrollCount);

    // Habit leaderboard (counts how many enrollments completed each habit at least once)
    const habitLeaderboardMap: Record<string, { name: string, count: number }> = {};
    userChallenges.forEach(uc => {
        const completions = uc.habitCompletions || {};
        const completedInThisChallenge = new Set<string>();

        Object.keys(completions).forEach(date => {
            const dayHabits = completions[date] || {};
            Object.keys(dayHabits).forEach(habitId => {
                if (dayHabits[habitId] === true) {
                    completedInThisChallenge.add(habitId);
                }
            });
        });

        completedInThisChallenge.forEach(habitId => {
            if (!habitLeaderboardMap[habitId]) {
                habitLeaderboardMap[habitId] = {
                    name: getHabitDisplayName(habitId),
                    count: 0
                };
            }
            habitLeaderboardMap[habitId].count += 1;
        });
    });
    const sortedHabits = Object.values(habitLeaderboardMap).sort((a, b) => b.count - a.count);

    // Timeline dates builder for the active user challenge explorer
    const timelineDates: string[] = [];
    if (activeUserChallenge) {
        const datesSet = new Set<string>();
        // Add from completedDatesArray
        if (Array.isArray(activeUserChallenge.completedDatesArray)) {
            activeUserChallenge.completedDatesArray.forEach((d: string) => datesSet.add(d));
        }
        // Add from keys of completedDays map
        if (activeUserChallenge.completedDays) {
            Object.keys(activeUserChallenge.completedDays).forEach(d => datesSet.add(d));
        }
        // Add from habitCompletions keys
        if (activeUserChallenge.habitCompletions) {
            Object.keys(activeUserChallenge.habitCompletions).forEach(d => datesSet.add(d));
        }
        // Add from reflections keys
        if (activeUserChallenge.reflections) {
            Object.keys(activeUserChallenge.reflections).forEach(d => datesSet.add(d));
        }

        timelineDates.push(...Array.from(datesSet).sort().reverse()); // Sort descending (newest first)
    }

    return (
        <div className="main-content">
            <div className="flex-between page-header" style={{ marginBottom: '24px' }}>
                <div>
                    <h1>Analytics & Database Inspector</h1>
                    <p>Simplified overall statistics and challenge-wise database document explorer.</p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`glass-button ${activeTab === 'overview' ? '' : 'secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                    <Activity size={16} /> Overview Stats
                </button>
                <button 
                    onClick={() => setActiveTab('explorer')}
                    className={`glass-button ${activeTab === 'explorer' ? '' : 'secondary'}`}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                    <Database size={16} /> Challenge Database Explorer
                </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div>
                    {/* Stat Metrics */}
                    <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
                        <div className="glass-panel stat-card">
                            <div className="stat-label">Total Users</div>
                            <div className="stat-value">{totalUsers}</div>
                        </div>
                        <div className="glass-panel stat-card">
                            <div className="stat-label">Active Enrollments</div>
                            <div className="stat-value">{totalEnrollments}</div>
                        </div>
                        <div className="glass-panel stat-card">
                            <div className="stat-label">Avg Consistency</div>
                            <div className="stat-value">{avgConsistency}%</div>
                        </div>
                        <div className="glass-panel stat-card">
                            <div className="stat-label">Completed Today</div>
                            <div className="stat-value">{todayCount} users</div>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
                        {/* Challenge stats table */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                                <Award size={18} /> Challenge Performance
                            </h3>
                            <div className="data-table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Challenge</th>
                                            <th>Enrollments</th>
                                            <th>Avg Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {challengeBreakdown.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 500 }}>{item.title}</td>
                                                <td>{item.enrollCount}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                                            <div style={{ height: '100%', background: 'var(--success)', width: `${item.avgProgress}%` }}></div>
                                                        </div>
                                                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{item.avgProgress}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Habit stats table */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}>
                                <TrendingUp size={18} /> Habit Popularity
                            </h3>
                            <div className="data-table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Habit</th>
                                            <th style={{ textAlign: 'right' }}>Practiced By (Users)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedHabits.slice(0, 10).map((habit, i) => (
                                            <tr key={i}>
                                                <td style={{ fontSize: '13px', fontWeight: 500 }}>{habit.name}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success)' }}>
                                                    {habit.count}
                                                </td>
                                            </tr>
                                        ))}
                                        {sortedHabits.length === 0 && (
                                            <tr>
                                                <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No completions logged.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DATABASE EXPLORER */}
            {activeTab === 'explorer' && (
                <div>
                    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Search & Select (Challenge-Wise)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            {/* 1. Challenge Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    SELECT CHALLENGE
                                </label>
                                <select 
                                    className="glass-input" 
                                    value={selectedChallengeId}
                                    onChange={(e) => {
                                        setSelectedChallengeId(e.target.value);
                                        setSelectedUserId(''); // Reset selected user
                                    }}
                                >
                                    {challenges.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.title || c.name || 'Unnamed'} (ID: {c.id.slice(0, 6)}...)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Enrolled User Search */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    FILTER ENROLLED USERS
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Filter by name/email/phone..." 
                                        className="glass-input" 
                                        style={{ paddingLeft: '32px' }}
                                        value={userSearchQuery}
                                        onChange={(e) => {
                                            setUserSearchQuery(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* 3. Enrolled User Selector */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    SELECT ENROLLED USER
                                </label>
                                <select 
                                    className="glass-input" 
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    disabled={filteredEnrolledUsers.length === 0}
                                >
                                    {filteredEnrolledUsers.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || 'Unknown'} ({u.email || u.phone || 'No Info'})
                                        </option>
                                    ))}
                                    {filteredEnrolledUsers.length === 0 && (
                                        <option value="">No enrolled users match filter</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    {activeUserChallenge ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '24px', alignItems: 'start' }}>
                            
                            {/* LEFT SIDE: DOCUMENT STRUCTURE */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                {/* Info Panel */}
                                <div className="glass-panel" style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                                        <Database size={18} />
                                        <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Document Fields</h3>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                DOCUMENT PATH
                                            </span>
                                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'block', overflowX: 'auto', marginTop: '3px' }}>
                                                user_challenges/{activeUserChallenge.id || 'eUSipR5fGlBtMSmQOkll'}
                                            </code>
                                        </div>

                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                CHALLENGE ID (challengeId)
                                            </span>
                                            <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'block', marginTop: '3px' }}>
                                                "{activeUserChallenge.challengeId}"
                                            </code>
                                        </div>

                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                CREATED AT (createdAt)
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                <Calendar size={14} color="var(--text-secondary)" />
                                                <span>{formatCreatedAt(activeUserChallenge.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
                                                SELECTED HABITS (selectedHabits)
                                            </span>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {Array.isArray(activeUserChallenge.selectedHabits) ? (
                                                    activeUserChallenge.selectedHabits.map((h: string) => (
                                                        <span key={h} style={{ fontSize: '11px', background: '#eff6ff', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontWeight: 500 }}>
                                                            {h}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>[] (No habits selected)</span>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '4px' }}>
                                                COMPLETED DATES ARRAY (completedDatesArray)
                                            </span>
                                            {Array.isArray(activeUserChallenge.completedDatesArray) && activeUserChallenge.completedDatesArray.length > 0 ? (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '100px', overflowY: 'auto', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                                    {activeUserChallenge.completedDatesArray.map((date: string) => (
                                                        <span key={date} style={{ fontSize: '10px', background: '#ecfdf5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                            "{date}"
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>[]</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Raw JSON view for pure debugging convenience */}
                                <div className="glass-panel" style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <FileText size={16} />
                                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Raw Document JSON</span>
                                    </div>
                                    <pre style={{ 
                                        background: '#0f172a', 
                                        color: '#38bdf8', 
                                        padding: '12px', 
                                        borderRadius: '6px', 
                                        fontSize: '11px', 
                                        overflowX: 'auto',
                                        maxHeight: '200px',
                                        fontFamily: 'monospace'
                                    }}>
                                        {JSON.stringify({
                                            challengeId: activeUserChallenge.challengeId,
                                            createdAt: activeUserChallenge.createdAt,
                                            selectedHabits: activeUserChallenge.selectedHabits,
                                            completedDatesArray: activeUserChallenge.completedDatesArray,
                                            completedDaysCount: activeUserChallenge.completedDays ? Object.keys(activeUserChallenge.completedDays).length : 0,
                                            habitCompletionsCount: activeUserChallenge.habitCompletions ? Object.keys(activeUserChallenge.habitCompletions).length : 0,
                                            reflectionsCount: activeUserChallenge.reflections ? Object.keys(activeUserChallenge.reflections).length : 0
                                        }, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {/* RIGHT SIDE: INTERACTIVE TIMELINE / DAILY STATUS */}
                            <div className="glass-panel" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    <Calendar size={18} />
                                    <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Daily Database State & Reflections</h3>
                                </div>

                                {timelineDates.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                        No logs found on this challenge enrollment yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {timelineDates.map(date => {
                                            const dayChecked = activeUserChallenge.completedDays?.[date] === true;
                                            const reflectionsMap = activeUserChallenge.reflections?.[date] || null;
                                            const dayHabits = activeUserChallenge.habitCompletions?.[date] || {};

                                            return (
                                                <div 
                                                    key={date} 
                                                    style={{ 
                                                        border: '1px solid var(--border-color)', 
                                                        borderRadius: '8px', 
                                                        padding: '14px', 
                                                        background: dayChecked ? '#f8fafc' : '#fff'
                                                    }}
                                                >
                                                    {/* Day Header */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                                                            {date}
                                                        </span>
                                                        <span style={{ 
                                                            display: 'inline-flex', 
                                                            alignItems: 'center', 
                                                            gap: '4px', 
                                                            fontSize: '11px', 
                                                            fontWeight: 700, 
                                                            color: dayChecked ? 'var(--success)' : 'var(--danger)',
                                                            background: dayChecked ? '#ecfdf5' : '#fef2f2',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {dayChecked ? <Check size={12} /> : <X size={12} />}
                                                            completedDays: {dayChecked ? 'true' : 'false'}
                                                        </span>
                                                    </div>

                                                    {/* Habits Completed Status (habitCompletions) */}
                                                    <div style={{ marginBottom: '10px' }}>
                                                        <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                            HABIT COMPLETIONS (habitCompletions)
                                                        </span>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                                            {Array.isArray(activeUserChallenge.selectedHabits) && activeUserChallenge.selectedHabits.map((habitId: string) => {
                                                                const completed = dayHabits[habitId] === true;
                                                                return (
                                                                    <div key={habitId} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                                                        {completed ? (
                                                                            <Check size={14} color="var(--success)" style={{ strokeWidth: 3 }} />
                                                                        ) : (
                                                                            <X size={14} color="var(--danger)" style={{ strokeWidth: 3 }} />
                                                                        )}
                                                                        <span style={{ color: completed ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                                            {getHabitDisplayName(habitId)}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Reflection Section (reflections) */}
                                                    {reflectionsMap && (reflectionsMap.feeling || reflectionsMap.thought) && (
                                                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-color)', background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                                                            <span style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                                                REFLECTION (reflections)
                                                            </span>
                                                            {reflectionsMap.feeling && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', marginBottom: '4px' }}>
                                                                    <Smile size={14} color="var(--accent)" />
                                                                    <strong>feeling:</strong> <span>"{reflectionsMap.feeling}"</span>
                                                                </div>
                                                            )}
                                                            {reflectionsMap.thought && (
                                                                <div style={{ display: 'flex', gap: '4px', fontSize: '12px' }}>
                                                                    <MessageSquare size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                                    <div>
                                                                        <strong>thought:</strong> <span style={{ fontStyle: 'italic' }}>"{reflectionsMap.thought}"</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Database size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <p>No enrollment selected. Please select a challenge and enrolled user to see database fields.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
