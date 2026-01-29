#!/usr/bin/env npx tsx
// Large-scale test for solver V4

import { solvePuzzleV4 } from './app/lib/solver-v4';

interface Letter {
  id: string;
  char: string;
  position: { row: number; col: number } | null;
}

const DICE_FACES = [
  ['A', 'A', 'E', 'I', 'O', 'U'],
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

function rollDice(): string {
  const letters = DICE_FACES.map(die => die[Math.floor(Math.random() * 6)]);
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const vowelCount = letters.filter(l => vowels.includes(l)).length;
  
  if (vowelCount < 2) {
    const consonantIndices = letters.map((l, i) => vowels.includes(l) ? -1 : i).filter(i => i !== -1);
    while (letters.filter(l => vowels.includes(l)).length < 2 && consonantIndices.length > 0) {
      const idx = consonantIndices.pop()!;
      letters[idx] = vowels[Math.floor(Math.random() * 5)];
    }
  }
  
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  
  return letters.join('');
}

function createLetters(chars: string): Letter[] {
  return chars.split('').map((char, i) => ({
    id: `letter-${i}`,
    char: char.toLowerCase(),
    position: null,
  }));
}

async function runTests() {
  const NUM_TESTS = 25;
  console.log(`\n🧪 SOLVER V4 LARGE TEST (${NUM_TESTS} random puzzles)\n`);
  
  let successes12 = 0;
  let successes11 = 0;
  let failures = 0;
  let totalTime = 0;
  const failedCases: string[] = [];
  
  for (let i = 0; i < NUM_TESTS; i++) {
    const letterStr = rollDice();
    process.stdout.write(`[${i+1}/${NUM_TESTS}] ${letterStr}... `);
    
    const letters = createLetters(letterStr);
    const start = Date.now();
    const result = solvePuzzleV4(letters, 15000);
    const elapsed = Date.now() - start;
    totalTime += elapsed;
    
    if (result.success) {
      if (result.removedLetter) {
        successes11++;
        console.log(`✓ 11L (${elapsed}ms, -${result.removedLetter})`);
      } else {
        successes12++;
        console.log(`✓ 12L (${elapsed}ms)`);
      }
    } else {
      failures++;
      failedCases.push(letterStr);
      console.log(`✗ FAIL (${elapsed}ms)`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`12-letter: ${successes12}/${NUM_TESTS}`);
  console.log(`11-letter: ${successes11}/${NUM_TESTS}`);
  console.log(`Total success: ${successes12 + successes11}/${NUM_TESTS} (${((successes12 + successes11) / NUM_TESTS * 100).toFixed(0)}%)`);
  console.log(`Failures: ${failures}`);
  console.log(`Avg time: ${(totalTime / NUM_TESTS).toFixed(0)}ms`);
  
  if (failedCases.length > 0) {
    console.log(`\nFailed cases: ${failedCases.join(', ')}`);
  }
}

runTests();
