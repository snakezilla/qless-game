'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { GameStats } from '../lib/stats';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: GameStats;
}

export default function StatsModal({ isOpen, onClose, stats }: StatsModalProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-700 pointer-events-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Statistics</h2>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-white transition-colors text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-400">{stats.gamesPlayed}</p>
                  <p className="text-sm text-slate-400">Played</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{winRate}%</p>
                  <p className="text-sm text-slate-400">Win Rate</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-400">{stats.currentStreak}</p>
                  <p className="text-sm text-slate-400">Current Streak</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">{stats.bestStreak}</p>
                  <p className="text-sm text-slate-400">Best Streak</p>
                </div>
              </div>

              {/* Time Stats */}
              <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Best Time</span>
                  <span className="text-white font-mono">
                    {stats.bestTime !== null ? formatTime(stats.bestTime) : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-400">Average Time</span>
                  <span className="text-white font-mono">
                    {stats.averageTime !== null ? formatTime(Math.round(stats.averageTime)) : '--:--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Play Time</span>
                  <span className="text-white font-mono">
                    {formatPlayTime(stats.totalPlayTime)}
                  </span>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <p className="text-lg font-bold text-slate-300">{stats.perfectGames}</p>
                  <p className="text-slate-500">Perfect</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-300">{stats.hintsUsed}</p>
                  <p className="text-slate-500">Hints</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-300">{stats.solvesUsed}</p>
                  <p className="text-slate-500">Solves</p>
                </div>
              </div>

              {/* Milestones */}
              {stats.milestones.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Milestones</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.milestones.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 text-xs rounded-full border border-amber-500/30"
                      >
                        {id.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
