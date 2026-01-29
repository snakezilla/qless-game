// Q-Less Solver V4 - Word-Combination First Approach
//
// Key insight: Instead of backtracking through grid placements, 
// first find word COMBINATIONS that use all letters, then place them.
//
// For 12 letters with words crossing:
// - 2 words sharing 1 letter: len(A) + len(B) = 13
// - 3 words sharing 2 letters: len(A) + len(B) + len(C) = 14
// etc.

import { isValidWord, getWordsFromLetters } from './words';
import type { Letter } from './gameState';

const GRID_SIZE = 8;

export interface SolveResult {
  placements: { letterId: string; row: number; col: number }[];
  success: boolean;
  removedLetter?: string;
  stats?: {
    attempts: number;
    timeMs: number;
    combosChecked: number;
  };
}

type Grid = (string | null)[][];

function createEmptyGrid(): Grid {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}

// Get letter counts from a word
function getWordLetterCounts(word: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of word) {
    counts.set(c, (counts.get(c) || 0) + 1);
  }
  return counts;
}

// Check if a word can be formed from available letters
function canFormWordFromCounts(word: string, available: Map<string, number>): boolean {
  const needed = getWordLetterCounts(word);
  for (const [char, count] of needed) {
    if ((available.get(char) || 0) < count) return false;
  }
  return true;
}

// Get remaining letters after using a word
function subtractWord(counts: Map<string, number>, word: string): Map<string, number> {
  const result = new Map(counts);
  for (const c of word) {
    const count = result.get(c) || 0;
    if (count <= 1) result.delete(c);
    else result.set(c, count - 1);
  }
  return result;
}

// Add a letter back
function addLetter(counts: Map<string, number>, char: string): Map<string, number> {
  const result = new Map(counts);
  result.set(char, (result.get(char) || 0) + 1);
  return result;
}

// Find where two words can cross (shared letters)
function findCrossings(word1: string, word2: string): { i1: number; i2: number; char: string }[] {
  const crossings: { i1: number; i2: number; char: string }[] = [];
  for (let i1 = 0; i1 < word1.length; i1++) {
    for (let i2 = 0; i2 < word2.length; i2++) {
      if (word1[i1] === word2[i2]) {
        crossings.push({ i1, i2, char: word1[i1] });
      }
    }
  }
  return crossings;
}

// Get word at position in direction
function getWordAt(grid: Grid, row: number, col: number, dir: 'h' | 'v'): string {
  let r = row, c = col;
  if (dir === 'h') {
    while (c > 0 && grid[r][c - 1]) c--;
  } else {
    while (r > 0 && grid[r - 1][c]) r--;
  }
  
  let word = '';
  while (r < GRID_SIZE && c < GRID_SIZE && grid[r][c]) {
    word += grid[r][c];
    if (dir === 'h') c++;
    else r++;
  }
  return word;
}

// Check if placing a word creates valid perpendicular words
function checkPerpendiculars(
  grid: Grid,
  word: string,
  row: number,
  col: number,
  dir: 'h' | 'v'
): boolean {
  const newGrid = cloneGrid(grid);
  
  // Place the word
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'v' ? row + i : row;
    const c = dir === 'h' ? col + i : col;
    if (r >= GRID_SIZE || c >= GRID_SIZE) return false;
    
    const existing = grid[r][c];
    if (existing && existing !== word[i]) return false;
    newGrid[r][c] = word[i];
  }
  
  // Check word doesn't extend existing word
  if (dir === 'h') {
    if (col > 0 && grid[row][col - 1]) return false;
    if (col + word.length < GRID_SIZE && grid[row][col + word.length]) return false;
  } else {
    if (row > 0 && grid[row - 1][col]) return false;
    if (row + word.length < GRID_SIZE && grid[row + word.length][col]) return false;
  }
  
  // Check all perpendicular words
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'v' ? row + i : row;
    const c = dir === 'h' ? col + i : col;
    
    // Skip if this was already placed (intersection)
    if (grid[r][c]) continue;
    
    const perpDir = dir === 'h' ? 'v' : 'h';
    const perpWord = getWordAt(newGrid, r, c, perpDir);
    
    if (perpWord.length === 2) return false;
    if (perpWord.length >= 3 && !isValidWord(perpWord)) return false;
  }
  
  return true;
}

// Place a word on the grid
function placeWord(grid: Grid, word: string, row: number, col: number, dir: 'h' | 'v'): Grid {
  const newGrid = cloneGrid(grid);
  for (let i = 0; i < word.length; i++) {
    const r = dir === 'v' ? row + i : row;
    const c = dir === 'h' ? col + i : col;
    newGrid[r][c] = word[i];
  }
  return newGrid;
}

