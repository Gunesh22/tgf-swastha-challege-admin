import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDoc, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { PlusCircle, Search, Trash2, Calendar, LayoutList, RefreshCw, CheckCircle, Edit2, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Challenge, Habit } from '../context/DataContext';

const HOLISTIC_HABITS: Habit[] = [
    { id: 'early_rising', name: 'Early Rising', description: 'Wake up early to start your day with energy', hindiName: 'प्रातः काल जागरण', hindiDescription: 'ऊर्जा के साथ दिन की शुरुआत के लिए सुबह जल्दी उठें', icon: 'wb_sunny', color: 'primary' },
    { id: 'morning_hydration', name: 'Morning Hydration Ritual', description: 'Drink warm water first thing in the morning', hindiName: 'उषापान', hindiDescription: 'सुबह उठते ही सबसे पहले गुनगुना पानी पिएं', icon: 'water_drop', color: 'secondary' },
    { id: 'yogasana', name: 'Daily Yogasana Practice', description: 'Perform physical postures for strength and flexibility', hindiName: 'दैनिक योगासन अभ्यास', hindiDescription: 'शारीरिक शक्ति और लचीलेपन के लिए योगासन करें', icon: 'self_improvement', color: 'tertiary' },
    { id: 'conscious_breathing', name: 'Conscious Breathing', description: 'Practice deep, mindful breathing (Pranayama)', hindiName: 'सचेत श्वास क्रिया', hindiDescription: 'गहरी और सचेत सांस लेने (प्राणायाम) का अभ्यास करें', icon: 'air', color: 'primary' },
    { id: 'mindful_eating', name: 'Mindful Eating', description: 'Chew food slowly and appreciate its taste and nutrition', hindiName: 'सचेत भोजन', hindiDescription: 'भोजन को धीरे-धीरे चबाएं और स्वाद व पोषण का अनुभव करें', icon: 'restaurant', color: 'secondary' },
    { id: 'gratitude', name: 'Gratitude Practice', description: 'Write down three things you are grateful for today', hindiName: 'कृतज्ञता अभ्यास', hindiDescription: 'आज जिन तीन चीजों के लिए आप आभारी हैं, उन्हें लिखें', icon: 'favorite', color: 'tertiary' },
    { id: 'digital_detox', name: 'Digital Detox Before Sleep', description: 'Avoid screens 30-45 minutes before bedtime', hindiName: 'सोने से पहले डिजिटल डिटॉक्स', hindiDescription: 'सोने से 30-45 मिनट पहले स्क्रीन के इस्तेमाल से बचें', icon: 'phonelink_off', color: 'primary' },
    { id: 'water', name: 'Drink Water', description: 'Stay hydrated (3L)', hindiName: 'पानी पीना', hindiDescription: 'हाइड्रेटेड रहें (3 लीटर)', icon: 'water_drop', color: 'primary' },
    { id: 'meditate', name: 'Meditate', description: 'Mindfulness practice (15m)', hindiName: 'ध्यान साधना', hindiDescription: 'सचेतन अभ्यास (15 मिनट)', icon: 'self_improvement', color: 'secondary' },
    { id: 'read', name: 'Read Book', description: '10 pages a day', hindiName: 'पुस्तक पढ़ना', hindiDescription: 'रोज 10 पृष्ठ पढ़ें', icon: 'menu_book', color: 'tertiary' },
    { id: 'exercise', name: 'Exercise', description: 'Active movement (30m)', hindiName: 'व्यायाम', hindiDescription: 'व्यायाम', icon: 'fitness_center', color: 'primary' },
    { id: 'journal', name: 'Journaling', description: 'Reflect on today', hindiName: 'दैनिक डायरी लिखना', hindiDescription: 'आज के दिन पर विचार करें', icon: 'edit_note', color: 'secondary' },
    { id: 'sleep', name: 'Sleep 8 Hours', description: 'Proper body recovery', hindiName: '8 घंटे की नींद', hindiDescription: 'शरीर को पुनर्जीवित करने के लिए', icon: 'bedtime', color: 'tertiary' },
    { id: 'diet', name: 'Healthy Meal', description: 'Fuel your body right', hindiName: 'स्वस्वस्थ भोजन', hindiDescription: 'शरीर को सही पोषण दें', icon: 'restaurant', color: 'primary' }
];

