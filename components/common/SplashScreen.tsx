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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none pointer-events-none"
        >
          {/* Ambient subtle luminous glow aura */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: phase === 'slide-up' ? 0 : 0.8 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-96 h-96 rounded-full bg-gradient-to-tr from-blue-100/60 via-indigo-50/50 to-purple-100/40 blur-3xl pointer-events-none"
          />

          {/* Logo + App Name Container */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{
              opacity: phase === 'slide-up' ? 0 : 1,
              y: phase === 'slide-up' ? -140 : 0,
              scale: phase === 'slide-up' ? 0.92 : 1,
            }}
            transition={{
              duration: 0.7,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative flex flex-col items-center justify-center gap-6 text-center z-10 px-4"
          >
            {/* Logo Squircle */}
            <motion.div
              initial={{ scale: 0.7, rotate: -6 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 240,
                damping: 20,
                duration: 0.8,
              }}
              className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(37,99,235,0.18),0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100 bg-white flex items-center justify-center p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Assistance"
                className="w-full h-full object-contain select-none pointer-events-none rounded-2xl"
              />
            </motion.div>

            {/* App Name Below Logo */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: phase === 'slide-up' ? 0 : 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: 'easeOut' }}
              className="flex flex-col items-center gap-1.5"
            >
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
                Assistance
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 tracking-wide">
                Your Personal AI Companion
              </p>
            </motion.div>
          </motion.div>

          {/* Google-Style 4-Color Animated Bouncing Dots & Minimal Loading Bar */}
          <div className="absolute bottom-14 flex flex-col items-center gap-4">
            {/* 4 Google-style colored pulsing dots */}
            <div className="flex items-center gap-2.5">
              <motion.span
                animate={{
                  y: [0, -9, 0],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.9,
                  ease: 'easeInOut',
                  delay: 0,
                }}
                className="w-3 h-3 rounded-full bg-[#4285F4] shadow-sm shadow-blue-500/40"
              />
              <motion.span
                animate={{
                  y: [0, -9, 0],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.9,
                  ease: 'easeInOut',
                  delay: 0.18,
                }}
                className="w-3 h-3 rounded-full bg-[#EA4335] shadow-sm shadow-red-500/40"
              />
              <motion.span
                animate={{
                  y: [0, -9, 0],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.9,
                  ease: 'easeInOut',
                  delay: 0.36,
                }}
                className="w-3 h-3 rounded-full bg-[#FBBC05] shadow-sm shadow-amber-500/40"
              />
              <motion.span
                animate={{
                  y: [0, -9, 0],
                  scale: [1, 1.25, 1],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.9,
                  ease: 'easeInOut',
                  delay: 0.54,
                }}
                className="w-3 h-3 rounded-full bg-[#34A853] shadow-sm shadow-emerald-500/40"
              />
            </div>

            {/* Micro loading progress pill */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: phase === 'slide-up' ? 0 : 1, scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="w-32 h-1 rounded-full bg-slate-100 overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                className="w-full h-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
