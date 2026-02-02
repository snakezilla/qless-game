// Q-Less Puzzle Solver - Optimized Placement-First Approach
// Key optimizations: rare letters first, early pruning, reduced branching

import { isValidWord, getWordsFromLetters } from './words';
import type { Letter } from './gameState';

const GRID_SIZE = 8;
const SOLVE_TIMEOUT = 12000; // 12 seconds

// Letter rarity scores (higher = rarer, prioritize these)
const LETTER_RARITY: Record<string, number> = {
  q: 10, z: 10, x: 9, j: 8, k: 7, v: 6,
  w: 5, y: 5, f: 4, b: 4, h: 4, m: 4, p: 4,
  g: 3, c: 3, d: 3, u: 3,
  l: 2, n: 2, r: 2, t: 2, s: 2, o: 2,
  i: 1, a: 1, e: 1,
};

export interface SolveResult {
  placements: { letterId: string; row: number; col: number }[];
  success: boolean;
  removedLetter?: string;
}

function createEmptyGrid(): (string | null)[][] {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function cloneGrid(grid: (string | null)[][]): (string | null)[][] {
  return grid.map(row => [...row]);
}

function validateAllGridWords(grid: (string | null)[][]): boolean {
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

// Calculate rarity score for a word based on its letters
function wordRarityScore(word: string, available: Map<string, number>): number {
  let score = 0;
  for (const c of word) {
    if (available.has(c)) {
      score += LETTER_RARITY[c] || 1;
    }
  }
  return score;
}

// Check if remaining letters can form at least one valid 3+ letter word
function canFormAnyWord(available: Map<string, number>, wordList: string[]): boolean {
  if (available.size === 0) return true;

  for (const word of wordList) {
    if (word.length < 3) continue;
    const needed = new Map<string, number>();
    for (const c of word) {
      needed.set(c, (needed.get(c) || 0) + 1);
    }
    let canForm = true;
    for (const [char, count] of needed) {
      if ((available.get(char) || 0) < count) {
        canForm = false;
        break;
      }
    }
    if (canForm) return true;
  }
  return false;
}

interface PlacementOption {
  word: string;
  row: number;
  col: number;
  direction: 'h' | 'v';
  newLettersUsed: string[];
  intersectionCount: number;
  rarityScore: number;
}

function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'h' | 'v',
  availableLetters: Map<string, number>
): PlacementOption | null {
  if (direction === 'h') {
    if (startCol < 0 || startCol + word.length > GRID_SIZE) return null;
    if (startRow < 0 || startRow >= GRID_SIZE) return null;
  } else {
    if (startRow < 0 || startRow + word.length > GRID_SIZE) return null;
    if (startCol < 0 || startCol >= GRID_SIZE) return null;
  }

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
  let rarityScore = 0;

  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    const existing = grid[row][col];
    const needed = word[i];

    if (existing) {
      if (existing !== needed) return null;
      intersectionCount++;
    } else {
      newLettersNeeded.set(needed, (newLettersNeeded.get(needed) || 0) + 1);
      newLettersUsed.push(needed);
      rarityScore += LETTER_RARITY[needed] || 1;

      const available = availableLetters.get(needed) || 0;
      const alreadyNeeded = newLettersNeeded.get(needed) || 0;
      if (alreadyNeeded > available) return null;
    }
  }

  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));
  if (gridHasLetters && intersectionCount === 0) return null;

  const testGrid = cloneGrid(grid);
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    testGrid[row][col] = word[i];
  }

  if (!validateAllGridWords(testGrid)) return null;

  return { word, row: startRow, col: startCol, direction, newLettersUsed, intersectionCount, rarityScore };
}

function findAllPlacements(
  grid: (string | null)[][],
  word: string,
  availableLetters: Map<string, number>
): PlacementOption[] {
  const placements: PlacementOption[] = [];
  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));

  if (!gridHasLetters) {
    const startRow = Math.floor(GRID_SIZE / 2);
    const startCol = Math.floor((GRID_SIZE - word.length) / 2);
    const placement = tryPlaceWord(grid, word, startRow, startCol, 'h', availableLetters);
    if (placement) placements.push(placement);
    return placements;
  }

  const seen = new Set<string>();
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = grid[row][col];
      if (!cell) continue;

      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          const hStart = col - i;
          const hKey = `h:${row}:${hStart}`;
          if (!seen.has(hKey)) {
            seen.add(hKey);
            const placement = tryPlaceWord(grid, word, row, hStart, 'h', availableLetters);
            if (placement) placements.push(placement);
          }

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

function applyPlacement(grid: (string | null)[][], placement: PlacementOption): (string | null)[][] {
  const newGrid = cloneGrid(grid);
  for (let i = 0; i < placement.word.length; i++) {
    const row = placement.direction === 'h' ? placement.row : placement.row + i;
    const col = placement.direction === 'h' ? placement.col + i : placement.col;
    newGrid[row][col] = placement.word[i];
  }
  return newGrid;
}

