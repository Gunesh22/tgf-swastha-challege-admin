import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface Habit {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    hindiName?: string;
    hindiDescription?: string;
}

export interface Challenge {
    id: string;
    title: string;
    name?: string;
    description: string;
    durationDays: number;
    habitCount: number;
    startType: 'rolling' | 'cohort';
    startDate?: string | null;
    isActive: boolean;
    habits?: Habit[];
    createdAt?: any;
}

interface DataContextType {
    users: any[];
    userChallenges: any[];
    challenges: Challenge[];
    lastUpdated: string | null;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    dailyReadCount: number;
    dailyReadLimit: number;
    refreshData: (force?: boolean) => Promise<boolean>;
    updateChallengeInCache: (challenge: Challenge) => void;
    deleteChallengeFromCache: (id: string) => void;
    setDailyReadLimit: (limit: number) => void;
    resetDailyReadCount: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [userChallenges, setUserChallenges] = useState<any[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Read count limits
    const [dailyReadCount, setDailyReadCount] = useState<number>(0);
    const [dailyReadLimit, setLocalDailyReadLimit] = useState<number>(5000);

    // Initialize state from localStorage
    useEffect(() => {
        try {
            // Load limit
            const storedLimit = localStorage.getItem('tgf_read_limit');
            if (storedLimit) {
                setLocalDailyReadLimit(Number(storedLimit));
            }

            // Load daily read count and reset if day has changed
            const todayStr = getTodayDateString();
            const storedDate = localStorage.getItem('tgf_read_count_date');
            const storedCount = localStorage.getItem('tgf_read_count');
            
            if (storedDate === todayStr && storedCount) {
                setDailyReadCount(Number(storedCount));
            } else {
                localStorage.setItem('tgf_read_count_date', todayStr);
                localStorage.setItem('tgf_read_count', '0');
                setDailyReadCount(0);
            }

            // Load main data
            const cachedUsers = localStorage.getItem('tgf_users');
            const cachedUserChallenges = localStorage.getItem('tgf_user_challenges');
            const cachedChallenges = localStorage.getItem('tgf_challenges');
            const cachedLastUpdated = localStorage.getItem('tgf_last_updated');

            if (cachedUsers && cachedUserChallenges && cachedChallenges) {
                setUsers(JSON.parse(cachedUsers));
                setUserChallenges(JSON.parse(cachedUserChallenges));
                setChallenges(JSON.parse(cachedChallenges));
                setLastUpdated(cachedLastUpdated);
                setLoading(false);
            } else {
                // If no cache, perform first load
                performFetch(true);
            }
        } catch (err) {
            console.error('Error loading cached data', err);
            performFetch(true);
        }
    }, []);

    // Perform actual Firestore fetches
    const performFetch = async (isFirstLoad: boolean = false) => {
        if (isFirstLoad) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
        setError(null);

        try {
            // Fetch challenges
            const cSnap = await getDocs(collection(db, 'challenges'));
            const fetchedChallenges: Challenge[] = [];
            cSnap.forEach(doc => {
                fetchedChallenges.push({ id: doc.id, ...doc.data() } as Challenge);
            });

            // Fetch users
            const uSnap = await getDocs(collection(db, 'users'));
            const fetchedUsers: any[] = [];
            uSnap.forEach(doc => {
                fetchedUsers.push({ id: doc.id, ...doc.data() });
            });

            // Fetch user_challenges
            const ucSnap = await getDocs(collection(db, 'user_challenges'));
            const fetchedUserChallenges: any[] = [];
            ucSnap.forEach(doc => {
                fetchedUserChallenges.push({ id: doc.id, ...doc.data() });
            });

            // Calculate total document reads from this operation
            const newReads = fetchedChallenges.length + fetchedUsers.length + fetchedUserChallenges.length;

            // Update daily count
            const todayStr = getTodayDateString();
            const storedDate = localStorage.getItem('tgf_read_count_date');
            let currentDayCount = 0;

            if (storedDate === todayStr) {
                const storedCount = localStorage.getItem('tgf_read_count');
                currentDayCount = storedCount ? Number(storedCount) : 0;
            } else {
                localStorage.setItem('tgf_read_count_date', todayStr);
            }

            const updatedCount = currentDayCount + newReads;
            localStorage.setItem('tgf_read_count', String(updatedCount));
            setDailyReadCount(updatedCount);

            // Update data state
            const nowISO = new Date().toISOString();
            setUsers(fetchedUsers);
            setUserChallenges(fetchedUserChallenges);
            setChallenges(fetchedChallenges);
            setLastUpdated(nowISO);

            // Update localStorage
            localStorage.setItem('tgf_users', JSON.stringify(fetchedUsers));
            localStorage.setItem('tgf_user_challenges', JSON.stringify(fetchedUserChallenges));
            localStorage.setItem('tgf_challenges', JSON.stringify(fetchedChallenges));
            localStorage.setItem('tgf_last_updated', nowISO);

            return true;
        } catch (err: any) {
            console.error('Error fetching fresh data from Firestore', err);
            setError(err?.message || 'Failed to sync with Firestore');
            return false;
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Public refresh data trigger with limit check
    const refreshData = useCallback(async (force: boolean = false): Promise<boolean> => {
        if (!force && dailyReadCount >= dailyReadLimit) {
            setError(`Daily read limit reached (${dailyReadCount}/${dailyReadLimit}).`);
            return false;
        }
        return performFetch(false);
    }, [dailyReadCount, dailyReadLimit]);

    // Local challenge cache modifiers to avoid calling full refresh on single edits
    const updateChallengeInCache = useCallback((updatedChallenge: Challenge) => {
        setChallenges(prev => {
            const index = prev.findIndex(c => c.id === updatedChallenge.id);
            let nextChallenges = [...prev];
            if (index !== -1) {
                nextChallenges[index] = updatedChallenge;
            } else {
                nextChallenges.unshift(updatedChallenge);
            }
            localStorage.setItem('tgf_challenges', JSON.stringify(nextChallenges));
            return nextChallenges;
        });
    }, []);

    const deleteChallengeFromCache = useCallback((id: string) => {
        setChallenges(prev => {
            const nextChallenges = prev.filter(c => c.id !== id);
            localStorage.setItem('tgf_challenges', JSON.stringify(nextChallenges));
            return nextChallenges;
        });
    }, []);

    const setDailyReadLimit = useCallback((limit: number) => {
        setLocalDailyReadLimit(limit);
        localStorage.setItem('tgf_read_limit', String(limit));
    }, []);

    const resetDailyReadCount = useCallback(() => {
        setDailyReadCount(0);
        localStorage.setItem('tgf_read_count', '0');
        localStorage.setItem('tgf_read_count_date', getTodayDateString());
    }, []);

    return (
        <DataContext.Provider value={{
            users,
            userChallenges,
            challenges,
            lastUpdated,
            loading,
            refreshing,
            error,
            dailyReadCount,
            dailyReadLimit,
            refreshData,
            updateChallengeInCache,
            deleteChallengeFromCache,
            setDailyReadLimit,
            resetDailyReadCount
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
