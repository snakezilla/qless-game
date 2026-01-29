// Q-Less Puzzle Solver - Optimized Constraint Satisfaction with Backtracking
// This solver separates word SELECTION (exact cover) from PLACEMENT (crossword)

import { isValidWord, getWordsFromLetters } from './words';
import type { Letter } from './gameState';

const GRID_SIZE = 8;
const SOLVE_TIMEOUT_12 = 8000; // 8 seconds for 12-letter solve
const SOLVE_TIMEOUT_11 = 4000; // 4 seconds per 11-letter attempt

interface PlacedWord {
  word: string;
  row: number;
  col: number;
  direction: 'h' | 'v';
}

interface SolverState {
  grid: (string | null)[][];
  placedWords: PlacedWord[];
  remainingLetters: Map<string, number>;
}

export interface SolveResult {
  placements: { letterId: string; row: number; col: number }[];
  success: boolean;
  removedLetter?: string;
}

// ============ PHASE 1: Find candidate words ============

function findCandidateWords(letterCounts: Map<string, number>): string[] {
  const candidates = getWordsFromLetters(letterCounts);
  
  // Sort by length descending (longer words = more constraining = better for search)
  // Secondary sort by letter diversity (words using more unique letters first)
  candidates.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    const uniqueA = new Set(a).size;
    const uniqueB = new Set(b).size;
    return uniqueB - uniqueA;
  });
  
  return candidates;
}

// ============ PHASE 2: Exact Cover Search ============

function subtractWord(remaining: Map<string, number>, word: string): Map<string, number> {
  const newRemaining = new Map(remaining);
  for (const c of word) {
    const count = newRemaining.get(c) || 0;
    if (count <= 1) {
      newRemaining.delete(c);
    } else {
      newRemaining.set(c, count - 1);
    }
  }
  return newRemaining;
}

function canFormWord(word: string, available: Map<string, number>): boolean {
  const needed = new Map<string, number>();
  for (const c of word) {
    needed.set(c, (needed.get(c) || 0) + 1);
  }
  for (const [char, count] of needed) {
    if ((available.get(char) || 0) < count) return false;
  }
  return true;
}

function totalLetters(counts: Map<string, number>): number {
  let total = 0;
  for (const c of counts.values()) total += c;
  return total;
}

// Find any word that can be formed from remaining letters
function canFormAnyWord(remaining: Map<string, number>, candidates: string[]): boolean {
  if (remaining.size === 0) return true;
  for (const word of candidates) {
    if (canFormWord(word, remaining)) return true;
  }
  return false;
}

// Try to find exact cover (set of words using all letters exactly once)
function findExactCover(
  remaining: Map<string, number>,
  candidates: string[],
  currentWords: string[],
  deadline: number
): string[] | null {
  if (Date.now() > deadline) return null;
  
  // Success: used all letters
  if (remaining.size === 0) {
    return currentWords;
  }
  
  // Pruning: if no word can be formed, backtrack
  const validCandidates = candidates.filter(w => canFormWord(w, remaining));
  if (validCandidates.length === 0) return null;
  
  // Try each candidate word
  for (const word of validCandidates.slice(0, 200)) { // Limit branching
    const newRemaining = subtractWord(remaining, word);
    
    // Pruning: check if remaining can form at least one more word (unless empty)
    if (newRemaining.size > 0 && !canFormAnyWord(newRemaining, validCandidates)) {
      continue;
    }
    
    const result = findExactCover(
      newRemaining,
      validCandidates,
      [...currentWords, word],
      deadline
    );
    
    if (result) return result;
  }
  
  return null;
}

// ============ PHASE 3: Crossword Placement ============

function validateAllGridWords(grid: (string | null)[][]): boolean {
  // Check horizontal
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
  
  // Check vertical
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

function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'h' | 'v'
): (string | null)[][] | null {
  const newGrid = grid.map(r => [...r]);
  
  // Check bounds
  if (direction === 'h') {
    if (startCol < 0 || startCol + word.length > GRID_SIZE) return null;
    if (startRow < 0 || startRow >= GRID_SIZE) return null;
  } else {
    if (startRow < 0 || startRow + word.length > GRID_SIZE) return null;
    if (startCol < 0 || startCol >= GRID_SIZE) return null;
  }
  
  // Check for letters before/after the word (would create invalid extension)
  if (direction === 'h') {
    if (startCol > 0 && grid[startRow][startCol - 1]) return null;
    if (startCol + word.length < GRID_SIZE && grid[startRow][startCol + word.length]) return null;
  } else {
    if (startRow > 0 && grid[startRow - 1][startCol]) return null;
    if (startRow + word.length < GRID_SIZE && grid[startRow + word.length][startCol]) return null;
  }
  
  let hasIntersection = false;
  
  // Place each letter
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    const existing = grid[row][col];
    
    if (existing) {
      if (existing !== word[i]) return null;
      hasIntersection = true;
    } else {
      newGrid[row][col] = word[i];
    }
  }
  
  // For non-first word, must have at least one intersection
  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));
  if (gridHasLetters && !hasIntersection) return null;
  
  // Validate all words on grid
  if (!validateAllGridWords(newGrid)) return null;
  
  return newGrid;
}

