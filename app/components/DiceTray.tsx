'use client';

import { motion } from 'framer-motion';
import { Letter } from '../lib/gameState';
import LetterDie from './LetterDie';

interface DiceTrayProps {
  letters: Letter[];
  onDragStart: (e: React.DragEvent, letter: Letter) => void;
  onDragEnd: () => void;
  draggingLetter: Letter | null;
}

export default function DiceTray({
  letters,
  onDragStart,
  onDragEnd,
  draggingLetter,
}: DiceTrayProps) {
  const unplacedLetters = letters.filter(l => l.position === null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full p-4 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50"
    >
      <div className="flex flex-wrap gap-3 justify-center min-h-[60px]">
        {unplacedLetters.length === 0 ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-500 text-sm italic py-2"
          >
            All letters placed! 🎉
          </motion.p>
        ) : (
          unplacedLetters.map((letter, idx) => (
            <motion.div
              key={letter.id}
              initial={{ opacity: 0, scale: 0, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{
                delay: idx * 0.05,
                type: 'spring',
                stiffness: 300,
                damping: 20,
              }}
            >
              <LetterDie
                letter={letter}
                isPlaced={false}
                isDragging={draggingLetter?.id === letter.id}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
