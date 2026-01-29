// Q-Less Solver - Direct Backtracking Approach
// 
// Key insight: In crosswords, overlapping letters share ONE grid cell.
// So we track REMAINING LETTERS as we place words, not exact cover.

import { isValidWord, VALID_WORDS } from './words';
import type { Letter } from './gameState';

const GRID_SIZE = 8;

export interface SolveResult {
  placements: { letterId: string; row: number; col: number }[];
  success: boolean;
  removedLetter?: string;
}

// ============ Word Generation ============

function generateCandidateWords(letterCounts: Map<string, number>): string[] {
  const candidates: string[] = [];
  
  for (const word of VALID_WORDS) {
    if (word.length < 3 || word.length > 12) continue;
    
    const wordCounts = new Map<string, number>();
    for (const c of word) {
      wordCounts.set(c, (wordCounts.get(c) || 0) + 1);
    }
    
    let canForm = true;
    for (const [char, count] of wordCounts) {
      if ((letterCounts.get(char) || 0) < count) {
        canForm = false;
        break;
      }
    }
    
    if (canForm) candidates.push(word);
  }
  
  // Sort by length descending
  candidates.sort((a, b) => b.length - a.length);
  return candidates;
}

// ============ Grid Validation ============

function validateGrid(grid: (string | null)[][]): boolean {
  // Horizontal
  for (let row = 0; row < GRID_SIZE; row++) {
    let word = '';
    for (let col = 0; col <= GRID_SIZE; col++) {
      const cell = col < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else {
        if (word.length === 2) return false;
        if (word.length >= 3 && !isValidWord(word)) return false;
        word = '';
      }
    }
  }
  
  // Vertical
  for (let col = 0; col < GRID_SIZE; col++) {
    let word = '';
    for (let row = 0; row <= GRID_SIZE; row++) {
      const cell = row < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else {
        if (word.length === 2) return false;
        if (word.length >= 3 && !isValidWord(word)) return false;
        word = '';
      }
    }
  }
  
  return true;
}

// ============ Word Placement ============

interface PlacementResult {
  grid: (string | null)[][];
  usedLetters: string[]; // New letters consumed (not counting overlaps)
}

function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  dir: 'h' | 'v',
  availableLetters: Map<string, number>
): PlacementResult | null {
  const newGrid = grid.map(r => [...r]);
  const usedLetters: string[] = [];
  const tempAvailable = new Map(availableLetters);
  
  // Bounds check
  if (dir === 'h') {
    if (startCol < 0 || startCol + word.length > GRID_SIZE) return null;
    if (startRow < 0 || startRow >= GRID_SIZE) return null;
    if (startCol > 0 && grid[startRow][startCol - 1]) return null;
    if (startCol + word.length < GRID_SIZE && grid[startRow][startCol + word.length]) return null;
  } else {
    if (startRow < 0 || startRow + word.length > GRID_SIZE) return null;
    if (startCol < 0 || startCol >= GRID_SIZE) return null;
    if (startRow > 0 && grid[startRow - 1][startCol]) return null;
    if (startRow + word.length < GRID_SIZE && grid[startRow + word.length][startCol]) return null;
  }
  
  let hasOverlap = false;
  
  for (let i = 0; i < word.length; i++) {
    const row = dir === 'h' ? startRow : startRow + i;
    const col = dir === 'h' ? startCol + i : startCol;
    const char = word[i];
    const existing = grid[row][col];
    
    if (existing) {
      if (existing !== char) return null; // Conflict
      hasOverlap = true;
      // Overlap: this letter is already on grid, don't consume from pool
    } else {
      // Need to consume letter from pool
      const count = tempAvailable.get(char) || 0;
      if (count === 0) return null; // Don't have this letter
      if (count === 1) {
        tempAvailable.delete(char);
      } else {
        tempAvailable.set(char, count - 1);
      }
      usedLetters.push(char);
      newGrid[row][col] = char;
    }
  }
  
  // Non-first word must overlap
  const gridHasLetters = grid.some(r => r.some(c => c !== null));
  if (gridHasLetters && !hasOverlap) return null;
  
  // Validate grid
  if (!validateGrid(newGrid)) return null;
  
  return { grid: newGrid, usedLetters };
}

function findPlacementPositions(
  grid: (string | null)[][],
  word: string
): { row: number; col: number; dir: 'h' | 'v' }[] {
  const positions: { row: number; col: number; dir: 'h' | 'v' }[] = [];
  const seen = new Set<string>();
  
  const hasLetters = grid.some(r => r.some(c => c !== null));
  if (!hasLetters) {
    // Empty grid: center positions
    const hCol = Math.floor((GRID_SIZE - word.length) / 2);
    const vRow = Math.floor((GRID_SIZE - word.length) / 2);
    return [
      { row: 3, col: hCol, dir: 'h' },
      { row: vRow, col: 3, dir: 'v' }
    ];
  }
  
  // Find intersection points
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[row][col];
      if (!cell) continue;
      
      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          const hCol = col - i;
          const hKey = `h:${row}:${hCol}`;
          if (!seen.has(hKey)) {
            seen.add(hKey);
            positions.push({ row, col: hCol, dir: 'h' });
          }
          
          const vRow = row - i;
          const vKey = `v:${vRow}:${col}`;
          if (!seen.has(vKey)) {
            seen.add(vKey);
            positions.push({ row: vRow, col, dir: 'v' });
          }
        }
      }
    }
  }
  
  return positions;
}

