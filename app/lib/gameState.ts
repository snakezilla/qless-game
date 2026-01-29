// Q-Less Game State Management
import { isValidWord, VALID_WORDS } from './words';

export interface Letter {
  id: string;
  char: string;
  position: { row: number; col: number } | null;
}

export interface GridCell {
  row: number;
  col: number;
  letter: Letter | null;
}

export interface WordResult {
  word: string;
  positions: { row: number; col: number }[];
  isValid: boolean;
  direction: 'horizontal' | 'vertical';
}

export interface GameState {
  letters: Letter[];
  grid: (Letter | null)[][];
  timer: number;
  isWon: boolean;
  words: WordResult[];
}

// Dice faces - no Q, weighted for playability
// Each die has 6 faces, we pick one face per die
const DICE_FACES = [
  ['A', 'A', 'E', 'I', 'O', 'U'], // Vowel dice
  ['A', 'E', 'I', 'O', 'U', 'Y'],
  ['A', 'E', 'I', 'O', 'N', 'R'],
  ['B', 'C', 'D', 'F', 'G', 'H'],
  ['J', 'K', 'L', 'M', 'N', 'P'],
  ['R', 'S', 'T', 'W', 'X', 'Z'],
  ['B', 'C', 'D', 'G', 'P', 'T'],
  ['L', 'M', 'N', 'R', 'S', 'T'],
  ['D', 'H', 'L', 'N', 'R', 'S'],
  ['C', 'F', 'H', 'K', 'P', 'W'],
  ['G', 'K', 'L', 'M', 'N', 'V'],
  ['B', 'F', 'G', 'J', 'K', 'V'],
];

function rollDice(): string[] {
  const letters = DICE_FACES.map(die => die[Math.floor(Math.random() * 6)]);
  
  // Ensure 2-3 vowels for playability
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const vowelCount = letters.filter(l => vowels.includes(l)).length;
  
  if (vowelCount < 2) {
    // Replace some consonants with vowels
    const consonantIndices = letters
      .map((l, i) => vowels.includes(l) ? -1 : i)
      .filter(i => i !== -1);
    
    while (letters.filter(l => vowels.includes(l)).length < 2 && consonantIndices.length > 0) {
      const idx = consonantIndices.pop()!;
      letters[idx] = vowels[Math.floor(Math.random() * 5)];
    }
  } else if (vowelCount > 4) {
    // Too many vowels, replace some
    const vowelIndices = letters
      .map((l, i) => vowels.includes(l) ? i : -1)
      .filter(i => i !== -1);
    
    const consonants = 'BCDFGHJKLMNPRSTVWXYZ'.split('');
    while (letters.filter(l => vowels.includes(l)).length > 4 && vowelIndices.length > 0) {
      const idx = vowelIndices.pop()!;
      letters[idx] = consonants[Math.floor(Math.random() * consonants.length)];
    }
  }
  
  // Shuffle the letters
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  
  return letters;
}