function subtractLetters(available: Map<string, number>, letters: string[]): Map<string, number> {
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

function solve(
  grid: (string | null)[][],
  availableLetters: Map<string, number>,
  allWords: string[],
  deadline: number,
  depth: number = 0
): (string | null)[][] | null {
  if (Date.now() > deadline) return null;

  if (availableLetters.size === 0) {
    return grid;
  }

  const gridHasLetters = grid.some(row => row.some(cell => cell !== null));

  // Early pruning: check if remaining letters can form any word
  if (availableLetters.size >= 3 && !canFormAnyWord(availableLetters, allWords)) {
    return null;
  }

  const candidateWords: string[] = [];

  for (const word of allWords) {
    const needed = new Map<string, number>();
    for (const c of word) {
      needed.set(c, (needed.get(c) || 0) + 1);
    }

    let canForm = true;
    let usesAvailable = false;

    for (const [char, count] of needed) {
      const available = availableLetters.get(char) || 0;
      if (available > 0) usesAvailable = true;
      if (!gridHasLetters && available < count) {
        canForm = false;
        break;
      }
    }

    if (canForm && usesAvailable) {
      candidateWords.push(word);
    }
  }

  // Sort by rarity score (use rare letters first!) then by length
  candidateWords.sort((a, b) => {
    const aRarity = wordRarityScore(a, availableLetters);
    const bRarity = wordRarityScore(b, availableLetters);
    if (bRarity !== aRarity) return bRarity - aRarity;
    return b.length - a.length;
  });

  // Tighter limits for faster search
  const maxCandidates = depth === 0 ? 60 : 30;
  const maxPlacements = depth === 0 ? 8 : 4;

  for (const word of candidateWords.slice(0, maxCandidates)) {
    const placements = findAllPlacements(grid, word, availableLetters);
    if (placements.length === 0) continue;

    // Sort placements by rarity score and progress
    placements.sort((a, b) => {
      if (b.rarityScore !== a.rarityScore) return b.rarityScore - a.rarityScore;
      if (b.newLettersUsed.length !== a.newLettersUsed.length) {
        return b.newLettersUsed.length - a.newLettersUsed.length;
      }
      return b.intersectionCount - a.intersectionCount;
    });

    for (const placement of placements.slice(0, maxPlacements)) {
      const newGrid = applyPlacement(grid, placement);
      const newAvailable = subtractLetters(availableLetters, placement.newLettersUsed);

      const result = solve(newGrid, newAvailable, allWords, deadline, depth + 1);
      if (result) return result;
    }
  }

  return null;
}

function gridToPlacements(grid: (string | null)[][], letters: Letter[]): { letterId: string; row: number; col: number }[] {
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

  console.log(`[Solver] Solving: ${letterChars.join('').toUpperCase()}`);

  const letterCounts = new Map<string, number>();
  for (const c of letterChars) {
    letterCounts.set(c, (letterCounts.get(c) || 0) + 1);
  }

  const allWords = getWordsFromLetters(letterCounts);
  console.log(`[Solver] ${allWords.length} candidate words`);

  // Sort by rarity first
  allWords.sort((a, b) => {
    const aRarity = wordRarityScore(a, letterCounts);
    const bRarity = wordRarityScore(b, letterCounts);
    if (bRarity !== aRarity) return bRarity - aRarity;
    return b.length - a.length;
  });

  // Phase 1: Try with all 12 letters
  const grid12 = solve(createEmptyGrid(), letterCounts, allWords, deadline);

  if (grid12) {
    console.log('[Solver] Found 12-letter solution!');
    return { placements: gridToPlacements(grid12, letters), success: true };
  }

  // Phase 2: Try with 11 letters - prioritize removing rare letters
  console.log('[Solver] Trying 11-letter solutions...');
  const uniqueLetters = [...new Set(letterChars)].sort(
    (a, b) => (LETTER_RARITY[b] || 1) - (LETTER_RARITY[a] || 1)
  );

  for (const letterToRemove of uniqueLetters) {
    if (Date.now() > deadline) break;

    const reducedCounts = new Map(letterCounts);
    const currentCount = reducedCounts.get(letterToRemove) || 0;
    if (currentCount <= 1) {
      reducedCounts.delete(letterToRemove);
    } else {
      reducedCounts.set(letterToRemove, currentCount - 1);
    }

    const reducedWords = getWordsFromLetters(reducedCounts);
    reducedWords.sort((a, b) => {
      const aRarity = wordRarityScore(a, reducedCounts);
      const bRarity = wordRarityScore(b, reducedCounts);
      if (bRarity !== aRarity) return bRarity - aRarity;
      return b.length - a.length;
    });

    const grid11 = solve(createEmptyGrid(), reducedCounts, reducedWords, deadline);

    if (grid11) {
      console.log(`[Solver] Solved by removing '${letterToRemove.toUpperCase()}'`);
      return {
        placements: gridToPlacements(grid11, letters),
        success: true,
        removedLetter: letterToRemove.toUpperCase(),
      };
    }
  }

  console.log('[Solver] No solution found');
  return { placements: [], success: false };
}