// ============ Main Backtracking Solver ============

let attempts = 0;

function countRemaining(remaining: Map<string, number>): number {
  let total = 0;
  for (const count of remaining.values()) total += count;
  return total;
}

function solve(
  grid: (string | null)[][],
  remaining: Map<string, number>,
  candidates: string[],
  deadline: number
): (string | null)[][] | null {
  attempts++;
  
  if (Date.now() > deadline) return null;
  
  // Success: all letters placed
  if (countRemaining(remaining) === 0) {
    return grid;
  }
  
  // Filter candidates we can still form
  const viable = candidates.filter(word => {
    const counts = new Map<string, number>();
    for (const c of word) {
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    for (const [char, count] of counts) {
      if ((remaining.get(char) || 0) < count) return false;
    }
    return true;
  });
  
  // Prune if no viable words
  if (viable.length === 0 && countRemaining(remaining) > 0) {
    return null;
  }
  
  // Try placing each viable word
  for (const word of viable.slice(0, 100)) {
    const positions = findPlacementPositions(grid, word);
    
    // Shuffle for variety
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    for (const { row, col, dir } of positions.slice(0, 30)) {
      const result = tryPlaceWord(grid, word, row, col, dir, remaining);
      
      if (result && result.usedLetters.length > 0) {
        // Update remaining letters
        const newRemaining = new Map(remaining);
        for (const char of result.usedLetters) {
          const count = newRemaining.get(char) || 0;
          if (count <= 1) {
            newRemaining.delete(char);
          } else {
            newRemaining.set(char, count - 1);
          }
        }
        
        const solution = solve(result.grid, newRemaining, candidates, deadline);
        if (solution) return solution;
      }
    }
  }
  
  return null;
}

// ============ Entry Point ============

function solveWithLetters(
  letterCounts: Map<string, number>,
  targetCount: number,
  timeoutMs: number
): (string | null)[][] | null {
  const candidates = generateCandidateWords(letterCounts);
  console.log(`[Solver] ${candidates.length} candidate words`);
  
  if (candidates.length === 0) return null;
  
  const emptyGrid: (string | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  
  attempts = 0;
  const deadline = Date.now() + timeoutMs;
  
  const result = solve(emptyGrid, letterCounts, candidates, deadline);
  
  console.log(`[Solver] ${attempts} attempts`);
  return result;
}

function gridToPlacements(
  grid: (string | null)[][],
  letters: Letter[]
): { letterId: string; row: number; col: number }[] {
  const placements: { letterId: string; row: number; col: number }[] = [];
  const usedIds = new Set<string>();
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const char = grid[row][col];
      if (char) {
        const letter = letters.find(
          l => l.char.toLowerCase() === char.toLowerCase() && !usedIds.has(l.id)
        );
        if (letter) {
          usedIds.add(letter.id);
          placements.push({ letterId: letter.id, row, col });
        }
      }
    }
  }
  
  return placements;
}

function countGridCells(grid: (string | null)[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

export function solvePuzzle(letters: Letter[]): SolveResult {
  const letterChars = letters.map(l => l.char.toLowerCase());
  
  const letterCounts = new Map<string, number>();
  for (const c of letterChars) {
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }
  
  console.log(`[Solver] Letters: ${letterChars.join('').toUpperCase()}`);
  
  // Phase 1: All 12 letters
  console.log('[Solver] Phase 1: 12-letter solution...');
  const grid12 = solveWithLetters(letterCounts, 12, 8000);
  
  if (grid12) {
    const cells = countGridCells(grid12);
    console.log(`[Solver] Grid has ${cells} cells`);
    
    if (cells === 12) {
      const placements = gridToPlacements(grid12, letters);
      console.log(`[Solver] ✓ 12-letter solution! (${placements.length} placements)`);
      return { placements, success: true };
    }
  }
  
  // Phase 2: 11 letters
  console.log('[Solver] Phase 2: 11-letter solutions...');
  
  const uniqueLetters = [...new Set(letterChars)];
  
  for (const toRemove of uniqueLetters) {
    const reduced = new Map(letterCounts);
    const count = reduced.get(toRemove) || 0;
    if (count <= 1) {
      reduced.delete(toRemove);
    } else {
      reduced.set(toRemove, count - 1);
    }
    
    console.log(`[Solver] Trying without '${toRemove.toUpperCase()}'...`);
    
    const grid11 = solveWithLetters(reduced, 11, 3000);
    
    if (grid11) {
      const cells = countGridCells(grid11);
      if (cells === 11) {
        const placements = gridToPlacements(grid11, letters);
        console.log(`[Solver] ✓ 11-letter solution (removed ${toRemove.toUpperCase()})`);
        return { 
          placements, 
          success: true, 
          removedLetter: toRemove.toUpperCase() 
        };
      }
    }
  }
  
  console.log('[Solver] ✗ No solution found');
  return { placements: [], success: false };
}
