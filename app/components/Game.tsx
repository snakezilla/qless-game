'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameState,
  Letter,
  createInitialState,
  placeLetter,
  removeLetter,
  shuffleUnplacedLetters,
  solvePuzzle,
} from '../lib/gameState';
import {
  GameStats,
  loadStats,
  trackGameStarted,
  trackGameWon,
  trackLetterPlaced,
  trackHintUsed,
  trackSolveUsed,
  startSessionTimer,
  endSession,
} from '../lib/stats';
import GameGrid from './GameGrid';
import DiceTray from './DiceTray';
import WinModal from './WinModal';
import StatsModal from './StatsModal';
import MilestoneToast from './MilestoneToast';

export default function Game() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [draggingLetter, setDraggingLetter] = useState<Letter | null>(null);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(true);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [solveMessage, setSolveMessage] = useState<string | null>(null);
  const [autoSolved, setAutoSolved] = useState(false); // Track if puzzle was auto-solved
  const solveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Stats tracking
  const [stats, setStats] = useState<GameStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<string | null>(null);
  const [hintsUsedThisGame, setHintsUsedThisGame] = useState(false);

  // Initialize game and stats
  useEffect(() => {
    // Load stats and start session timer
    const initialStats = loadStats();
    setStats(initialStats);
    startSessionTimer();
    
    const initGame = () => {
      setIsRolling(true);
      setTimeout(() => {
        setGameState(createInitialState());
        setTimer(0);
        setIsTimerRunning(true);
        setIsRolling(false);
        setHintsUsedThisGame(false);
        
        // Track game started
        const { stats: updatedStats } = trackGameStarted();
        setStats(updatedStats);
      }, 1500);
    };
    initGame();
    
    // Track session end on page unload
    const handleUnload = () => endSession();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      endSession();
    };
  }, []);

  // Timer
  useEffect(() => {
    if (!isTimerRunning || gameState?.isWon) return;

    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, gameState?.isWon]);

  const handleDragStart = useCallback((e: React.DragEvent, letter: Letter) => {
    e.dataTransfer.setData('letterId', letter.id);
    setDraggingLetter(letter);
    setSelectedLetterId(null); // Clear selection when dragging
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingLetter(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((row: number, col: number) => {
    if (!gameState || !draggingLetter) return;

    const newState = placeLetter(gameState, draggingLetter.id, row, col);
    setGameState(newState);
    setDraggingLetter(null);
    
    // Track letter placement
    const updatedStats = trackLetterPlaced();
    setStats(updatedStats);

    if (newState.isWon) {
      setIsTimerRunning(false);
      // Track win
      const { stats: winStats, newMilestones } = trackGameWon(timer, hintsUsedThisGame);
      setStats(winStats);
      if (newMilestones.length > 0) {
        setCurrentMilestone(newMilestones[0]);
      }
    }
  }, [gameState, draggingLetter, timer, hintsUsedThisGame]);

  // Click on a letter in the tray to select it
  const handleTrayLetterClick = useCallback((letter: Letter) => {
    if (isSolving) return;
    
    // Toggle selection
    if (selectedLetterId === letter.id) {
      setSelectedLetterId(null);
    } else {
      setSelectedLetterId(letter.id);
    }
  }, [selectedLetterId, isSolving]);

  // Click on a placed letter to remove it
  const handlePlacedLetterClick = useCallback((letter: Letter) => {
    if (!gameState || !letter.position || isSolving) return;
    const newState = removeLetter(gameState, letter.id);
    setGameState(newState);
    setSelectedLetterId(null);
    setAutoSolved(false); // User is modifying the board, clear auto-solved state
  }, [gameState, isSolving]);

  // Click on an empty cell to place selected letter
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!gameState || !selectedLetterId || isSolving) return;

    const newState = placeLetter(gameState, selectedLetterId, row, col);
    setGameState(newState);
    setSelectedLetterId(null);
    
    // Track letter placement
    const updatedStats = trackLetterPlaced();
    setStats(updatedStats);

    if (newState.isWon) {
      setIsTimerRunning(false);
      // Track win
      const { stats: winStats, newMilestones } = trackGameWon(timer, hintsUsedThisGame);
      setStats(winStats);
      if (newMilestones.length > 0) {
        setCurrentMilestone(newMilestones[0]);
      }
    }
  }, [gameState, selectedLetterId, isSolving, timer, hintsUsedThisGame]);

  const handleShuffle = useCallback(() => {
    if (!gameState || isSolving) return;
    setGameState(shuffleUnplacedLetters(gameState));
    setSelectedLetterId(null);
    setHintsUsedThisGame(true);
    
    // Track hint usage
    const updatedStats = trackHintUsed();
    setStats(updatedStats);
  }, [gameState, isSolving]);

  const handleSolve = useCallback(async () => {
    if (!gameState || isSolving) return;

    setIsSolving(true);
    setSolveError(null);
    setSolveMessage(null);
    setSelectedLetterId(null);
    
    // Track solve button usage
    const updatedStats = trackSolveUsed();
    setStats(updatedStats);

    // Clear existing placements first
    let clearedState = gameState;
    for (const letter of gameState.letters) {
      if (letter.position) {
        clearedState = removeLetter(clearedState, letter.id);
      }
    }
    setGameState(clearedState);

    // Small delay for visual effect
    await new Promise(resolve => setTimeout(resolve, 300));

    // Run solver
    const result = solvePuzzle(clearedState.letters);

    if (!result.success) {
      setSolveError('No solution found - try a new game!');
      setIsSolving(false);
      
      // Clear error after 3 seconds
      solveTimeoutRef.current = setTimeout(() => {
        setSolveError(null);
      }, 3000);
      return;
    }

    // Show message if solved with 11 letters
    if (result.removedLetter) {
      setSolveMessage(`Solved by removing "${result.removedLetter}"`);
      // Clear after 4 seconds
      solveTimeoutRef.current = setTimeout(() => {
        setSolveMessage(null);
      }, 4000);
    }

    // Animate letters one by one with staggered delay
    let currentState = clearedState;
    for (let i = 0; i < result.placements.length; i++) {
      const placement = result.placements[i];
      
      await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 40));
      
      currentState = placeLetter(currentState, placement.letterId, placement.row, placement.col);
      setGameState(currentState);
    }

    setIsSolving(false);
    setAutoSolved(true); // Mark as auto-solved so modal doesn't block

    // For 11-letter solutions, we won't trigger the win condition
    // but the grid is still valid (just with one letter left in tray)
    if (currentState.isWon) {
      setIsTimerRunning(false);
    }
  }, [gameState, isSolving]);

  const handleNewGame = useCallback(() => {
    if (solveTimeoutRef.current) {
      clearTimeout(solveTimeoutRef.current);
    }
    setIsRolling(true);
    setIsTimerRunning(false);
    setSelectedLetterId(null);
    setIsSolving(false);
    setSolveError(null);
    setSolveMessage(null);
    setAutoSolved(false); // Reset auto-solved state
    setHintsUsedThisGame(false); // Reset hints for new game
    setTimeout(() => {
      setGameState(createInitialState());
      setTimer(0);
      setIsTimerRunning(true);
      setIsRolling(false);
      
      // Track new game started
      const { stats: updatedStats } = trackGameStarted();
      setStats(updatedStats);
    }, 1500);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const placedCount = gameState?.letters.filter((l) => l.position !== null).length || 0;
  const validWordCount = gameState?.words.filter((w) => w.isValid).length || 0;
  const scrabbleValidCount = gameState?.words.filter((w) => w.isScrabbleValid).length || 0;
  const hasInvalidWords = gameState?.words.some((w) => !w.isValid) || false;
  const hasNonScrabbleWords = gameState?.words.some((w) => w.isValid && !w.isScrabbleValid) || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">
            Q-Less
          </h1>
          <p className="text-slate-400 text-sm">
            Arrange all 12 letters into connected words
          </p>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex justify-between items-center mb-4 px-2"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            <span className="text-xl font-mono text-white">{formatTime(timer)}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-blue-400">{placedCount}/12</p>
              <p className="text-xs text-slate-500">Placed</p>
            </div>
            <div className="text-center" title={hasNonScrabbleWords ? 'Some words not in Scrabble dictionary' : ''}>
              <p className={`text-lg font-bold ${
                hasInvalidWords ? 'text-red-400' : 
                hasNonScrabbleWords ? 'text-amber-400' :
                validWordCount > 0 ? 'text-green-400' : 'text-slate-500'
              }`}>
                {validWordCount}
              </p>
              <p className="text-xs text-slate-500">Words</p>
            </div>
            {/* Stats button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStatsModal(true)}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/30 transition-all"
              title="View Stats"
            >
              <span className="text-lg">📊</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Rolling animation */}
        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <motion.div
                animate={{ 
                  rotateX: [0, 360, 720, 1080],
                  rotateY: [0, 180, 360, 540],
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 border border-slate-500 flex items-center justify-center text-4xl font-bold text-white shadow-2xl mb-4"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                ?
              </motion.div>
              <p className="text-slate-400 animate-pulse">Rolling dice...</p>
            </motion.div>
          ) : gameState ? (
            <motion.div
              key="game"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Game Grid */}
              <div className="mb-4">
                <GameGrid
                  grid={gameState.grid}
                  words={gameState.words}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onLetterDragStart={handleDragStart}
                  onLetterDragEnd={handleDragEnd}
                  onLetterClick={handlePlacedLetterClick}
                  onCellClick={handleCellClick}
                  draggingLetter={draggingLetter}
                  selectedLetterId={selectedLetterId}
                />
              </div>

              {/* Dice Tray */}
              <div className="mb-4">
                <DiceTray
                  letters={gameState.letters}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onLetterClick={handleTrayLetterClick}
                  draggingLetter={draggingLetter}
                  selectedLetterId={selectedLetterId}
                />
              </div>

              {/* Control buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleShuffle}
                  disabled={isSolving}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🔀</span> Shuffle
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSolve}
                  disabled={isSolving}
                  className="py-3 px-4 rounded-xl font-medium text-slate-300 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 hover:border-purple-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <motion.span
                    animate={isSolving ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 1, repeat: isSolving ? Infinity : 0, ease: 'linear' }}
                  >
                    ✨
                  </motion.span>
                  {isSolving ? 'Solving...' : 'Solve'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNewGame}
                  disabled={isSolving}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>🎲</span> New Game
                </motion.button>
              </motion.div>

              {/* Solve Error Toast */}
              <AnimatePresence>
                {solveError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mt-4 py-2 px-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center"
                  >
                    <motion.span
                      animate={{ x: [0, -3, 3, -3, 3, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      {solveError}
                    </motion.span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Solve Message (11-letter solution) */}
              <AnimatePresence>
                {solveMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mt-4 py-2 px-4 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm text-center"
                  >
                    <span className="mr-2">⚠️</span>
                    {solveMessage}
                    <span className="ml-2 text-amber-500/60">(11/12 letters used)</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Auto-solved indicator - shows user they can interact */}
              <AnimatePresence>
                {autoSolved && gameState.isWon && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mt-4 py-2 px-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm text-center"
                  >
                    <span className="mr-2">✨</span>
                    Solution shown — click letters to experiment!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Word feedback */}
              {gameState.words.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex flex-wrap gap-2 justify-center"
                >
                  {gameState.words.map((word, idx) => {
                    // Three states: Scrabble-valid (green), ENABLE1-only (amber), Invalid (red)
                    let colorClass = '';
                    let icon = '';
                    let title = '';
                    
                    if (!word.isValid) {
                      colorClass = 'bg-red-500/20 text-red-400 border border-red-500/30';
                      icon = '✗';
                      title = 'Not a valid word';
                    } else if (!word.isScrabbleValid) {
                      colorClass = 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
                      icon = '⚠';
                      title = 'Valid, but not in Scrabble dictionary';
                    } else {
                      colorClass = 'bg-green-500/20 text-green-400 border border-green-500/30';
                      icon = '✓';
                      title = 'Valid Scrabble word';
                    }
                    
                    return (
                      <motion.span
                        key={`${word.word}-${idx}`}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
                        title={title}
                      >
                        {word.word} {icon}
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}

              {/* Hint when close */}
              {placedCount === 12 && !gameState.isWon && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-amber-400 text-sm mt-4"
                >
                  Almost there! Check for invalid words or disconnected letters.
                </motion.p>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Win Modal - only show for manual wins, not auto-solved */}
      {gameState && (
        <WinModal
          isOpen={gameState.isWon && !autoSolved}
          words={gameState.words}
          time={timer}
          onNewGame={handleNewGame}
        />
      )}
      
      {/* Stats Modal */}
      {stats && (
        <StatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          stats={stats}
        />
      )}
      
      {/* Milestone Toast */}
      <MilestoneToast
        milestoneId={currentMilestone}
        onDismiss={() => setCurrentMilestone(null)}
      />

      {/* Instructions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-4 left-4 right-4 text-center text-slate-500 text-xs"
      >
        Drag or click letters to place • Click placed letters to remove • All words must be 3+ letters
      </motion.div>
    </div>
  );
}
