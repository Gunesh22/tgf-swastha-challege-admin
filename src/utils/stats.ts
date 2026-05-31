export interface UserStats {
    userId: string;
    name: string;
    phone: string;
    email: string;
    totalDays: number;
    currentStreak: number;
    bestStreak: number;
    consistencyRate: number;
    lastPracticeDate: string | null;
    practicedToday: boolean;
}

export interface ChallengeInfo {
    id: string;
    title?: string;
    name?: string;
    durationDays: number;
}

/**
 * Compute global user stats. 
 * `challenges` param is used to properly calculate consistency rate
 * as: (total unique days practiced) / (sum of durationDays across all enrolled challenges).
 */
export function computeGlobalUserStats(
    users: any[], 
    userChallenges: any[], 
    challenges: ChallengeInfo[] = []
): UserStats[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Build a lookup for challenge durations
    const challengeDurationMap: Record<string, number> = {};
    challenges.forEach(c => { challengeDurationMap[c.id] = c.durationDays; });

    const userStatsMap: Record<string, UserStats> = {};

    users.forEach(u => {
        userStatsMap[u.id] = {
            userId: u.id,
            name: u.name || 'Unknown',
            phone: u.phone || 'N/A',
            email: u.email || 'N/A',
            totalDays: 0,
            currentStreak: 0,
            bestStreak: 0,
            consistencyRate: 0,
            lastPracticeDate: null,
            practicedToday: false,
        };
    });

    // Ensure users from user_challenges who aren't in users collection also appear
    userChallenges.forEach(uc => {
        const uid = uc.userId;
        if (!userStatsMap[uid]) {
            userStatsMap[uid] = {
                userId: uid,
                name: 'Unknown',
                phone: 'N/A',
                email: 'N/A',
                totalDays: 0,
                currentStreak: 0,
                bestStreak: 0,
                consistencyRate: 0,
                lastPracticeDate: null,
                practicedToday: false,
            };
        }
    });

    // Group unique practice dates by user (across all challenges)
    const userDates: Record<string, Set<string>> = {};
    // Track per-challenge completion rates for each user
    const userChallengeRates: Record<string, number[]> = {};

    userChallenges.forEach(uc => {
        const uid = uc.userId;
        if (!userDates[uid]) userDates[uid] = new Set();
        if (!userChallengeRates[uid]) userChallengeRates[uid] = [];

        const dates = Object.keys(uc.completedDays || {});
        dates.forEach(d => userDates[uid].add(d.split('T')[0]));

        // Per-challenge consistency: days completed in THIS challenge / challenge duration
        const challengeDuration = challengeDurationMap[uc.challengeId] || 1;
        const completedInChallenge = Math.min(dates.length, challengeDuration);
        const rate = Math.round((completedInChallenge / challengeDuration) * 100);
        userChallengeRates[uid].push(rate);
    });

    Object.keys(userStatsMap).forEach(uid => {
        const stats = userStatsMap[uid];
        const datesSet = userDates[uid] || new Set();
        const sortedDates = Array.from(datesSet).sort();

        stats.totalDays = sortedDates.length;
        
        if (sortedDates.length > 0) {
            stats.lastPracticeDate = sortedDates[sortedDates.length - 1];
            stats.practicedToday = sortedDates.includes(todayStr);

            // Calculate streaks
            let currentS = 0;
            let bestS = 0;
            let tempS = 1;

            if (sortedDates.length === 1) {
                bestS = 1;
                const d = sortedDates[0];
                if (d === todayStr || d === yesterdayStr) {
                    currentS = 1;
                }
            } else {
                for (let i = 1; i < sortedDates.length; i++) {
                    const prevD = new Date(sortedDates[i - 1]);
                    const currD = new Date(sortedDates[i]);
                    const diffTime = Math.abs(currD.getTime() - prevD.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        tempS++;
                    } else if (diffDays > 1) {
                        tempS = 1;
                    }
                    if (tempS > bestS) bestS = tempS;
                }
                
                const lastD = sortedDates[sortedDates.length - 1];
                if (lastD === todayStr || lastD === yesterdayStr) {
                    let act = 1;
                    for (let i = sortedDates.length - 1; i > 0; i--) {
                        const d1 = new Date(sortedDates[i]);
                        const d2 = new Date(sortedDates[i - 1]);
                        const diff = Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 3600 * 24));
                        if (diff === 1) {
                            act++;
                        } else {
                            break;
                        }
                    }
                    currentS = act;
                }
            }
            stats.currentStreak = currentS;
            stats.bestStreak = bestS;

            // Consistency rate: average of per-challenge completion rates
            const rates = userChallengeRates[uid] || [];
            if (rates.length > 0) {
                stats.consistencyRate = Math.min(100, Math.round(rates.reduce((a, b) => a + b, 0) / rates.length));
            }
        }
    });

    return Object.values(userStatsMap);
}