// Try to place two crossing words
function tryPlaceTwoWords(
  word1: string,  // horizontal
  word2: string,  // vertical
  crossing: { i1: number; i2: number }
): Grid | null {
  // Place word1 horizontally and word2 vertically crossing at the intersection
  // word1 is placed first, then word2 crosses it
  
  // Position word1 horizontally, starting at some point
  // word2 crosses word1 at: word1[i1] = word2[i2]
  
  // Try different positions - center-ish placement
  for (let baseRow = 1; baseRow <= 4; baseRow++) {
    for (let baseCol = 1; baseCol <= Math.max(1, GRID_SIZE - word1.length - 1); baseCol++) {
      // word1 horizontal at (baseRow, baseCol)
      // crossing happens at word1[i1], so position is (baseRow, baseCol + i1)
      // word2 vertical with word2[i2] at that position
      // so word2 starts at row = baseRow - i2
      
      const crossCol = baseCol + crossing.i1;
      const word2StartRow = baseRow - crossing.i2;
      
      // Bounds check
      if (word2StartRow < 0 || word2StartRow + word2.length > GRID_SIZE) continue;
      if (crossCol >= GRID_SIZE || baseCol + word1.length > GRID_SIZE) continue;
      
      let grid = createEmptyGrid();
      
      // Place word1 horizontally
      if (!checkPerpendiculars(grid, word1, baseRow, baseCol, 'h')) continue;
      grid = placeWord(grid, word1, baseRow, baseCol, 'h');
      
      // Place word2 vertically
      if (!checkPerpendiculars(grid, word2, word2StartRow, crossCol, 'v')) continue;
      grid = placeWord(grid, word2, word2StartRow, crossCol, 'v');
      
      return grid;
    }
  }
  
  return null;
}

// Try to place three words in a connected crossword
function tryPlaceThreeWords(
  word1: string,  // horizontal base
  word2: string,  // vertical, crosses word1
  word3: string,  // can be h or v, crosses word1 or word2
  crossing1: { i1: number; i2: number },  // word1 x word2
  crossing2: { wordA: 'w1' | 'w2'; wordB: 'w3'; iA: number; iB: number }  // where word3 connects
): Grid | null {
  // Try different base positions
  for (let baseRow = 1; baseRow <= 3; baseRow++) {
    for (let baseCol = 1; baseCol <= Math.max(1, GRID_SIZE - word1.length - 1); baseCol++) {
      const crossCol = baseCol + crossing1.i1;
      const word2StartRow = baseRow - crossing1.i2;
      
      // Bounds check for first two words
      if (word2StartRow < 0 || word2StartRow + word2.length > GRID_SIZE) continue;
      if (crossCol >= GRID_SIZE || baseCol + word1.length > GRID_SIZE) continue;
      
      let grid = createEmptyGrid();
      
      // Place word1 horizontally
      if (!checkPerpendiculars(grid, word1, baseRow, baseCol, 'h')) continue;
      grid = placeWord(grid, word1, baseRow, baseCol, 'h');
      
      // Place word2 vertically
      if (!checkPerpendiculars(grid, word2, word2StartRow, crossCol, 'v')) continue;
      grid = placeWord(grid, word2, word2StartRow, crossCol, 'v');
      
      // Now place word3 - it crosses either word1 or word2
      if (crossing2.wordA === 'w1') {
        // word3 crosses word1, so word3 is vertical
        const w3CrossCol = baseCol + crossing2.iA;
        const w3StartRow = baseRow - crossing2.iB;
        
        if (w3StartRow < 0 || w3StartRow + word3.length > GRID_SIZE) continue;
        if (w3CrossCol < 0 || w3CrossCol >= GRID_SIZE) continue;
        
        if (!checkPerpendiculars(grid, word3, w3StartRow, w3CrossCol, 'v')) continue;
        grid = placeWord(grid, word3, w3StartRow, w3CrossCol, 'v');
      } else {
        // word3 crosses word2, so word3 is horizontal
        const w3CrossRow = word2StartRow + crossing2.iA;
        const w3StartCol = crossCol - crossing2.iB;
        
        if (w3StartCol < 0 || w3StartCol + word3.length > GRID_SIZE) continue;
        if (w3CrossRow < 0 || w3CrossRow >= GRID_SIZE) continue;
        
        if (!checkPerpendiculars(grid, word3, w3CrossRow, w3StartCol, 'h')) continue;
        grid = placeWord(grid, word3, w3CrossRow, w3StartCol, 'h');
      }
      
      return grid;
    }
  }
  
  return null;
}

// Shuffle array
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Count total letters in a map
function countLetters(counts: Map<string, number>): number {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

// Check if two letter count maps are equal
function countsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [char, count] of a) {
    if (b.get(char) !== count) return false;
  }
  return true;
}

