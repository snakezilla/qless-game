'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { WordResult } from '../lib/gameState';

interface WinModalProps {
  isOpen: boolean;
  words: WordResult[];
  time: number;
  onNewGame: () => void;
}

export default function WinModal({ isOpen, words, time, onNewGame }: WinModalProps) {
  const triggerConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();

    // Big burst in the middle
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
      });
    }, 300);
  }, []);

  useEffect(() => {
    if (isOpen) {
      triggerConfetti();
    }
  }, [isOpen, triggerConfetti]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const validWords = words.filter(w => w.isValid);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative max-w-md w-full p-8 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-2xl"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl opacity-50 blur-xl bg-gradient-to-br from-green-500/20 via-blue-500/20 to-purple-500/20" />

            <div className="relative z-10 text-center">
              {/* Trophy emoji with animation */}
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: [0, -10, 10, -10, 0], scale: 1 }}
                transition={{ 
                  rotate: { repeat: Infinity, duration: 2, ease: 'easeInOut' },
                  scale: { type: 'spring', stiffness: 300 }
                }}
                className="text-7xl mb-4"
              >
                🏆
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white mb-2"
              >
                You Won!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-slate-400 mb-6"
              >
                All 12 letters used in {validWords.length} valid words
              </motion.p>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-6 p-4 rounded-xl bg-slate-700/50"
              >
                <div className="flex justify-around">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{formatTime(time)}</p>
                    <p className="text-xs text-slate-400">Time</p>
                  </div>
                  <div className="w-px bg-slate-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{validWords.length}</p>
                    <p className="text-xs text-slate-400">Words</p>
                  </div>
                </div>
              </motion.div>

              {/* Words list */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-6 flex flex-wrap justify-center gap-2"
              >
                {validWords.map((word, idx) => (
                  <motion.span
                    key={idx}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-medium border border-green-500/30"
                  >
                    {word.word}
                  </motion.span>
                ))}
              </motion.div>

              {/* New Game button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onNewGame}
                className="w-full py-4 px-8 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/25 transition-all"
              >
                Play Again
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
