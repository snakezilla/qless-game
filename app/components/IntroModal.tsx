'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroModalProps {
  onComplete: () => void;
}

const STORAGE_KEY = 'qless-intro-seen';

export default function IntroModal({ onComplete }: IntroModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Check if user has seen intro before
    const hasSeenIntro = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenIntro) {
      setIsOpen(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    onComplete();
  };

  const steps = [
    {
      icon: '🎲',
      title: 'Welcome to Q-Less',
      description: 'A crossword solitaire puzzle where you arrange 12 letter dice into connected words.',
    },
    {
      icon: '👆',
      title: 'Tap to Place',
      description: 'Tap any letter to instantly place it on the grid. The game finds a smart starting spot for you.',
    },
    {
      icon: '✋',
      title: 'Drag to Move',
      description: 'Double-tap a placed letter to pick it up, then drag it anywhere. Or just tap placed letters to return them to the tray.',
    },
    {
      icon: '✨',
      title: 'Form Words',
      description: 'All letters must connect in valid 3+ letter words, crossword-style. Green = valid, red = try again.',
    },
  ];

  const currentStep = steps[step];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden"
          >
            {/* Progress dots */}
            <div className="flex justify-center gap-2 pt-6 pb-2">
              {steps.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    idx === step
                      ? 'bg-blue-400 w-6'
                      : idx < step
                      ? 'bg-blue-400/50'
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="px-8 py-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.5 }}
                    className="text-6xl mb-4"
                  >
                    {currentStep.icon}
                  </motion.div>
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {currentStep.title}
                  </h2>
                  <p className="text-slate-400 leading-relaxed">
                    {currentStep.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Buttons */}
            <div className="px-8 pb-8 flex gap-3">
              {step > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 transition-all"
                >
                  Back
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (step < steps.length - 1) {
                    setStep(step + 1);
                  } else {
                    handleComplete();
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/25 transition-all"
              >
                {step < steps.length - 1 ? 'Next' : "Let's Play!"}
              </motion.button>
            </div>

            {/* Skip link */}
            {step < steps.length - 1 && (
              <div className="pb-6 text-center">
                <button
                  onClick={handleComplete}
                  className="text-slate-500 text-sm hover:text-slate-400 transition-colors"
                >
                  Skip intro
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