// Main solver
function solve(letterCounts: Map<string, number>, targetCount: number, timeoutMs: number): {
  grid: Grid | null;
  attempts: number;
  combosChecked: number;
} {
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  let combosChecked = 0;
  
  // Get all formable words, sorted by length (longer first)
  const allWords = getWordsFromLetters(letterCounts)
    .filter(w => w.length >= 3 && w.length <= 8)
    .sort((a, b) => b.length - a.length);
  
  if (allWords.length === 0) {
    return { grid: null, attempts: 0, combosChecked: 0 };
  }
  
  console.log(`[SolverV4] ${allWords.length} formable words (3-8 letters)`);
  
  // Strategy 1: Try 2-word combinations
  // For 2 words crossing at 1 letter to use N letters: len(A) + len(B) = N + 1
  console.log(`[SolverV4] Trying 2-word combinations...`);
  
  const targetSum = targetCount + 1;  // e.g., 13 for 12 letters
  
  // Prioritize longer words
  const longWords = allWords.filter(w => w.length >= 5);
  const wordsToTry = shuffle([...longWords, ...allWords.slice(0, 100)]);
  
  for (const word1 of wordsToTry) {
    if (Date.now() > deadline) break;
    
    const neededLen = targetSum - word1.length;
    if (neededLen < 3 || neededLen > 8) continue;
    
    // After using word1, what letters remain?
    const afterWord1 = subtractWord(letterCounts, word1);
    
    // For the crossing letter, we need to "add it back" because it's shared
    // word2 must be formable from afterWord1 + crossing_letter
    
    for (const word2 of allWords) {
      if (word2.length !== neededLen) continue;
      if (Date.now() > deadline) break;
      combosChecked++;
      
      // Find possible crossings
      const crossings = findCrossings(word1, word2);
      if (crossings.length === 0) continue;
      
      for (const crossing of crossings) {
        // The crossing letter is shared - add it back to remaining
        const withShared = addLetter(afterWord1, crossing.char);
        
        // Can we form word2 from withShared?
        if (!canFormWordFromCounts(word2, withShared)) continue;
        
        // After using word2 (but the crossing letter was shared)
        const afterBoth = subtractWord(withShared, word2);
        
        // Should have 0 letters left if this uses all
        if (countLetters(afterBoth) !== 0) continue;
        
        // Try to place them!
        attempts++;
        const grid = tryPlaceTwoWords(word1, word2, crossing);
        if (grid) {
          return { grid, attempts, combosChecked };
        }
        
        // Try reversed (word2 horizontal, word1 vertical)
        attempts++;
        const gridRev = tryPlaceTwoWords(word2, word1, { i1: crossing.i2, i2: crossing.i1 });
        if (gridRev) {
          return { grid: gridRev, attempts, combosChecked };
        }
      }
    }
  }
  
  // Strategy 2: Try 3-word combinations
  // For 3 words with 2 crossings: len(A) + len(B) + len(C) = N + 2
  console.log(`[SolverV4] Trying 3-word combinations...`);
  
  const targetSum3 = targetCount + 2;  // e.g., 14 for 12 letters
  const mediumWords = allWords.filter(w => w.length >= 4 && w.length <= 6);
  const words3Try = shuffle([...mediumWords, ...allWords.slice(0, 80)]);
  
  for (const word1 of words3Try.slice(0, 50)) {
    if (Date.now() > deadline) break;
    
    const afterWord1 = subtractWord(letterCounts, word1);
    
    for (const word2 of words3Try.slice(0, 60)) {
      if (Date.now() > deadline) break;
      
      const crossings12 = findCrossings(word1, word2);
      if (crossings12.length === 0) continue;
      
      for (const cross12 of crossings12.slice(0, 3)) {
        const withShared1 = addLetter(afterWord1, cross12.char);
        if (!canFormWordFromCounts(word2, withShared1)) continue;
        
        const afterWord2 = subtractWord(withShared1, word2);
        const remaining = countLetters(afterWord2);
        
        if (remaining < 3 || remaining > 7) continue;
        
        // Find word3 that uses remaining letters and connects
        for (const word3 of allWords) {
          if (word3.length !== remaining + 1) continue;  // +1 for one more crossing
          if (Date.now() > deadline) break;
          combosChecked++;
          
          // word3 can cross word1 or word2
          const crossings13 = findCrossings(word1, word3);
          const crossings23 = findCrossings(word2, word3);
          
          // Try crossing word1
          for (const cross13 of crossings13.slice(0, 2)) {
            const withShared2 = addLetter(afterWord2, cross13.char);
            if (!canFormWordFromCounts(word3, withShared2)) continue;
            
            const afterWord3 = subtractWord(withShared2, word3);
            if (countLetters(afterWord3) !== 0) continue;
            
            attempts++;
            const grid = tryPlaceThreeWords(word1, word2, word3, cross12, 
              { wordA: 'w1', wordB: 'w3', iA: cross13.i1, iB: cross13.i2 });
            if (grid) {
              return { grid, attempts, combosChecked };
            }
          }
          
          // Try crossing word2
          for (const cross23 of crossings23.slice(0, 2)) {
            const withShared2 = addLetter(afterWord2, cross23.char);
            if (!canFormWordFromCounts(word3, withShared2)) continue;
            
            const afterWord3 = subtractWord(withShared2, word3);
            if (countLetters(afterWord3) !== 0) continue;
            
            attempts++;
            const grid = tryPlaceThreeWords(word1, word2, word3, cross12,
              { wordA: 'w2', wordB: 'w3', iA: cross23.i1, iB: cross23.i2 });
            if (grid) {
              return { grid, attempts, combosChecked };
            }
          }
        }
      }
    }
  }
  
  return { grid: null, attempts, combosChecked };
}

