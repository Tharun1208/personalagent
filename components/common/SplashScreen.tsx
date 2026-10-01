'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export default function SplashScreen({
  onFinish,
  durationMs = 2400,
}: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'slide-up' | 'done'>('enter');

  useEffect(() => {
    // Stage 1: Logo and app name emerge, settle, and display completely in center (0 - 1650ms)
    // Stage 2: Logo and app name glide gracefully upwards towards the top (1650ms - 2400ms)
    const slideUpTimer = setTimeout(() => {
      setPhase('slide-up');
    }, Math.max(1200, durationMs - 750));

    // Stage 3: Smooth handoff to the Dashboard (2400ms)
    const finishTimer = setTimeout(() => {
      setPhase('done');
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(slideUpTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

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
            duration: 0.75,
            ease: [0.22, 1, 0.36, 1], // Luxurious smooth iOS spring curve
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-(--bg-primary) select-none pointer-events-none"
        >
          {/* Ambient luminous glow aura */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1.2, opacity: phase === 'slide-up' ? 0 : 0.7 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-96 h-96 rounded-full bg-gradient-to-tr from-[#4E82EE]/30 via-[#9B72CF]/25 to-teal-400/20 blur-3xl pointer-events-none"
          />

          {/* Logo + App Name Container */}
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.8 }}
            animate={{
              opacity: phase === 'slide-up' ? 0 : 1,
              y: phase === 'slide-up' ? -150 : 0,
              scale: phase === 'slide-up' ? 0.9 : 1,
            }}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col items-center justify-center gap-5 text-center z-10"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.6, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 18,
                duration: 0.8,
              }}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden shadow-2xl shadow-[#4E82EE]/35 ring-1 ring-white/20 bg-(--bg-card) flex items-center justify-center p-1.5"
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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: phase === 'slide-up' ? 0 : 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col items-center gap-1.5"
            >
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] bg-clip-text text-transparent">
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
            transition={{ delay: 0.35, duration: 0.8, ease: 'easeInOut' }}
            className="absolute bottom-12 w-36 h-1 rounded-full bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] overflow-hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}
              className="w-full h-full bg-white/60"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
