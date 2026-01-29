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
// Now using the improved solver from solver.ts
export { solvePuzzle, type SolveResult } from './solver';