function findPlacementPositions(
  grid: (string | null)[][],
  word: string
): { row: number; col: number; direction: 'h' | 'v' }[] {
  const positions: { row: number; col: number; direction: 'h' | 'v' }[] = [];
  const seen = new Set<string>();
  
  // If grid is empty, place at center
  const hasLetters = grid.some(row => row.some(cell => cell !== null));
  if (!hasLetters) {
    const startCol = Math.floor((GRID_SIZE - word.length) / 2);
    const startRow = Math.floor(GRID_SIZE / 2);
    return [{ row: startRow, col: startCol, direction: 'h' }];
  }
  
  // Find cells with letters and try to intersect
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[row][col];
      if (!cell) continue;
      
      // Find this letter in the word
      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          // Horizontal placement
          const hStart = col - i;
          const hKey = `h:${row}:${hStart}`;
          if (!seen.has(hKey)) {
            seen.add(hKey);
            positions.push({ row, col: hStart, direction: 'h' });
          }
          
          // Vertical placement
          const vStart = row - i;
          const vKey = `v:${vStart}:${col}`;
          if (!seen.has(vKey)) {
            seen.add(vKey);
            positions.push({ row: vStart, col, direction: 'v' });
          }
        }
      }
    }
  }
  
  return positions;
}

function placeWords(
  words: string[],
  deadline: number
): (string | null)[][] | null {
  if (words.length === 0) return null;
  if (Date.now() > deadline) return null;
  
  // Sort words by length (longer first for more constraints)
  const sortedWords = [...words].sort((a, b) => b.length - a.length);
  
  function backtrack(
    wordIdx: number,
    grid: (string | null)[][]
  ): (string | null)[][] | null {
    if (Date.now() > deadline) return null;
    if (wordIdx >= sortedWords.length) return grid;
    
    const word = sortedWords[wordIdx];
    const positions = findPlacementPositions(grid, word);
    
    for (const { row, col, direction } of positions) {
      const newGrid = tryPlaceWord(grid, word, row, col, direction);
      if (newGrid) {
        const result = backtrack(wordIdx + 1, newGrid);
        if (result) return result;
      }
    }
    
    return null;
  }
  
  const emptyGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  return backtrack(0, emptyGrid);
}

// ============ PHASE 4: Combined Solver ============

function solveWithLetters(
  letterCounts: Map<string, number>,
  targetCount: number,
  timeoutMs: number
): (string | null)[][] | null {
  const deadline = Date.now() + timeoutMs;
  
  // Phase 1: Find candidate words
  const candidates = findCandidateWords(letterCounts);
  console.log(`[Solver] Found ${candidates.length} candidate words`);
  
  if (candidates.length === 0) return null;
  
  // Phase 2: Find exact cover (which words to use)
  const coverDeadline = Date.now() + Math.floor(timeoutMs * 0.6);
  const wordSet = findExactCover(letterCounts, candidates, [], coverDeadline);
  
  if (!wordSet) {
    console.log('[Solver] No exact cover found');
    return null;
  }
  
  console.log(`[Solver] Found word set: ${wordSet.join(', ')}`);
  
  // Phase 3: Place words on grid
  const placementDeadline = Date.now() + Math.floor(timeoutMs * 0.4);
  const grid = placeWords(wordSet, placementDeadline);
  
  if (!grid) {
    console.log('[Solver] Could not place words on grid');
    // Try with a different word set by recursing
    return null;
  }
  
  return grid;
}

function gridToPlacements(
  grid: (string | null)[][],
  letters: Letter[]
): { letterId: string; row: number; col: number }[] {
  const placements: { letterId: string; row: number; col: number }[] = [];
  const usedLetterIds = new Set<string>();
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const char = grid[row][col];
      if (char) {
        const letter = letters.find(
          l => l.char.toLowerCase() === char && !usedLetterIds.has(l.id)
        );
        if (letter) {
          usedLetterIds.add(letter.id);
          placements.push({ letterId: letter.id, row, col });
        }
      }
    }
  }
  
  return placements;
}

// ============ Main Entry Point ============

export function solvePuzzle(letters: Letter[]): SolveResult {
  const letterChars = letters.map(l => l.char.toLowerCase());
  
  // Build letter counts
  const letterCounts = new Map<string, number>();
  for (const c of letterChars) {
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }
  
  console.log(`[Solver] Solving with letters: ${letterChars.join('').toUpperCase()}`);
  
  // Phase 1: Try with all 12 letters
  console.log('[Solver] Phase 1: Trying all 12 letters...');
  const grid12 = solveWithLetters(letterCounts, 12, SOLVE_TIMEOUT_12);
  
  if (grid12) {
    console.log('[Solver] Found 12-letter solution!');
    const placements = gridToPlacements(grid12, letters);
    return {
      placements,
      success: placements.length === 12
    };
  }
  
  // Phase 2: Try with 11 letters (remove one at a time)
  console.log('[Solver] Phase 2: Trying 11-letter solutions...');
  
  const uniqueLetters = [...new Set(letterChars)];
  
  for (const letterToRemove of uniqueLetters) {
    // Create counts with one less of this letter
    const reducedCounts = new Map(letterCounts);
    const currentCount = reducedCounts.get(letterToRemove) || 0;
    if (currentCount <= 1) {
      reducedCounts.delete(letterToRemove);
    } else {
      reducedCounts.set(letterToRemove, currentCount - 1);
    }
    
    console.log(`[Solver] Trying without one '${letterToRemove.toUpperCase()}'...`);
    
    const grid11 = solveWithLetters(reducedCounts, 11, SOLVE_TIMEOUT_11);
    
    if (grid11) {
      console.log(`[Solver] Found solution by removing '${letterToRemove.toUpperCase()}'!`);
      
      // Find which letter instance to exclude
      const lettersToUse = [...letters];
      const removeIdx = lettersToUse.findIndex(l => l.char.toLowerCase() === letterToRemove);
      if (removeIdx !== -1) {
        lettersToUse.splice(removeIdx, 1);
      }
      
      const placements = gridToPlacements(grid11, letters);
      return {
        placements,
        success: placements.length === 11,
        removedLetter: letterToRemove.toUpperCase()
      };
    }
  }
  
  console.log('[Solver] No solution found');
  return { placements: [], success: false };
}
