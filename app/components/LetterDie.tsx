'use client';

import { motion } from 'framer-motion';
import { Letter } from '../lib/gameState';

interface LetterDieProps {
  letter: Letter;
  isPlaced: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, letter: Letter) => void;
  onDragEnd: () => void;
  onClick?: () => void;
  isPartOfInvalidWord?: boolean;
  isPartOfValidWord?: boolean;
}

export default function LetterDie({
  letter,
  isPlaced,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
  isPartOfInvalidWord,
  isPartOfValidWord,
}: LetterDieProps) {
  const getGlowStyle = () => {
    if (isPartOfValidWord && !isPartOfInvalidWord) {
      return '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3)';
    }
    if (isPartOfInvalidWord) {
      return '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)';
    }
    return 'none';
  };

  return (
    <motion.div
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, letter)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      initial={isPlaced ? { scale: 0.8, opacity: 0 } : { scale: 1 }}
      animate={{
        scale: isDragging ? 1.1 : 1,
        opacity: 1,
        rotateY: 0,
      }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 cursor-grab active:cursor-grabbing select-none
        ${isDragging ? 'z-50' : 'z-10'}
      `}
      style={{
        boxShadow: getGlowStyle(),
      }}
    >
      {/* 3D Die face */}
      <div
        className={`
          absolute inset-0 rounded-xl
          bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900
          border border-slate-600/50
          flex items-center justify-center
          transform-gpu
          ${isPlaced ? 'shadow-lg' : 'shadow-xl'}
        `}
        style={{
          transform: 'perspective(200px) rotateX(5deg)',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.1),
            inset 0 -2px 4px rgba(0,0,0,0.2),
            0 4px 8px rgba(0,0,0,0.3),
            0 8px 16px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Inner shadow for depth */}
        <div className="absolute inset-1 rounded-lg bg-gradient-to-br from-slate-600/20 to-transparent" />
        
        {/* Letter */}
        <span
          className="relative text-2xl sm:text-3xl font-bold text-white drop-shadow-lg"
          style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {letter.char}
        </span>

        {/* Shine effect */}
        <div 
          className="absolute inset-0 rounded-xl opacity-20 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />
      </div>
    </motion.div>
  );
}