const getHabitIconEmoji = (iconName: string): string => {
    const lower = iconName.toLowerCase();
    if (lower.includes('sunny') || lower.includes('sun') || lower.includes('early') || lower.includes('rise')) return '🌅';
    if (lower.includes('water') || lower.includes('drop') || lower.includes('hydration')) return '💧';
    if (lower.includes('meditate') || lower.includes('self') || lower.includes('improvement') || lower.includes('yoga')) return '🧘';
    if (lower.includes('air') || lower.includes('breath') || lower.includes('breathing')) return '💨';
    if (lower.includes('read') || lower.includes('book')) return '📚';
    if (lower.includes('exercise') || lower.includes('fitness') || lower.includes('center') || lower.includes('run')) return '💪';
    if (lower.includes('journal') || lower.includes('note') || lower.includes('write') || lower.includes('edit')) return '✍️';
    if (lower.includes('sleep') || lower.includes('bed') || lower.includes('night') || lower.includes('detox')) return '🌙';
    if (lower.includes('diet') || lower.includes('restaurant') || lower.includes('food') || lower.includes('eat') || lower.includes('eating')) return '🥗';
    if (lower.includes('favorite') || lower.includes('gratitude') || lower.includes('love') || lower.includes('heart')) return '💖';
    if (lower.includes('cafe') || lower.includes('tea') || lower.includes('coffee') || lower.includes('local_cafe')) return '🍵';
    return '🪷';
};