export function createInitialState(): GameState {
  const rolledLetters = rollDice();
  const letters: Letter[] = rolledLetters.map((char, i) => ({
    id: `letter-${i}`,
    char,
    position: null,
  }));

  // Create 8x8 grid (smaller for better UX)
  const grid: (Letter | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

  return {
    letters,
    grid,
    timer: 0,
    isWon: false,
    words: [],
  };
}

export function placeLetter(
  state: GameState,
  letterId: string,
  row: number,
  col: number
): GameState {
  // Check if cell is occupied
  if (state.grid[row][col] !== null) {
    return state;
  }

  const letterIndex = state.letters.findIndex(l => l.id === letterId);
  if (letterIndex === -1) return state;

  const letter = state.letters[letterIndex];
  
  // Create new grid
  const newGrid = state.grid.map(r => [...r]);
  
  // Remove letter from old position if any
  if (letter.position) {
    newGrid[letter.position.row][letter.position.col] = null;
  }
  
  // Place letter in new position
  const newLetter = { ...letter, position: { row, col } };
  newGrid[row][col] = newLetter;

  // Update letters array
  const newLetters = [...state.letters];
  newLetters[letterIndex] = newLetter;

  // Validate words
  const words = findAllWords(newGrid);
  const isWon = checkWinCondition(newLetters, words, newGrid);

  return {
    ...state,
    letters: newLetters,
    grid: newGrid,
    words,
    isWon,
  };
}

export function removeLetter(state: GameState, letterId: string): GameState {
  const letterIndex = state.letters.findIndex(l => l.id === letterId);
  if (letterIndex === -1) return state;

  const letter = state.letters[letterIndex];
  if (!letter.position) return state;

  const newGrid = state.grid.map(r => [...r]);
  newGrid[letter.position.row][letter.position.col] = null;

  const newLetter = { ...letter, position: null };
  const newLetters = [...state.letters];
  newLetters[letterIndex] = newLetter;

  const words = findAllWords(newGrid);

  return {
    ...state,
    letters: newLetters,
    grid: newGrid,
    words,
    isWon: false,
  };
}

function findAllWords(grid: (Letter | null)[][]): WordResult[] {
  const words: WordResult[] = [];

  // Find horizontal words
  for (let row = 0; row < grid.length; row++) {
    let wordStart = -1;
    let currentWord = '';
    const positions: { row: number; col: number }[] = [];

    for (let col = 0; col <= grid[row].length; col++) {
      const cell = col < grid[row].length ? grid[row][col] : null;
      
      if (cell) {
        if (wordStart === -1) wordStart = col;
        currentWord += cell.char;
        positions.push({ row, col });
      } else {
        if (currentWord.length >= 2) {
          words.push({
            word: currentWord,
            positions: [...positions],
            isValid: currentWord.length >= 3 && isValidWord(currentWord),
            direction: 'horizontal',
          });
        }
        wordStart = -1;
        currentWord = '';
        positions.length = 0;
      }
    }
  }

  // Find vertical words
  for (let col = 0; col < grid[0].length; col++) {
    let wordStart = -1;
    let currentWord = '';
    const positions: { row: number; col: number }[] = [];

    for (let row = 0; row <= grid.length; row++) {
      const cell = row < grid.length ? grid[row][col] : null;
      
      if (cell) {
        if (wordStart === -1) wordStart = row;
        currentWord += cell.char;
        positions.push({ row, col });
      } else {
        if (currentWord.length >= 2) {
          words.push({
            word: currentWord,
            positions: [...positions],
            isValid: currentWord.length >= 3 && isValidWord(currentWord),
            direction: 'vertical',
          });
        }
        wordStart = -1;
        currentWord = '';
        positions.length = 0;
      }
    }
  }

  return words;
}

function areAllLettersConnected(grid: (Letter | null)[][]): boolean {
  // Find first placed letter
  let startRow = -1, startCol = -1;
  const placedCells: Set<string> = new Set();

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col]) {
        if (startRow === -1) {
          startRow = row;
          startCol = col;
        }
        placedCells.add(`${row},${col}`);
      }
    }
  }

  if (placedCells.size === 0) return true;

  // BFS to find all connected letters
  const visited: Set<string> = new Set();
  const queue: [number, number][] = [[startRow, startCol]];
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    const neighbors = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ];

    for (const [nr, nc] of neighbors) {
      const key = `${nr},${nc}`;
      if (
        nr >= 0 && nr < grid.length &&
        nc >= 0 && nc < grid[0].length &&
        grid[nr][nc] &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return visited.size === placedCells.size;
}

function checkWinCondition(
  letters: Letter[],
  words: WordResult[],
  grid: (Letter | null)[][]
): boolean {
  // All 12 letters must be placed
  const allPlaced = letters.every(l => l.position !== null);
  if (!allPlaced) return false;

  // All letters must be connected
  if (!areAllLettersConnected(grid)) return false;

  // All words must be valid (3+ letters)
  const allWordsValid = words.every(w => w.isValid);
  if (!allWordsValid) return false;

  // Must have at least 2 words
  if (words.length < 2) return false;

  // Check that all placed letters are part of at least one word
  const lettersInWords = new Set<string>();
  for (const word of words) {
    for (const pos of word.positions) {
      lettersInWords.add(`${pos.row},${pos.col}`);
    }
  }

  for (const letter of letters) {
    if (letter.position && !lettersInWords.has(`${letter.position.row},${letter.position.col}`)) {
      return false;
    }
  }

  return true;
}

export function shuffleUnplacedLetters(state: GameState): GameState {
  const unplaced = state.letters.filter(l => l.position === null);
  
  // Shuffle chars among unplaced letters
  const chars = unplaced.map(l => l.char);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  const newLetters = state.letters.map(l => {
    if (l.position === null) {
      const char = chars.pop()!;
      return { ...l, char };
    }
    return l;
  });

  return {
    ...state,
    letters: newLetters,
  };
}

// ============ AUTO-SOLVE ALGORITHM ============

interface Placement {
  letterId: string;
  row: number;
  col: number;
}

// Find all valid words that can be made from given letters
function findValidWordsFromLetters(letters: string[]): string[] {
  const letterCount = new Map<string, number>();
  for (const l of letters) {
    letterCount.set(l.toLowerCase(), (letterCount.get(l.toLowerCase()) || 0) + 1);
  }

  const validWords: string[] = [];
  
  for (const word of VALID_WORDS) {
    if (word.length < 3 || word.length > letters.length) continue;
    
    const wordLetterCount = new Map<string, number>();
    for (const c of word) {
      wordLetterCount.set(c, (wordLetterCount.get(c) || 0) + 1);
    }
    
    let canMake = true;
    for (const [char, count] of wordLetterCount) {
      if ((letterCount.get(char) || 0) < count) {
        canMake = false;
        break;
      }
    }
    
    if (canMake) {
      validWords.push(word);
    }
  }
  
  // Sort by length descending (longer words = more constraining = faster pruning)
  validWords.sort((a, b) => b.length - a.length);
  return validWords;
}

// Get remaining letters after using some for words
function getRemainingLetters(letters: string[], usedWords: string[]): string[] {
  const remaining = [...letters.map(l => l.toLowerCase())];
  for (const word of usedWords) {
    for (const c of word) {
      const idx = remaining.indexOf(c);
      if (idx !== -1) remaining.splice(idx, 1);
    }
  }
  return remaining;
}

// Try to place a word on the grid, returns new grid or null if invalid
function tryPlaceWord(
  grid: (string | null)[][],
  word: string,
  startRow: number,
  startCol: number,
  direction: 'h' | 'v'
): (string | null)[][] | null {
  const newGrid = grid.map(r => [...r]);
  
  for (let i = 0; i < word.length; i++) {
    const row = direction === 'h' ? startRow : startRow + i;
    const col = direction === 'h' ? startCol + i : startCol;
    
    // Out of bounds
    if (row < 0 || row >= 8 || col < 0 || col >= 8) return null;
    
    const existing = newGrid[row][col];
    if (existing && existing !== word[i]) return null; // Conflict
    
    newGrid[row][col] = word[i];
  }
  
  // Check for invalid adjacent letters (would form invalid words)
  // Check cells before and after the word
  if (direction === 'h') {
    if (startCol > 0 && newGrid[startRow][startCol - 1]) return null;
    if (startCol + word.length < 8 && newGrid[startRow][startCol + word.length]) return null;
  } else {
    if (startRow > 0 && newGrid[startRow - 1][startCol]) return null;
    if (startRow + word.length < 8 && newGrid[startRow + word.length][startCol]) return null;
  }
  
  return newGrid;
}

// Check if word intersects with existing grid
function findIntersections(
  grid: (string | null)[][],
  word: string
): { row: number; col: number; direction: 'h' | 'v' }[] {
  const positions: { row: number; col: number; direction: 'h' | 'v' }[] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = grid[row][col];
      if (!cell) continue;
      
      // Find where this letter appears in the word
      for (let i = 0; i < word.length; i++) {
        if (word[i] === cell) {
          // Try horizontal placement
          const hStart = col - i;
          if (hStart >= 0 && hStart + word.length <= 8) {
            positions.push({ row, col: hStart, direction: 'h' });
          }
          // Try vertical placement
          const vStart = row - i;
          if (vStart >= 0 && vStart + word.length <= 8) {
            positions.push({ row: vStart, col, direction: 'v' });
          }
        }
      }
    }
  }
  
  return positions;
}

