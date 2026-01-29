'use client';

import { motion } from 'framer-motion';
import { Letter, WordResult } from '../lib/gameState';
import LetterDie from './LetterDie';

interface GameGridProps {
  grid: (Letter | null)[][];
  words: WordResult[];
  onDrop: (row: number, col: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onLetterDragStart: (e: React.DragEvent, letter: Letter) => void;
  onLetterDragEnd: () => void;
  onLetterClick: (letter: Letter) => void;
  onCellClick: (row: number, col: number) => void;
  draggingLetter: Letter | null;
  selectedLetterId: string | null;
}

export default function GameGrid({
  grid,
  words,
  onDrop,
  onDragOver,
  onLetterDragStart,
  onLetterDragEnd,
  onLetterClick,
  onCellClick,
  draggingLetter,
  selectedLetterId,
}: GameGridProps) {
  // Create a map of cell positions to their word validity status
  const cellStatus = new Map<string, { isValid: boolean; isInvalid: boolean }>();
  
  for (const word of words) {
    for (const pos of word.positions) {
      const key = `${pos.row},${pos.col}`;
      const current = cellStatus.get(key) || { isValid: false, isInvalid: false };
      if (word.isValid) {
        current.isValid = true;
      } else {
        current.isInvalid = true;
      }
      cellStatus.set(key, current);
    }
  }

  return (
    <div className="relative p-2 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50">
      <div 
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${grid[0].length}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const key = `${rowIdx},${colIdx}`;
            const status = cellStatus.get(key);
            const isHighlighted = (draggingLetter || selectedLetterId) && !cell;
            const isSelectHighlighted = selectedLetterId && !cell;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (rowIdx * grid[0].length + colIdx) * 0.01 }}
                onDrop={(e) => {
                  e.preventDefault();
                  onDrop(rowIdx, colIdx);
                }}
                onDragOver={onDragOver}
                onClick={() => {
                  if (!cell && selectedLetterId) {
                    onCellClick(rowIdx, colIdx);
                  }
                }}
                className={`
                  relative aspect-square w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14
                  rounded-lg transition-all duration-200
                  ${cell 
                    ? 'bg-transparent' 
                    : 'bg-slate-700/30 border border-slate-600/30'
                  }
                  ${isHighlighted 
                    ? 'bg-slate-600/50 border-slate-500/50 shadow-inner cursor-pointer' 
                    : ''
                  }
                  ${isSelectHighlighted
                    ? 'hover:bg-purple-500/20 hover:border-purple-500/50'
                    : ''
                  }
                `}
              >
                {cell && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LetterDie
                      letter={cell}
                      isPlaced={true}
                      isDragging={draggingLetter?.id === cell.id}
                      onDragStart={onLetterDragStart}
                      onDragEnd={onLetterDragEnd}
                      onClick={() => onLetterClick(cell)}
                      isPartOfValidWord={status?.isValid}
                      isPartOfInvalidWord={status?.isInvalid}
                    />
                  </div>
                )}

                {/* Drop/Place indicator */}
                {isHighlighted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`absolute inset-2 rounded-lg border-2 border-dashed ${
                      isSelectHighlighted 
                        ? 'border-purple-400/50' 
                        : 'border-blue-400/50'
                    }`}
                  />
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