export default function ManageChallenges() {
    const { challenges, refreshData, loading: contextLoading } = useData();
    const [loadingLocal, setLoadingLocal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [durationDays, setDurationDays] = useState(11);
    const [habitCount, setHabitCount] = useState(5);
    const [startType, setStartType] = useState<'rolling' | 'cohort'>('rolling');
    const [startDate, setStartDate] = useState('');

    // Dynamic Habits states
    const [globalHabits, setGlobalHabits] = useState<Habit[]>([]);
    const [selectedHabitIds, setSelectedHabitIds] = useState<string[]>([]);
    const [customHabits, setCustomHabits] = useState<Habit[]>([]);

    // Sub-form for a new challenge-specific custom habit
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDescription, setNewHabitDescription] = useState('');
    const [newHabitHindiName, setNewHabitHindiName] = useState('');
    const [newHabitHindiDescription, setNewHabitHindiDescription] = useState('');
    const [newHabitIcon, setNewHabitIcon] = useState('self_improvement');
    const [newHabitColor, setNewHabitColor] = useState('primary');

    // Filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'running' | 'done' | 'rolling'>('all');

    const loading = contextLoading || loadingLocal;

    const fetchGlobalHabits = async () => {
        try {
            const docRef = doc(db, 'admin_settings', 'content_management');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.habits && data.habits.length > 0) {
                    setGlobalHabits(data.habits);
                    return;
                }
            }
            setGlobalHabits(HOLISTIC_HABITS);
        } catch (err) {
            console.error('Error fetching global habits', err);
            setGlobalHabits(HOLISTIC_HABITS);
        }
    };

    useEffect(() => {
        fetchGlobalHabits();
    }, []);

    const handleResetHabitState = () => {
        setSelectedHabitIds([]);
        setCustomHabits([]);
        setNewHabitName('');
        setNewHabitDescription('');
        setNewHabitHindiName('');
        setNewHabitHindiDescription('');
        setNewHabitIcon('self_improvement');
        setNewHabitColor('primary');
    };

    const handleSaveChallenge = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate cohort challenges have a start date
        if (startType === 'cohort' && !startDate) {
            setMessage('Please set a Start Date for cohort challenges.');
            return;
        }
        if (habitCount < 1) {
            setMessage('Minimum Habits to Select must be at least 1.');
            return;
        }

        setSubmitting(true);
        setMessage('');
        setLoadingLocal(true);

        try {
            // Build the dynamic list of habits for this challenge
            const selectedGlobalHabits = globalHabits.filter(gh => selectedHabitIds.includes(gh.id));
            const finalHabits = [...selectedGlobalHabits, ...customHabits];

            const challengeData = {
                title,
                description,
                durationDays: Number(durationDays),
                habitCount: Number(habitCount),
                startType,
                startDate: startType === 'cohort' ? startDate : null,
                icon: '🪷',
                habits: finalHabits
            };

            if (editingId) {
                // Fetch current isActive so we never drop it on update
                const existingChallenge = challenges.find(c => c.id === editingId);
                await updateDoc(doc(db, 'challenges', editingId), {
                    ...challengeData,
                    isActive: existingChallenge?.isActive ?? true  // Preserve existing value
                });
                setMessage('Challenge updated successfully!');
            } else {
                await addDoc(collection(db, 'challenges'), {
                    ...challengeData,
                    isActive: true,
                    createdAt: new Date()
                });
                setMessage('Challenge created successfully!');
            }

            setTimeout(() => setMessage(''), 3000);

            // Reset form
            setEditingId(null);
            setTitle('');
            setDescription('');
            setDurationDays(11);
            setHabitCount(5);
            setStartType('rolling');
            setStartDate('');
            setIsFormOpen(false);
            handleResetHabitState();

            // Refresh cached data context (forces Firestore load)
            await refreshData(true);

        } catch (err) {
            console.error('Error saving challenge', err);
            setMessage(`Failed to save challenge: ${(err as any).message}`);
        } finally {
            setSubmitting(false);
            setLoadingLocal(false);
        }
    };

    const handleEditClick = (challenge: Challenge) => {
        setEditingId(challenge.id);
        setTitle(challenge.title || (challenge as any).name || '');
        setDescription(challenge.description || '');
        setDurationDays(challenge.durationDays || 11);
        setHabitCount((challenge as any).habitCount || 5);
        setStartType(challenge.startType || 'rolling');
        setStartDate(challenge.startDate || '');

        // Match habits to separate global catalog vs local custom ones
        const challengeHabits = challenge.habits || [];
        const globalIds: string[] = [];
        const customItems: Habit[] = [];

        challengeHabits.forEach(h => {
            const isGlobal = globalHabits.some(gh => gh.id === h.id);
            if (isGlobal) {
                globalIds.push(h.id);
            } else {
                customItems.push(h);
            }
        });

        setSelectedHabitIds(globalIds);
        setCustomHabits(customItems);

        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setDurationDays(11);
        setHabitCount(5);
        setStartType('rolling');
        setStartDate('');
        setIsFormOpen(false);
        handleResetHabitState();
    };

    const handleAddNewClick = () => {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setDurationDays(11);
        setHabitCount(5);
        setStartType('rolling');
        setStartDate('');
        handleResetHabitState();
        setIsFormOpen(!isFormOpen);
    };

    const handleDelete = async (id: string, challengeTitle: string) => {
        if (window.confirm(`Are you sure you want to completely delete "${challengeTitle}"? This action cannot be undone.`)) {
            try {
                setLoadingLocal(true);
                await deleteDoc(doc(db, 'challenges', id));
                await refreshData(true);
            } catch (err) {
                console.error('Error deleting challenge', err);
                alert('Failed to delete challenge.');
            } finally {
                setLoadingLocal(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw className="animate-spin" size={32} color="var(--accent)" />
            </div>
        );
    }

    const filteredChallenges = challenges.filter(c => {
        const matchesSearch = (c.title || (c as any).name || '').toLowerCase().includes(searchQuery.toLowerCase());

        let status = 'rolling'; // default
        if (c.startType === 'cohort' && c.startDate) {
            const todayISO = new Date().toISOString().split('T')[0];
            const startStr = c.startDate;
            const startDateObj = new Date(startStr);
            const endDateObj = new Date(startDateObj.getTime() + (c.durationDays - 1) * 24 * 60 * 60 * 1000);
            const endStr = endDateObj.toISOString().split('T')[0];

            if (startStr > todayISO) {
                status = 'upcoming';
            } else if (todayISO >= startStr && todayISO <= endStr) {
                status = 'running';
            } else {
                status = 'done';
            }
        }

        const matchesStatus = statusFilter === 'all' || statusFilter === status;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="main-content">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Manage Challenges</h1>
                    <p>Create, manage, and configure the rules for multiple meditation challenges.</p>
                </div>
                {!isFormOpen && (
                    <button className="glass-button" onClick={handleAddNewClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}>
                        <PlusCircle size={18} /> Add New Challenge
                    </button>
                )}
            </div>

            {message && (
                <div className="notice" style={{ marginBottom: '24px' }}>
                    <CheckCircle size={20} />
                    {message}
                </div>
            )}

            {/* CREATE / EDIT CHALLENGE FORM */}
            {isFormOpen && (
                <form onSubmit={handleSaveChallenge} className="glass-panel settings-section" style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0 }}>
                            {editingId ? (
                                <><Edit2 size={20} color="var(--accent)" style={{ marginRight: '8px' }} /> Edit Challenge</>
                            ) : (
                                <><PlusCircle size={20} color="var(--accent)" style={{ marginRight: '8px' }} /> Create New Challenge</>
                            )}
                        </h2>
                        <button type="button" onClick={handleCancelEdit} className="btn-icon" style={{ backgroundColor: 'var(--bg-container)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <X size={16} /> Cancel
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label>Challenge Title</label>
                            <input
                                type="text"
                                className="glass-input"
                                placeholder="e.g. March Happy Thoughts"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Duration (Days)</label>
                            <input
                                type="number"
                                className="glass-input"
                                value={durationDays}
                                onChange={(e) => setDurationDays(Number(e.target.value))}
                                min={1}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Minimum Habits to Select <small style={{ color: 'var(--accent)', fontWeight: 700 }}>★</small></label>
                            <input
                                type="number"
                                className="glass-input"
                                value={habitCount}
                                onChange={(e) => setHabitCount(Math.max(1, Number(e.target.value)))}
                                min={1}
                                max={10}
                                title="Minimum number of habits the user should choose on the challenge website"
                            />
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Minimum number of habits the user should choose</p>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <label>Description</label>
                        <textarea
                            className="glass-input"
                            placeholder="A short description of this challenge..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ minHeight: '80px', resize: 'vertical' }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Challenge Start Rule</label>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                            <div
                                className={`glass-panel ${startType === 'rolling' ? 'active' : ''}`}
                                style={{
                                    flex: 1,
                                    border: startType === 'rolling' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                    backgroundColor: startType === 'rolling' ? '#f1f5f9' : 'var(--bg-container)',
                                    padding: '16px', cursor: 'pointer', borderRadius: '8px'
                                }}
                                onClick={() => setStartType('rolling')}
                            >
                                <h3 style={{ marginBottom: '8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <RefreshCw size={18} /> Rolling Start
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Users start Day 1 immediately upon registration.</p>
                            </div>

                            <div
                                className={`glass-panel ${startType === 'cohort' ? 'active' : ''}`}
                                style={{
                                    flex: 1,
                                    border: startType === 'cohort' ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                    backgroundColor: startType === 'cohort' ? '#f1f5f9' : 'var(--bg-container)',
                                    padding: '16px', cursor: 'pointer', borderRadius: '8px'
                                }}
                                onClick={() => setStartType('cohort')}
                            >
                                <h3 style={{ marginBottom: '8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={18} /> Cohort Start
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Everyone starts concurrently on an exact specific date.</p>
                            </div>
                        </div>
                    </div>

                    {startType === 'cohort' && (
                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label>Cohort Start Date</label>
                            <input
                                type="date"
                                className="glass-input"
                                style={{ maxWidth: '250px' }}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                If users join late, they skip to the current ongoing day of this cohort.
                            </p>
                        </div>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '32px 0' }} />

                    {/* HABIT CONFIGURATION SECTION */}
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <LayoutList size={20} color="var(--accent)" /> Configure Challenge Habits
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                            Choose the daily practices that seekers will track during this challenge. You can pick from the global catalog or create specific habits just for this challenge.
                        </p>

                        {/* Part 1: Global catalog checkboxes */}
                        <div style={{ marginBottom: '24px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>Select from Global Habits Catalog</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                                {globalHabits.map((habit) => {
                                    const isChecked = selectedHabitIds.includes(habit.id);
                                    return (
                                        <div
                                            key={habit.id}
                                            onClick={() => {
                                                setSelectedHabitIds(prev => 
                                                    prev.includes(habit.id)
                                                        ? prev.filter(id => id !== habit.id)
                                                        : [...prev, habit.id]
                                                );
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                border: isChecked ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                                                backgroundColor: isChecked ? '#e2f1f1' : 'var(--bg-container)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}} // Controlled via card parent onClick
                                                style={{ pointerEvents: 'none' }}
                                            />
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '6px',
                                                backgroundColor: habit.color === 'primary' ? '#ccfbf1' : habit.color === 'secondary' ? '#e0e7ff' : '#ffedd5',
                                                color: habit.color === 'primary' ? '#0f766e' : habit.color === 'secondary' ? '#4338ca' : '#c2410c',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '18px',
                                                flexShrink: 0
                                            }}>
                                                {getHabitIconEmoji(habit.icon)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {habit.name} {habit.hindiName && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '6px' }}>({habit.hindiName})</span>}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {habit.description} {habit.hindiDescription && <span style={{ fontStyle: 'italic', fontSize: '10px', marginLeft: '4px' }}>({habit.hindiDescription})</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Part 2: Custom challenge habits */}
                        <div style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '16px', backgroundColor: 'rgba(255,255,255,0.4)' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Add Custom Habits (Specific to this Challenge)
                            </h4>

                             {/* Render added custom habits */}
                             {customHabits.length > 0 && (
                                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                     {customHabits.map((ch) => (
                                         <div
                                             key={ch.id}
                                             style={{
                                                 display: 'flex',
                                                 alignItems: 'center',
                                                 gap: '8px',
                                                 padding: '6px 12px',
                                                 backgroundColor: '#f1f5f9',
                                                 border: '1px solid #cbd5e1',
                                                 borderRadius: '20px',
                                                 fontSize: '13px'
                                             }}
                                         >
                                             <span style={{ fontWeight: 600 }}>
                                                 {ch.name} {ch.hindiName && <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '12px' }}>({ch.hindiName})</span>}
                                             </span>
                                             <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                                 ({ch.description}{ch.hindiDescription && ` / ${ch.hindiDescription}`})
                                             </span>
                                             <button
                                                 type="button"
                                                 onClick={() => setCustomHabits(prev => prev.filter(item => item.id !== ch.id))}
                                                 style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                             >
                                                 <X size={14} />
                                             </button>
                                         </div>
                                     ))}
                                 </div>
                             )}
 
                             {/* Form to add custom habit */}
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                 {/* Row 1: English & Settings */}
                                 <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Habit Name (EN)</label>
                                         <input
                                             type="text"
                                             className="glass-input"
                                             placeholder="e.g. Drink Green Tea"
                                             value={newHabitName}
                                             onChange={(e) => setNewHabitName(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px' }}
                                         />
                                     </div>
 
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Description (EN)</label>
                                         <input
                                             type="text"
                                             className="glass-input"
                                             placeholder="e.g. 1 cup in morning"
                                             value={newHabitDescription}
                                             onChange={(e) => setNewHabitDescription(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px' }}
                                         />
                                     </div>
 
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Material Icon</label>
                                         <input
                                             type="text"
                                             className="glass-input"
                                             placeholder="e.g. local_cafe"
                                             value={newHabitIcon}
                                             onChange={(e) => setNewHabitIcon(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px' }}
                                         />
                                     </div>
 
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Theme Color</label>
                                         <select
                                             className="glass-input"
                                             value={newHabitColor}
                                             onChange={(e) => setNewHabitColor(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px', padding: '6px' }}
                                         >
                                             <option value="primary">Teal (Primary)</option>
                                             <option value="secondary">Indigo (Secondary)</option>
                                             <option value="tertiary">Orange (Tertiary)</option>
                                         </select>
                                     </div>
                                 </div>
 
                                 {/* Row 2: Hindi Translations & Add Button */}
                                 <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: '12px', alignItems: 'end' }}>
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Habit Name (Hindi)</label>
                                         <input
                                             type="text"
                                             className="glass-input"
                                             placeholder="जैसे: हरी चाय पीना"
                                             value={newHabitHindiName}
                                             onChange={(e) => setNewHabitHindiName(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px' }}
                                         />
                                     </div>
 
                                     <div className="form-group" style={{ margin: 0 }}>
                                         <label style={{ fontSize: '11px', marginBottom: '4px' }}>Description (Hindi)</label>
                                         <input
                                             type="text"
                                             className="glass-input"
                                             placeholder="जैसे: सुबह 1 कप पिएं"
                                             value={newHabitHindiDescription}
                                             onChange={(e) => setNewHabitHindiDescription(e.target.value)}
                                             style={{ height: '36px', fontSize: '13px' }}
                                         />
                                     </div>
 
                                     <button
                                         type="button"
                                         onClick={() => {
                                             if (!newHabitName || !newHabitDescription) return;
                                             const newHabit: Habit = {
                                                 id: `custom_${Date.now()}`,
                                                 name: newHabitName,
                                                 description: newHabitDescription,
                                                 hindiName: newHabitHindiName || undefined,
                                                 hindiDescription: newHabitHindiDescription || undefined,
                                                 icon: newHabitIcon || 'self_improvement',
                                                 color: newHabitColor
                                             };
                                             setCustomHabits(prev => [...prev, newHabit]);
                                             setNewHabitName('');
                                             setNewHabitDescription('');
                                             setNewHabitHindiName('');
                                             setNewHabitHindiDescription('');
                                             setNewHabitIcon('self_improvement');
                                             setNewHabitColor('primary');
                                         }}
                                         className="glass-button"
                                         style={{ height: '36px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                     >
                                         + Add Custom Habit
                                     </button>
                                 </div>
                             </div>
                         </div>
                    </div>

                    <button type="submit" className="glass-button" disabled={submitting} style={{ marginTop: '24px' }}>
                        {submitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Challenge' : 'Create Challenge')}
                    </button>
                </form>
            )}

            {/* LIST OF EXISTING CHALLENGES */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutList size={20} color="var(--accent)" /> Existing Challenges
                    </h2>

                    {/* FILTERS */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="search-bar" style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder="Search challenges..."
                                className="glass-input"
                                style={{ paddingLeft: '36px', width: '250px', margin: 0 }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-container)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: statusFilter === 'all' ? '#f1f5f9' : 'transparent', color: statusFilter === 'all' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: statusFilter === 'all' ? 600 : 400 }}
                            >All</button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('running')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: statusFilter === 'running' ? '#f1f5f9' : 'transparent', color: statusFilter === 'running' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: statusFilter === 'running' ? 600 : 400 }}
                            >Running</button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('upcoming')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: statusFilter === 'upcoming' ? '#f1f5f9' : 'transparent', color: statusFilter === 'upcoming' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: statusFilter === 'upcoming' ? 600 : 400 }}
                            >Upcoming</button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('done')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: statusFilter === 'done' ? '#f1f5f9' : 'transparent', color: statusFilter === 'done' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: statusFilter === 'done' ? 600 : 400 }}
                            >Done</button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('rolling')}
                                style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: statusFilter === 'rolling' ? '#f1f5f9' : 'transparent', color: statusFilter === 'rolling' ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: statusFilter === 'rolling' ? 600 : 400 }}
                            >Rolling</button>
                        </div>
                    </div>
                </div>

                {filteredChallenges.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        {challenges.length === 0 ? 'No challenges created yet. Add your first challenge!' : 'No challenges match your filters.'}
                    </div>
                ) : (
                    <div className="data-table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Challenge Name</th>
                                    <th>Duration</th>
                                    <th>Min Habits to Choose</th>
                                    <th>Format</th>
                                    <th>Status</th>
                                    <th>Configured Habits</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {filteredChallenges.map((challenge) => (
                                      <tr key={challenge.id}>
                                          <td style={{ fontWeight: 500 }}>{challenge.title || (challenge as any).name}</td>
                                          <td>{challenge.durationDays} Days</td>
                                          <td>
                                              <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                  {(challenge as any).habitCount || 5}
                                              </span>
                                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '4px' }}>min habits</span>
                                          </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {challenge.startType === 'rolling' ? <RefreshCw size={14} /> : <Calendar size={14} />}
                                                <span style={{ textTransform: 'capitalize' }}>{challenge.startType}</span>
                                                {challenge.startType === 'cohort' && challenge.startDate && <small style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>({challenge.startDate})</small>}
                                            </div>
                                        </td>
                                        <td>
                                            {(() => {
                                                let status = 'rolling';
                                                let badgeColor = 'var(--text-secondary)';
                                                let badgeBg = 'var(--bg-container)';

                                                if (challenge.startType === 'cohort' && challenge.startDate) {
                                                    const todayISO = new Date().toISOString().split('T')[0];
                                                    const startStr = challenge.startDate;
                                                    const startDateObj = new Date(startStr);
                                                    const endDateObj = new Date(startDateObj.getTime() + (challenge.durationDays - 1) * 24 * 60 * 60 * 1000);
                                                    const endStr = endDateObj.toISOString().split('T')[0];

                                                    if (startStr > todayISO) {
                                                        status = 'upcoming';
                                                        badgeColor = '#eab308';
                                                        badgeBg = '#fef08a';
                                                    } else if (todayISO >= startStr && todayISO <= endStr) {
                                                        status = 'running';
                                                        badgeColor = 'var(--success)';
                                                        badgeBg = '#bbf7d0';
                                                    } else {
                                                        status = 'done';
                                                        badgeColor = '#64748b';
                                                        badgeBg = '#f1f5f9';
                                                    }
                                                } else {
                                                    badgeColor = 'var(--accent)';
                                                    badgeBg = '#e0e7ff';
                                                }

                                                return (
                                                    <span style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: badgeColor,
                                                        backgroundColor: badgeBg,
                                                        border: `1px solid ${badgeColor}40`,
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {status}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '250px' }}>
                                                {challenge.habits && challenge.habits.length > 0 ? (
                                                    challenge.habits.slice(0, 3).map((h, i) => (
                                                        <span
                                                            key={i}
                                                            style={{
                                                                fontSize: '11px',
                                                                backgroundColor: '#f1f5f9',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '4px',
                                                                padding: '2px 6px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px'
                                                            }}
                                                        >
                                                            {h.name}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Global Default</span>
                                                )}
                                                {challenge.habits && challenge.habits.length > 3 && (
                                                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                                                        +{challenge.habits.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    title="Edit Challenge"
                                                    onClick={() => handleEditClick(challenge)}
                                                    style={{ backgroundColor: 'var(--bg-container)' }}
                                                >
                                                    <Edit2 size={16} color="var(--text-secondary)" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn-icon danger"
                                                    title="Delete Challenge"
                                                    onClick={() => handleDelete(challenge.id, challenge.title || (challenge as any).name)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
}
