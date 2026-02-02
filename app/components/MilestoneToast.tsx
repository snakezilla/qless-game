'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMilestoneInfo } from '../lib/stats';

interface MilestoneToastProps {
  milestoneId: string | null;
  onDismiss: () => void;
}

export default function MilestoneToast({ milestoneId, onDismiss }: MilestoneToastProps) {
  const milestone = milestoneId ? getMilestoneInfo(milestoneId) : null;

  useEffect(() => {
    if (milestoneId) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [milestoneId, onDismiss]);

  return (
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl px-6 py-4 shadow-2xl border border-amber-400/30">
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="text-3xl"
              >
                🏆
              </motion.span>
              <div>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white font-bold"
                >
                  {milestone.name}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-amber-100/80 text-sm"
                >
                  {milestone.description}
                </motion.p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
