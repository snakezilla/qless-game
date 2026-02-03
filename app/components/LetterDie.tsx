'use client';

import { motion } from 'framer-motion';
import { Letter } from '../lib/gameState';

interface LetterDieProps {
  letter: Letter;
  isPlaced: boolean;
  isDragging: boolean;
  isSelected?: boolean;
  isMoving?: boolean;
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
  isSelected,
  isMoving,
  onDragStart,
  onDragEnd,
  onClick,
  isPartOfInvalidWord,
  isPartOfValidWord,
}: LetterDieProps) {
  const getGlowStyle = () => {
    if (isMoving) {
      return '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.5), 0 0 60px rgba(245, 158, 11, 0.3)';
    }
    if (isSelected) {
      return '0 0 20px rgba(147, 51, 234, 0.7), 0 0 40px rgba(147, 51, 234, 0.4), 0 0 60px rgba(59, 130, 246, 0.3)';
    }
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
        scale: isDragging ? 1.1 : isMoving ? 1.12 : isSelected ? 1.08 : 1,
        opacity: 1,
        rotateY: 0,
        y: isMoving ? -6 : isSelected ? -4 : 0,
      }}
      whileHover={{ scale: isMoving ? 1.12 : isSelected ? 1.08 : 1.05, y: isMoving ? -6 : isSelected ? -4 : -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`
        relative w-12 h-12 sm:w-14 sm:h-14 cursor-grab active:cursor-grabbing select-none
        ${isDragging ? 'z-50' : isMoving ? 'z-50' : isSelected ? 'z-40' : 'z-10'}
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

        {/* Selected pulse ring */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{
              opacity: [0.6, 0.3, 0.6],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              border: '2px solid rgba(147, 51, 234, 0.8)',
              boxShadow: '0 0 15px rgba(147, 51, 234, 0.5)',
            }}
          />
        )}

        {/* Moving pulse ring (amber) */}
        {isMoving && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{
              opacity: [0.7, 0.4, 0.7],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              border: '2px solid rgba(251, 191, 36, 0.9)',
              boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)',
            }}
          />
        )}
      </div>
    </motion.div>
  );
}
