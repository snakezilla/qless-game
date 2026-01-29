// Scrabble Dictionary Validation Layer
// Uses NWL2018 (North American Scrabble) word list
// This filters words AFTER the solver finds solutions - does NOT modify the solver

import scrabbleWordList from './scrabble-wordlist.json';

// Build a Set for O(1) lookup
const SCRABBLE_WORDS: Set<string> = new Set(scrabbleWordList as string[]);

/**
 * Check if a word is valid in the official Scrabble dictionary (NWL2018)
 * @param word - The word to check (case-insensitive)
 * @returns true if the word is in the Scrabble dictionary
 */
export function isScrabbleWord(word: string): boolean {
  return SCRABBLE_WORDS.has(word.toLowerCase());
}

/**
 * Check if ALL words in an array are valid Scrabble words
 * @param words - Array of words to validate
 * @returns true only if ALL words are Scrabble-valid
 */
export function areAllScrabbleWords(words: string[]): boolean {
  return words.every(word => isScrabbleWord(word));
}

/**
 * Filter an array to only include Scrabble-valid words
 * @param words - Array of words to filter
 * @returns Array containing only valid Scrabble words
 */
export function filterToScrabbleWords(words: string[]): string[] {
  return words.filter(word => isScrabbleWord(word));
}

/**
 * Get words that are NOT in the Scrabble dictionary
 * @param words - Array of words to check
 * @returns Array of words that are not Scrabble-valid
 */
export function getNonScrabbleWords(words: string[]): string[] {
  return words.filter(word => !isScrabbleWord(word));
}

// Export word count for debugging
export const SCRABBLE_WORD_COUNT = SCRABBLE_WORDS.size;
