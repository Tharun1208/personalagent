'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export default function SplashScreen({
  onFinish,
  durationMs = 1200,
}: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onFinish) {
        onFinish();
      }
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="app-splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-(--bg-primary) select-none"
        >
          {/* Ambient soft glow backdrop */}
          <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-[#4E82EE]/15 to-[#9B72CF]/15 blur-3xl pointer-events-none" />

          {/* Centered App Icon with Native Launch Animation */}
          <div className="relative flex flex-col items-center justify-center gap-5">
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-2xl shadow-[#4E82EE]/25 ring-1 ring-white/10 bg-(--bg-card) flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Assistance AI"
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            </motion.div>

            {/* App Title & Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col items-center text-center gap-1"
            >
              <h1 className="text-xl font-bold tracking-tight text-(--text-primary)">
                Assistance AI
              </h1>
              <p className="text-xs font-medium text-(--text-muted) tracking-wide">
                Your Intelligent Copilot
              </p>
            </motion.div>
          </div>

          {/* Sleek bottom loader line */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.7, ease: 'easeInOut' }}
            className="absolute bottom-12 w-28 h-1 rounded-full bg-gradient-to-r from-[#4E82EE] via-[#9B72CF] to-[#4E82EE] overflow-hidden"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-full h-full bg-white/40"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
