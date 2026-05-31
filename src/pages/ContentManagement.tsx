import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FileText, Save, RefreshCw, Languages, Plus, Trash2, Activity } from 'lucide-react';

const DEFAULT_HABITS = [
    { id: 'water', name: 'Drink Water', description: 'Stay hydrated (3L)', icon: 'water_drop', color: 'primary' },
    { id: 'meditate', name: 'Meditate', description: 'Mindfulness practice (15m)', icon: 'self_improvement', color: 'secondary' },
    { id: 'read', name: 'Read Book', description: '10 pages a day', icon: 'menu_book', color: 'tertiary' },
    { id: 'exercise', name: 'Exercise', description: 'Active movement (30m)', icon: 'fitness_center', color: 'primary' },
    { id: 'journal', name: 'Journaling', description: 'Reflect on today', icon: 'edit_note', color: 'secondary' },
    { id: 'sleep', name: 'Sleep 8 Hours', description: 'Proper body recovery', icon: 'bedtime', color: 'tertiary' },
    { id: 'diet', name: 'Healthy Meal', description: 'Fuel your body right', icon: 'restaurant', color: 'primary' }
];

export default function ContentManagement() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [content, setContent] = useState('');
    const [hindiTranslation, setHindiTranslation] = useState('');
    const [habits, setHabits] = useState<any[]>([]);

    // New habit form inputs
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitDesc, setNewHabitDesc] = useState('');
    const [newHabitIcon, setNewHabitIcon] = useState('spa');
    const [newHabitColor, setNewHabitColor] = useState('primary');

    useEffect(() => {
        fetchContent();
    }, []);

    const fetchContent = async () => {
        setLoading(true);
        try {
            const docRef = doc(db, 'admin_settings', 'content_management');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setContent(data.dailyWisdom || 'Consistency is the key to lasting change.');
                setHindiTranslation(data.hindiTranslation || 'निरंतरता ही स्थायी परिवर्तन की कुंजी है।');
                setHabits(data.habits || DEFAULT_HABITS);
            } else {
                setContent('Consistency is the key to lasting change.');
                setHindiTranslation('निरंतरता ही स्थायी परिवर्तन की कुंजी है।');
                setHabits(DEFAULT_HABITS);
            }
        } catch (err) {
            console.error("Error fetching content:", err);
            setContent('Consistency is the key to lasting change.');
            setHindiTranslation('निरंतरता ही स्थायी परिवर्तन की कुंजी है।');
            setHabits(DEFAULT_HABITS);
        } finally {
            setLoading(false);
        }
    };

    const handleAddHabit = () => {
        if (!newHabitName.trim()) return;
        const newHabit = {
            id: 'habit_' + Date.now(),
            name: newHabitName.trim(),
            description: newHabitDesc.trim() || 'Custom daily practice',
            icon: newHabitIcon.trim() || 'spa',
            color: newHabitColor
        };
        setHabits([...habits, newHabit]);
        setNewHabitName('');
        setNewHabitDesc('');
        setNewHabitIcon('spa');
        setNewHabitColor('primary');
    };

    const handleDeleteHabit = (id: string) => {
        setHabits(habits.filter(h => h.id !== id));
    };

    const handleHabitFieldChange = (id: string, field: string, val: string) => {
        setHabits(habits.map(h => {
            if (h.id === id) {
                return { ...h, [field]: val };
            }
            return h;
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await setDoc(doc(db, 'admin_settings', 'content_management'), {
                dailyWisdom: content,
                hindiTranslation: hindiTranslation,
                habits: habits
            }, { merge: true });
            setMessage('Content saved successfully! The app will now show these strings.');
            setTimeout(() => setMessage(''), 5000);
        } catch (err) {
            console.error("Error saving config:", err);
            setMessage('Failed to save configuration!');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <RefreshCw className="animate-spin" size={32} color="var(--accent)" />
            </div>
        );
    }

    return (
        <div className="main-content">
            <div className="page-header">
                <h1>Content & Translations</h1>
                <p>Edit the copy, text, translations, and daily habits across the Meditation Challenge directly.</p>
            </div>

            {message && (
                <div className="notice" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '6px', marginBottom: '20px', border: '1px solid #bae6fd' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    {message}
                </div>
            )}

            <form onSubmit={handleSave}>
                <div className="glass-panel settings-section">
                    <h2><FileText size={24} color="var(--accent)" /> Daily Wisdom Quote</h2>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Global English Message (After Meditation)</label>
                        <textarea
                            className="glass-input"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={3}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}><Languages size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Global Hindi Translation</label>
                        <textarea
                            className="glass-input"
                            value={hindiTranslation}
                            onChange={(e) => setHindiTranslation(e.target.value)}
                            rows={3}
                            required
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </div>

                {/* Habits Management Card */}
                <div className="glass-panel settings-section" style={{ marginTop: '24px' }}>
                    <h2><Activity size={24} color="var(--accent)" /> Manage Holistic Habits</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                        Define the full catalogue of holistic habits that seekers can select from. Seekers can choose exactly 5 to build their daily routine.
                    </p>

                    {/* Habits list grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        {habits.map((habit) => (
                            <div key={habit.id} className="glass-panel" style={{ padding: '16px', border: '1px solid var(--border-color)', position: 'relative' }}>
                                {/* Delete button */}
                                <button
                                    type="button"
                                    onClick={() => handleDeleteHabit(habit.id)}
                                    style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--danger)',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                    title="Remove Habit"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {/* Habit Name input */}
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>HABIT NAME</label>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            value={habit.name}
                                            onChange={(e) => handleHabitFieldChange(habit.id, 'name', e.target.value)}
                                            style={{ height: '36px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    {/* Habit Description input */}
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>DESCRIPTION</label>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            value={habit.description}
                                            onChange={(e) => handleHabitFieldChange(habit.id, 'description', e.target.value)}
                                            style={{ height: '36px', fontSize: '13px' }}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {/* Icon selection */}
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>MATERIAL ICON</label>
                                            <input
                                                type="text"
                                                className="glass-input"
                                                value={habit.icon}
                                                onChange={(e) => handleHabitFieldChange(habit.id, 'icon', e.target.value)}
                                                style={{ height: '36px', fontSize: '13px' }}
                                                title="Enter a valid Material Symbol icon name, e.g. water_drop, bedtime, fitness_center, self_improvement"
                                                required
                                            />
                                        </div>

                                        {/* Theme/Color dropdown */}
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>COLOR COLOR</label>
                                            <select
                                                className="glass-input"
                                                value={habit.color}
                                                onChange={(e) => handleHabitFieldChange(habit.id, 'color', e.target.value)}
                                                style={{ height: '36px', fontSize: '13px', padding: '6px' }}
                                            >
                                                <option value="primary">Teal (Primary)</option>
                                                <option value="secondary">Indigo (Secondary)</option>
                                                <option value="tertiary">Orange (Tertiary)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add new habit section */}
                    <div className="glass-panel" style={{ padding: '20px', background: '#f8fafc', borderStyle: 'dashed' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} /> Add New Custom Habit
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'end', marginBottom: '14px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Habit Name</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. Yoga Practice"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    style={{ height: '38px', background: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. 20 mins stretching"
                                    value={newHabitDesc}
                                    onChange={(e) => setNewHabitDesc(e.target.value)}
                                    style={{ height: '38px', background: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Material Icon Name</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    placeholder="e.g. spa, fitness_center"
                                    value={newHabitIcon}
                                    onChange={(e) => setNewHabitIcon(e.target.value)}
                                    style={{ height: '38px', background: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Color Accent</label>
                                <select
                                    className="glass-input"
                                    value={newHabitColor}
                                    onChange={(e) => setNewHabitColor(e.target.value)}
                                    style={{ height: '38px', background: '#fff', padding: '6px' }}
                                >
                                    <option value="primary">Teal (Primary)</option>
                                    <option value="secondary">Indigo (Secondary)</option>
                                    <option value="tertiary">Orange (Tertiary)</option>
                                </select>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAddHabit}
                            className="glass-button secondary"
                            style={{ height: '38px' }}
                        >
                            <Plus size={16} /> Add to Catalog
                        </button>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="glass-button" disabled={saving} style={{ padding: '12px 24px' }}>
                        {saving ? 'Saving...' : (
                            <>
                                <Save size={20} />
                                Save Content & Habits
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
