// Q-Less Game Statistics

const STATS_KEY = 'qless-stats';
const SESSION_KEY = 'qless-session';

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  bestTime: number | null;
  averageTime: number | null;
  totalLettersPlaced: number;
  hintsUsed: number;
  solvesUsed: number;
  currentStreak: number;
  bestStreak: number;
  perfectGames: number; // Won without hints
  milestones: string[];
  totalPlayTime: number;
}

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  bestTime: null,
  averageTime: null,
  totalLettersPlaced: 0,
  hintsUsed: 0,
  solvesUsed: 0,
  currentStreak: 0,
  bestStreak: 0,
  perfectGames: 0,
  milestones: [],
  totalPlayTime: 0,
};

const MILESTONES = {
  first_win: { name: 'First Victory', description: 'Win your first game' },
  speed_demon: { name: 'Speed Demon', description: 'Win in under 60 seconds' },
  perfectionist: { name: 'Perfectionist', description: 'Win without using hints' },
  streak_3: { name: 'Hat Trick', description: 'Win 3 games in a row' },
  streak_5: { name: 'On Fire', description: 'Win 5 games in a row' },
  veteran: { name: 'Veteran', description: 'Win 10 games' },
  master: { name: 'Master', description: 'Win 50 games' },
  dedicated: { name: 'Dedicated', description: 'Play for 1 hour total' },
};

export function loadStats(): GameStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;

  try {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      return { ...DEFAULT_STATS, ...JSON.parse(saved) };
    }
  } catch {
    // Ignore errors
  }
  return DEFAULT_STATS;
}

function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore errors
  }
}

export function trackGameStarted(): { stats: GameStats } {
  const stats = loadStats();
  const updated: GameStats = {
    ...stats,
    gamesPlayed: stats.gamesPlayed + 1,
  };
  saveStats(updated);
  return { stats: updated };
}

export function trackGameWon(time: number, usedHints: boolean): { stats: GameStats; newMilestones: string[] } {
  const stats = loadStats();
  const newMilestones: string[] = [];

  const newStreak = stats.currentStreak + 1;
  const newWins = stats.gamesWon + 1;

  // Calculate new average time
  const totalTime = (stats.averageTime || 0) * stats.gamesWon + time;
  const newAverage = totalTime / newWins;

  const updated: GameStats = {
    ...stats,
    gamesWon: newWins,
    bestTime: stats.bestTime === null ? time : Math.min(stats.bestTime, time),
    averageTime: newAverage,
    currentStreak: newStreak,
    bestStreak: Math.max(stats.bestStreak, newStreak),
    perfectGames: usedHints ? stats.perfectGames : stats.perfectGames + 1,
  };

  // Check milestones
  if (newWins === 1 && !stats.milestones.includes('first_win')) {
    updated.milestones = [...updated.milestones, 'first_win'];
    newMilestones.push('first_win');
  }

  if (time < 60 && !stats.milestones.includes('speed_demon')) {
    updated.milestones = [...updated.milestones, 'speed_demon'];
    newMilestones.push('speed_demon');
  }

  if (!usedHints && !stats.milestones.includes('perfectionist')) {
    updated.milestones = [...updated.milestones, 'perfectionist'];
    newMilestones.push('perfectionist');
  }

  if (newStreak >= 3 && !stats.milestones.includes('streak_3')) {
    updated.milestones = [...updated.milestones, 'streak_3'];
    newMilestones.push('streak_3');
  }

  if (newStreak >= 5 && !stats.milestones.includes('streak_5')) {
    updated.milestones = [...updated.milestones, 'streak_5'];
    newMilestones.push('streak_5');
  }

  if (newWins >= 10 && !stats.milestones.includes('veteran')) {
    updated.milestones = [...updated.milestones, 'veteran'];
    newMilestones.push('veteran');
  }

  if (newWins >= 50 && !stats.milestones.includes('master')) {
    updated.milestones = [...updated.milestones, 'master'];
    newMilestones.push('master');
  }

  saveStats(updated);
  return { stats: updated, newMilestones };
}

export function trackLetterPlaced(): GameStats {
  const stats = loadStats();
  const updated: GameStats = {
    ...stats,
    totalLettersPlaced: stats.totalLettersPlaced + 1,
  };
  saveStats(updated);
  return updated;
}

export function trackHintUsed(): GameStats {
  const stats = loadStats();
  const updated: GameStats = {
    ...stats,
    hintsUsed: stats.hintsUsed + 1,
  };
  saveStats(updated);
  return updated;
}

export function trackSolveUsed(): GameStats {
  const stats = loadStats();
  const updated: GameStats = {
    ...stats,
    solvesUsed: stats.solvesUsed + 1,
    currentStreak: 0, // Reset streak when using solve
  };
  saveStats(updated);
  return updated;
}

let sessionStart: number | null = null;

export function startSessionTimer(): void {
  sessionStart = Date.now();
}

export function endSession(): void {
  if (!sessionStart) return;

  const stats = loadStats();
  const sessionTime = Math.floor((Date.now() - sessionStart) / 1000);

  const updated: GameStats = {
    ...stats,
    totalPlayTime: stats.totalPlayTime + sessionTime,
  };

  // Check dedicated milestone (1 hour = 3600 seconds)
  if (updated.totalPlayTime >= 3600 && !stats.milestones.includes('dedicated')) {
    updated.milestones = [...updated.milestones, 'dedicated'];
  }

  saveStats(updated);
  sessionStart = null;
}

export function getMilestoneInfo(id: string): { name: string; description: string } | null {
  return MILESTONES[id as keyof typeof MILESTONES] || null;
}
