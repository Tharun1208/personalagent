'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export default function SplashScreen({
  onFinish,
  durationMs = 1500,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'slide-up' | 'done'>('enter');

  useEffect(() => {
    // Stage 1: Logo & App name appear in center
    // Stage 2: Slide up towards the top
    const slideUpTimer = setTimeout(() => {
      setPhase('slide-up');
    }, durationMs - 500);

    // Stage 3: Finish and remove splash screen
    const finishTimer = setTimeout(() => {
      setPhase('done');
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(slideUpTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  if (phase === 'done') return null;

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          key="app-launch-splash"
          initial={{ opacity: 1 }}
          animate={{
            opacity: phase === 'slide-up' ? 0 : 1,
            y: phase === 'slide-up' ? '-100%' : '0%',
          }}
          exit={{
            opacity: 0,
            y: '-100%',
          }}
          transition={{
            duration: 0.55,
            ease: [0.32, 0.72, 0, 1], // Smooth iOS-like curve
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-(--bg-primary) select-none pointer-events-none"
        >
          {/* Ambient luminous aura */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.6 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#4E82EE]/25 via-[#9B72CF]/20 to-teal-400/20 blur-3xl pointer-events-none"
          />

          {/* Logo + App Name Container */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{
              opacity: 1,
              y: phase === 'slide-up' ? -120 : 0,
              scale: phase === 'slide-up' ? 0.9 : 1,
            }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col items-center justify-center gap-4 text-center z-10"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.7, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 260,
                damping: 20,
              }}
              className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-[#4E82EE]/30 ring-1 ring-white/15 bg-(--bg-card) flex items-center justify-center p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Assistance AI"
                className="w-full h-full object-contain select-none pointer-events-none rounded-2xl"
              />
            </motion.div>

            {/* App Name Below Logo */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center gap-1"
            >
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] bg-clip-text text-transparent">
                Assistance AI
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-(--text-muted) tracking-wide">
                Your Personal AI Companion
              </p>
            </motion.div>
          </motion.div>

          {/* Bottom pulse bar */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: phase === 'slide-up' ? 0 : 1, scaleX: 1 }}
            transition={{ delay: 0.25, duration: 0.6, ease: 'easeInOut' }}
            className="absolute bottom-12 w-32 h-1 rounded-full bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] overflow-hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
              className="w-full h-full bg-white/60"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