// Convert grid to placements
function gridToPlacements(
  grid: Grid,
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

function countCells(grid: Grid): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

// Main entry point
export function solvePuzzleV4(letters: Letter[], timeoutMs: number = 25000): SolveResult {
  const startTime = Date.now();
  const letterChars = letters.map(l => l.char.toLowerCase());
  
  const letterCounts = new Map<string, number>();
  for (const c of letterChars) {
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }
  
  console.log(`[SolverV4] Letters: ${letterChars.join('').toUpperCase()}`);
  
  // Phase 1: Try all 12 letters
  console.log('[SolverV4] Phase 1: 12-letter solution...');
  const result12 = solve(letterCounts, 12, Math.floor(timeoutMs * 0.7));
  
  if (result12.grid && countCells(result12.grid) === 12) {
    const placements = gridToPlacements(result12.grid, letters);
    console.log(`[SolverV4] ✓ 12-letter solution! (${result12.attempts} attempts, ${result12.combosChecked} combos)`);
    return {
      placements,
      success: true,
      stats: { attempts: result12.attempts, timeMs: Date.now() - startTime, combosChecked: result12.combosChecked }
    };
  }
  
  // Phase 2: Try 11 letters
  console.log('[SolverV4] Phase 2: 11-letter solutions...');
  
  const uniqueLetters = [...new Set(letterChars)];
  const remainingTime = Math.max(2000, timeoutMs - (Date.now() - startTime));
  const perLetterTimeout = Math.floor(remainingTime / Math.min(uniqueLetters.length, 6));
  
  let totalAttempts = result12.attempts;
  let totalCombos = result12.combosChecked;
  
  // Sort by difficulty (try removing harder letters first)
  const difficulties: Record<string, number> = {
    'j': 100, 'x': 95, 'z': 90, 'q': 100, 'k': 75,
    'v': 60, 'w': 50, 'y': 45, 'f': 40, 'b': 35
  };
  uniqueLetters.sort((a, b) => (difficulties[b] || 0) - (difficulties[a] || 0));
  
  for (const toRemove of uniqueLetters.slice(0, 6)) {
    if (Date.now() - startTime > timeoutMs - 500) break;
    
    const reduced = new Map(letterCounts);
    const count = reduced.get(toRemove) || 0;
    if (count <= 1) reduced.delete(toRemove);
    else reduced.set(toRemove, count - 1);
    
    console.log(`[SolverV4] Trying without '${toRemove.toUpperCase()}'...`);
    
    const result11 = solve(reduced, 11, perLetterTimeout);
    totalAttempts += result11.attempts;
    totalCombos += result11.combosChecked;
    
    if (result11.grid && countCells(result11.grid) === 11) {
      const remainingLetters = letters.filter(l => l.char.toLowerCase() !== toRemove);
      const placements = gridToPlacements(result11.grid, remainingLetters);
      
      console.log(`[SolverV4] ✓ 11-letter solution (removed ${toRemove.toUpperCase()})`);
      return {
        placements,
        success: true,
        removedLetter: toRemove.toUpperCase(),
        stats: { attempts: totalAttempts, timeMs: Date.now() - startTime, combosChecked: totalCombos }
      };
    }
  }
  
  console.log(`[SolverV4] ✗ No solution found (${totalAttempts} attempts, ${totalCombos} combos)`);
  return {
    placements: [],
    success: false,
    stats: { attempts: totalAttempts, timeMs: Date.now() - startTime, combosChecked: totalCombos }
  };
}