// Validate all words on grid are valid
function validateGrid(grid: (string | null)[][]): boolean {
  // Check horizontal words
  for (let row = 0; row < 8; row++) {
    let word = '';
    for (let col = 0; col <= 8; col++) {
      const cell = col < 8 ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else if (word.length >= 2) {
        if (word.length >= 3 && !isValidWord(word)) return false;
        if (word.length === 2) return false; // 2-letter sequences not allowed
        word = '';
      } else {
        word = '';
      }
    }
  }
  
  // Check vertical words
  for (let col = 0; col < 8; col++) {
    let word = '';
    for (let row = 0; row <= 8; row++) {
      const cell = row < 8 ? grid[row][col] : null;
      if (cell) {
        word += cell;
      } else if (word.length >= 2) {
        if (word.length >= 3 && !isValidWord(word)) return false;
        if (word.length === 2) return false;
        word = '';
      } else {
        word = '';
      }
    }
  }
  
  return true;
}

// Count letters on grid
function countGridLetters(grid: (string | null)[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell) count++;
    }
  }
  return count;
}

// Backtracking solver
function solveBacktrack(
  grid: (string | null)[][],
  remainingLetters: string[],
  validWords: string[],
  depth: number = 0
): (string | null)[][] | null {
  // If we've used all letters and grid is valid, we're done!
  if (remainingLetters.length === 0) {
    return validateGrid(grid) ? grid : null;
  }
  
  // Limit depth to prevent infinite loops
  if (depth > 15) return null;
  
  // Find words we can still make with remaining letters
  const possibleWords = validWords.filter(word => {
    const needed = new Map<string, number>();
    for (const c of word) {
      needed.set(c, (needed.get(c) || 0) + 1);
    }
    const available = new Map<string, number>();
    for (const c of remainingLetters) {
      available.set(c, (available.get(c) || 0) + 1);
    }
    for (const [char, count] of needed) {
      if ((available.get(char) || 0) < count) return false;
    }
    return true;
  });
  
  // If no grid content yet, place first word in center
  if (countGridLetters(grid) === 0) {
    for (const word of possibleWords.slice(0, 20)) { // Try top 20 longest
      const startCol = Math.floor((8 - word.length) / 2);
      const startRow = 3;
      
      const newGrid = tryPlaceWord(grid, word, startRow, startCol, 'h');
      if (newGrid && validateGrid(newGrid)) {
        const newRemaining = getRemainingLetters(remainingLetters.map(l => l.toUpperCase()), [word]).map(l => l.toLowerCase());
        const result = solveBacktrack(newGrid, newRemaining, possibleWords, depth + 1);
        if (result) return result;
      }
    }
    return null;
  }
  
  // Try to place words that intersect with existing grid
  for (const word of possibleWords.slice(0, 30)) {
    const intersections = findIntersections(grid, word);
    
    for (const { row, col, direction } of intersections) {
      const newGrid = tryPlaceWord(grid, word, row, col, direction);
      if (newGrid && validateGrid(newGrid)) {
        // Calculate new remaining letters
        const gridBefore = countGridLetters(grid);
        const gridAfter = countGridLetters(newGrid);
        const lettersAdded = gridAfter - gridBefore;
        
        if (lettersAdded > 0 && lettersAdded <= remainingLetters.length) {
          // Figure out which letters we used (the new ones)
          const usedLetters: string[] = [];
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              if (newGrid[r][c] && !grid[r][c]) {
                usedLetters.push(newGrid[r][c]!);
              }
            }
          }
          
          const newRemaining = [...remainingLetters];
          for (const used of usedLetters) {
            const idx = newRemaining.indexOf(used);
            if (idx !== -1) newRemaining.splice(idx, 1);
          }
          
          const result = solveBacktrack(newGrid, newRemaining, possibleWords, depth + 1);
          if (result) return result;
        }
      }
    }
  }
  
  return null;
}

export interface SolveResult {
  placements: Placement[];
  success: boolean;
}

export function solvePuzzle(letters: Letter[]): SolveResult {
  const letterChars = letters.map(l => l.char.toLowerCase());
  const validWords = findValidWordsFromLetters(letterChars);
  
  if (validWords.length === 0) {
    return { placements: [], success: false };
  }
  
  // Create empty grid
  const emptyGrid: (string | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
  
  const solution = solveBacktrack(emptyGrid, letterChars, validWords, 0);
  
  if (!solution) {
    return { placements: [], success: false };
  }
  
  // Convert grid solution to placements
  const placements: Placement[] = [];
  const usedLetterIds = new Set<string>();
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const char = solution[row][col];
      if (char) {
        // Find a letter with this char that hasn't been used yet
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
  
  return { placements, success: placements.length === letters.length };
}
