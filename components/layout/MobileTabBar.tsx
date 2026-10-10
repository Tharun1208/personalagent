'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  Home,
  CheckSquare,
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
  const {
    activeTab,
    setActiveTab,
    authModalOpen,
    commandPaletteOpen,
    notificationDrawerOpen,
    confirmDialog,
  } = useApp();

  const [hasDomModal, setHasDomModal] = useState(false);

  // Check for any open pop-up / modal in context or DOM
  useEffect(() => {
    const checkDomModals = () => {
      // Find any modal backdrops or active dialogs in the DOM
      const backdrops = document.querySelectorAll(
        '.fixed.inset-0:not(.pointer-events-none):not(#animated-bottom-bar-container), [role="dialog"], [data-modal-backdrop="true"], .animate-top-modal'
      );
      let isOpen = false;
      backdrops.forEach((el) => {
        // Exclude the bottom bar itself
        if (el.closest('#animated-bottom-bar-container')) return;
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          isOpen = true;
        }
      });
      setHasDomModal(isOpen);
    };

    // Initial check
    checkDomModals();

    // DOM observer to react immediately when modals are mounted/unmounted
    const observer = new MutationObserver(checkDomModals);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-modal-backdrop'],
    });

    const handleCustomEvent = (e: any) => {
      if (e.detail && typeof e.detail.open === 'boolean') {
        setHasDomModal(e.detail.open);
      }
    };

    window.addEventListener('app_modal_state', handleCustomEvent);

    return () => {
      observer.disconnect();
      window.removeEventListener('app_modal_state', handleCustomEvent);
    };
  }, []);

  // Is any modal currently open or is active view one that hides bottom bar?
  const isAnyModalOpen =
    hasDomModal ||
    authModalOpen ||
    commandPaletteOpen ||
    notificationDrawerOpen ||
    !!confirmDialog?.isOpen ||
    activeTab === 'notifications';

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
    <AnimatePresence>
      {!isAnyModalOpen && (
        <>
          {/* Ambient Frosted Blur below and behind the floating navigation bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed bottom-0 left-0 right-0 h-24 pointer-events-none z-30 bg-gradient-to-t from-white/90 via-white/40 to-transparent backdrop-blur-sm"
          />

          <motion.div
            id="animated-bottom-bar-container"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden fixed bottom-5 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none safe-area-bottom select-none"
          >
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
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
