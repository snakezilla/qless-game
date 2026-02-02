// Q-Less Puzzle Solver - Placement-First Approach
// Instead of finding words then placing, we build the crossword incrementally

import { isValidWord, getWordsFromLetters } from './words';
import type { Letter } from './gameState';

const GRID_SIZE = 8;
const SOLVE_TIMEOUT = 15000; // 15 seconds total

export interface SolveResult {
  placements: { letterId: string; row: number; col: number }[];
  success: boolean;
  removedLetter?: string;
}

// ============ Grid Utilities ============

function createEmptyGrid(): (string | null)[][] {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map(row => [...row]);
}

// ============ Word Validation ============

function validateAllGridWords(grid: (string | null)[][]): boolean {
  // Check horizontal runs
  // Single letters (length 1) are fine - they're part of a perpendicular word
  // Runs of 2 letters are INVALID (no 2-letter words allowed)
  // Runs of 3+ must be valid dictionary words
  for (let row = 0; row < GRID_SIZE; row++) {
    let word = '';
    for (let col = 0; col <= GRID_SIZE; col++) {
      const cell = col < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else {
        if (word.length === 2) return false; // 2-letter run not allowed
        if (word.length >= 3 && !isValidWord(word)) return false;
        word = '';
      }
    }
  }

  // Check vertical runs
  for (let col = 0; col < GRID_SIZE; col++) {
    let word = '';
    for (let row = 0; row <= GRID_SIZE; row++) {
      const cell = row < GRID_SIZE ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else {
        if (word.length === 2) return false; // 2-letter run not allowed
        if (word.length >= 3 && !isValidWord(word)) return false;
        word = '';
      }
    }
  }

  return true;
}

// ============ Word Placement ============

interface PlacementOption {
  word: string;
  row: number;
  col: number;
  direction: 'h' | 'v';
  newLettersUsed: string[]; // Letters added to grid (not from intersection)
  intersectionCount: number;
}

function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'h' | 'v',
  availableLetters: Map<string, number>
): PlacementOption | null {
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

  const newLettersNeeded = new Map<string, number>();
  let intersectionCount = 0;
  const newLettersUsed: string[] = [];

  // Check each position
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    const existing = grid[row][col];
    const needed = word[i];

    if (existing) {
      // Must match existing letter
      if (existing !== needed) return null;
      intersectionCount++;
    } else {
      // Need this letter from available pool
      newLettersNeeded.set(needed, (newLettersNeeded.get(needed) || 0) + 1);
      newLettersUsed.push(needed);

      // Check we have this letter available
      const available = availableLetters.get(needed) || 0;
      const alreadyNeeded = newLettersNeeded.get(needed) || 0;
      if (alreadyNeeded > available) return null;
    }
  }

  // For non-first word, must have at least one intersection
  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));
  if (gridHasLetters && intersectionCount === 0) return null;

  // Create test grid and validate
  const testGrid = cloneGrid(grid);
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    testGrid[row][col] = word[i];
  }

  if (!validateAllGridWords(testGrid)) return null;

  return {
    word,
    row: startRow,
    col: startCol,
    direction,
    newLettersUsed,
    intersectionCount,
  };
}

function findAllPlacements(
  grid: (string | null)[][],
  word: string,
  availableLetters: Map<string, number>
): PlacementOption[] {
  const placements: PlacementOption[] = [];
  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));

  if (!gridHasLetters) {
    // First word: place horizontally at center
    const startRow = Math.floor(GRID_SIZE / 2);
    const startCol = Math.floor((GRID_SIZE - word.length) / 2);
    const placement = tryPlaceWord(grid, word, startRow, startCol, 'h', availableLetters);
    if (placement) placements.push(placement);
    return placements;
  }

  // Find intersection opportunities
  const seen = new Set<string>();
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[row][col];
      if (!cell) continue;

      // Find this letter in the word
      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          // Try horizontal placement
          const hStart = col - i;
          const hKey = `h:${row}:${hStart}`;
          if (!seen.has(hKey)) {
            seen.add(hKey);
            const placement = tryPlaceWord(grid, word, row, hStart, 'h', availableLetters);
            if (placement) placements.push(placement);
          }

          // Try vertical placement
          const vStart = row - i;
          const vKey = `v:${vStart}:${col}`;
          if (!seen.has(vKey)) {
            seen.add(vKey);
            const placement = tryPlaceWord(grid, word, vStart, col, 'v', availableLetters);
            if (placement) placements.push(placement);
          }
        }
      }
    }
  }

  return placements;
}

function applyPlacement(
  grid: (string | null)[][],
  placement: PlacementOption
): (string | null)[][] {
  const newGrid = cloneGrid(grid);
  for (let i = 0; i < placement.word.length; i++) {
    const row = placement.direction === 'h' ? placement.row : placement.row + i;
    const col = placement.direction === 'h' ? placement.col + i : placement.col;
    newGrid[row][col] = placement.word[i];
  }
  return newGrid;
}

function subtractLetters(
  available: Map<string, number>,
  letters: string[]
): Map<string, number> {
  const result = new Map(available);
  for (const c of letters) {
    const count = result.get(c) || 0;
    if (count <= 1) {
      result.delete(c);
    } else {
      result.set(c, count - 1);
    }
  }
  return result;
}

// ============ Main Solver ============

