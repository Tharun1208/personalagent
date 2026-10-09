'use client';

import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import {
  Home,
  CheckSquare,
  FileText,
  Wallet,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

interface MobileTabBarProps {
  onOpenMobileMenu?: () => void;
}

interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  activeColor: string; // text & icon color
  activeBg: string;    // soft background pill
}

export default function MobileTabBar({ onOpenMobileMenu }: MobileTabBarProps = {}) {
  const { activeTab, setActiveTab } = useApp();

  const navItems: NavItem[] = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: Home,
      activeColor: 'text-[#5B37B7]',
      activeBg: 'bg-[#5B37B7]/15',
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      activeColor: 'text-[#C93B76]',
      activeBg: 'bg-[#C93B76]/15',
    },
    {
      key: 'ledger',
      label: 'Ledger',
      icon: Wallet,
      activeColor: 'text-[#0E9488]',
      activeBg: 'bg-[#0E9488]/15',
    },
    {
      key: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      activeColor: 'text-[#0284C7]',
      activeBg: 'bg-[#0284C7]/15',
    },
  ];

  return (
    <div className="md:hidden fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none safe-area-bottom select-none">
      
      {/* ── Exact Re-creation of original-fd08cffe70a8d2d872c30e33f6165690.gif ── */}
      <LayoutGroup id="animated-bottom-bar">
        <nav className="pointer-events-auto relative flex items-center justify-between bg-white px-3 py-2.5 rounded-[32px] shadow-[0_16px_40px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.03)] border border-slate-100 max-w-md w-full">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key as any)}
                className={`relative flex items-center justify-center py-2.5 rounded-full transition-colors duration-200 cursor-pointer active:scale-95 ${
                  isActive ? 'px-4' : 'px-3 text-slate-800 hover:text-slate-900'
                }`}
              >
                {/* Animated Sliding Pill Highlight */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 32,
                    }}
                    className={`absolute inset-0 rounded-full ${item.activeBg}`}
                  />
                )}

                {/* Content: Icon + Label (Label expands smoothly when active) */}
                <div
                  className={`relative z-10 flex items-center gap-2 ${
                    isActive ? item.activeColor : 'text-slate-800'
                  }`}
                >
                  <Icon
                    size={20}
                    className={`shrink-0 transition-transform duration-200 ${
                      isActive ? 'stroke-[2.5]' : 'stroke-[2]'
                    }`}
                  />

                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="text-[13.5px] font-bold tracking-tight whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </LayoutGroup>

    </div>
  );
}
