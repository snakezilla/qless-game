#!/usr/bin/env npx tsx
import { solvePuzzleV4 } from './app/lib/solver-v4';

const testCases = [
  'AEIORSTNLDMH',
  'TFEPDSGARNTN', 
  'BEINOSTURLHP',
  'AAEONRSTDLMP',
  'ETAOINSHRDLU',
];

interface Letter {
  id: string;
  char: string;
  position: { row: number; col: number } | null;
}

console.log('🧪 SOLVER V4 TEST\n');

let passed = 0;
for (const letters of testCases) {
  console.log(`Testing: ${letters}`);
  const letterObjs: Letter[] = letters.split('').map((c, i) => ({
    id: `l${i}`,
    char: c,
    position: null
  }));
  
  const result = solvePuzzleV4(letterObjs);
  if (result.success) {
    console.log(`✅ SOLVED${result.removedLetter ? ` (removed ${result.removedLetter})` : ''}`);
    passed++;
  } else {
    console.log(`✗ FAILED`);
  }
  console.log('');
}

console.log(`\n=== RESULTS: ${passed}/${testCases.length} (${Math.round(passed/testCases.length*100)}%) ===`);