function solve(
  grid: (string | null)[][],
  availableLetters: Map<string, number>,
  allWords: string[],
  deadline: number,
  depth: number = 0
): (string | null)[][] | null {
  if (Date.now() > deadline) return null;

  // Success: all letters used
  if (availableLetters.size === 0) {
    return grid;
  }

  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));

  // For first word, find words that use only available letters
  // For subsequent words, find words that can intersect with grid AND use available letters
  const candidateWords: string[] = [];

  for (const word of allWords) {
    // Count letters needed from available pool (not from grid intersections)
    const needed = new Map<string, number>();
    for (const c of word) {
      needed.set(c, (needed.get(c) || 0) + 1);
    }

    // Check if word can be formed using available letters + possible grid intersections
    let canForm = true;
    let usesAvailable = false;

    for (const [char, count] of needed) {
      const available = availableLetters.get(char) || 0;
      if (available > 0) usesAvailable = true;
      // For first word: need all letters from available
      // For later words: can use some from grid (intersection)
      if (!gridHasLetters && available < count) {
        canForm = false;
        break;
      }
    }

    // Word must use at least one available letter (otherwise we make no progress)
    if (canForm && usesAvailable) {
      candidateWords.push(word);
    }
  }

  if (depth === 0) {
    console.log(`[Solver] Depth 0: ${candidateWords.length} candidates, ${availableLetters.size} letters remaining`);
  }

  // Sort by: prefer words using more available letters (more progress per step)
  candidateWords.sort((a, b) => {
    const aAvail = a.split('').filter(c => availableLetters.has(c)).length;
    const bAvail = b.split('').filter(c => availableLetters.has(c)).length;
    if (bAvail !== aAvail) return bAvail - aAvail;
    // Tie-break by length (longer = more constrained)
    return b.length - a.length;
  });

  // Limit candidates at each depth to control branching
  const maxCandidates = depth === 0 ? 150 : 80;
  const maxPlacements = depth === 0 ? 20 : 10;

  for (const word of candidateWords.slice(0, maxCandidates)) {
    const placements = findAllPlacements(grid, word, availableLetters);

    if (placements.length === 0) continue;

    // Sort placements: prefer using more new letters (more progress)
    placements.sort((a, b) => {
      if (b.newLettersUsed.length !== a.newLettersUsed.length) {
        return b.newLettersUsed.length - a.newLettersUsed.length;
      }
      return b.intersectionCount - a.intersectionCount;
    });

    for (const placement of placements.slice(0, maxPlacements)) {
      const newGrid = applyPlacement(grid, placement);
      const newAvailable = subtractLetters(availableLetters, placement.newLettersUsed);

      if (depth === 0) {
        console.log(`[Solver] Trying: ${placement.word} (uses ${placement.newLettersUsed.length} new letters)`);
      }

      const result = solve(newGrid, newAvailable, allWords, deadline, depth + 1);
      if (result) return result;
    }
  }

  return null;
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
          l => l.char.toLowerCase() === char.toLowerCase() && !usedLetterIds.has(l.id)
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

export function solvePuzzle(letters: Letter[]): SolveResult {
  const letterChars = letters.map(l => l.char.toLowerCase());
  const deadline = Date.now() + SOLVE_TIMEOUT;

  console.log(`[Solver] Solving with letters: ${letterChars.join('').toUpperCase()}`);

  // Build letter counts
  const letterCounts = new Map<string, number>();
  for (const c of letterChars) {
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }

  // Get all valid words that could be formed
  const allWords = getWordsFromLetters(letterCounts);
  console.log(`[Solver] Found ${allWords.length} candidate words`);

  // Sort by length descending (start with longer words for more constraint)
  allWords.sort((a, b) => b.length - a.length);

  // Phase 1: Try with all 12 letters
  console.log('[Solver] Phase 1: Trying all 12 letters...');
  const grid12 = solve(createEmptyGrid(), letterCounts, allWords, deadline);

  if (grid12) {
    console.log('[Solver] Found 12-letter solution!');
    const placements = gridToPlacements(grid12, letters);
    return {
      placements,
      success: placements.length === 12,
    };
  }

  // Phase 2: Try with 11 letters
  console.log('[Solver] Phase 2: Trying 11-letter solutions...');
  const uniqueLetters = [...new Set(letterChars)];

  for (const letterToRemove of uniqueLetters) {
    if (Date.now() > deadline) break;

    const reducedCounts = new Map(letterCounts);
    const currentCount = reducedCounts.get(letterToRemove) || 0;
    if (currentCount <= 1) {
      reducedCounts.delete(letterToRemove);
    } else {
      reducedCounts.set(letterToRemove, currentCount - 1);
    }

    console.log(`[Solver] Trying without one '${letterToRemove.toUpperCase()}'...`);

    const reducedWords = getWordsFromLetters(reducedCounts);
    reducedWords.sort((a, b) => b.length - a.length);

    const grid11 = solve(createEmptyGrid(), reducedCounts, reducedWords, deadline);

    if (grid11) {
      console.log(`[Solver] Found solution by removing '${letterToRemove.toUpperCase()}'!`);
      const placements = gridToPlacements(grid11, letters);
      return {
        placements,
        success: placements.length === 11,
        removedLetter: letterToRemove.toUpperCase(),
      };
    }
  }

  console.log('[Solver] No solution found');
  return { placements: [], success: false };
}
