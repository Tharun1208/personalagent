'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { useApp } from '@/lib/context/AppContext';
import Sidebar from '@/components/sidebar/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import CalendarLightView from '@/components/calendar/CalendarLightView';
import ChatView from '@/components/chat/ChatView';
import TasksView from '@/components/tasks/TasksView';
import NotesView from '@/components/notes/NotesView';
import ActivityLogView from '@/components/activity/ActivityLogView';
import DashboardView from '@/components/dashboard/DashboardView';
import DynamicAppsView from '@/components/apps/DynamicAppsView';
import SettingsView from '@/components/settings/SettingsView';
import LedgerView from '@/components/ledger/LedgerView';
import NotificationsView from '@/components/notifications/NotificationsView';
import AuthModal from '@/components/auth/AuthModal';
import CommandPalette from '@/components/common/CommandPalette';
import NotificationDrawer from '@/components/common/NotificationDrawer';

import CustomConfirmModal from '@/components/common/CustomConfirmModal';
import CustomToastAlert from '@/components/common/CustomToastAlert';
import SplashScreen from '@/components/common/SplashScreen';
import SecurityLockScreen from '@/components/common/SecurityLockScreen';
import MobileTabBar from '@/components/layout/MobileTabBar';
import { apiFetch } from '@/lib/api';

export default function AppLayout() {
  const {
    activeTab,
    setActiveTab,
    authModalOpen,
    setAuthModalOpen,
    user,
    continueAsGuest,
    toasts,
    dismissToast,
    confirmDialog,
    dismissConfirm,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [swipeX, setSwipeX] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'none' | 'left' | 'right'>('none');
  const swipeRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 30;

  // â”€â”€ SSR-safe mount gate (no localStorage on server) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [mounted, setMounted] = useState(false);
  const [storageDegraded, setStorageDegraded] = useState(false);
  const [storageBannerDismissed, setStorageBannerDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-continue as guest in background if no token exists yet
    const hasToken = !!localStorage.getItem('recall_token');
    if (!hasToken) {
      continueAsGuest().catch(() => {});
    }
  }, [continueAsGuest, mounted]);

  // ── Storage health: warn when the configured database is unreachable ──
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const checkStorage = async () => {
      try {
        const res = await apiFetch('/api/db/status');
        const data = await res.json();
        if (!cancelled) setStorageDegraded(Boolean(data?.degraded));
      } catch {
        /* status endpoint itself unreachable — leave banner as-is */
      }
    };

    checkStorage();
    const timer = setInterval(checkStorage, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mounted]);

  // ── Tab history initialization ────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const storedHistory = localStorage.getItem('tabHistory');
    if (!storedHistory) {
      localStorage.setItem('tabHistory', JSON.stringify(['dashboard']));
    }
  }, [mounted]);

  // ── When activeTab changes, record the history ────────────────────────
  useEffect(() => {
    if (!mounted) return;
    const history: string[] = JSON.parse(localStorage.getItem('tabHistory') || '["dashboard"]');
    if (history[history.length - 1] !== activeTab) {
      history.push(activeTab);
      localStorage.setItem('tabHistory', JSON.stringify(history));
    }
  }, [activeTab, mounted]);

  // ── Mobile System / Hardware Back Button Navigation Handler ───────────
  useEffect(() => {
    if (!mounted) return;

    let backListener: any = null;

    const setupListener = async () => {
      try {
        backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          // 1. If mobile drawer sidebar is open, close it
          if (mobileMenuOpen) {
            setMobileMenuOpen(false);
            return;
          }

          // 2. If Auth modal is open, close it
          if (authModalOpen) {
            setAuthModalOpen(false);
            return;
          }

          // 3. If any DOM modal / dialog is active, let browser or modal handle it
          const openDialog = document.querySelector('[role="dialog"], [data-modal-backdrop="true"]');
          if (openDialog) {
            return;
          }

          // 4. Tab history back-navigation
          try {
            const raw = localStorage.getItem('tabHistory');
            const history: string[] = raw ? JSON.parse(raw) : ['dashboard'];
            if (history.length > 1) {
              history.pop(); // remove current tab
              const prevTab = history[history.length - 1] || 'dashboard';
              localStorage.setItem('tabHistory', JSON.stringify(history));
              setActiveTab(prevTab as any);
              return;
            }
          } catch {
            // fallback
          }

          // 5. If already on dashboard or no more history, exit or minimize
          if (activeTab !== 'dashboard') {
            setActiveTab('dashboard');
            return;
          }

          // At root dashboard: minimize or exit app
          CapApp.exitApp();
        });
      } catch (err) {
        console.warn('Capacitor backButton not available on web:', err);
      }
    };

    setupListener();

    // Also support standard browser popstate
    const handlePopState = (e: PopStateEvent) => {
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
        return;
      }
      try {
        const raw = localStorage.getItem('tabHistory');
        const history: string[] = raw ? JSON.parse(raw) : ['dashboard'];
        if (history.length > 1) {
          history.pop();
          const prevTab = history[history.length - 1] || 'dashboard';
          localStorage.setItem('tabHistory', JSON.stringify(history));
          setActiveTab(prevTab as any);
        }
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
      window.removeEventListener('popstate', handlePopState);
    };
  }, [mounted, mobileMenuOpen, authModalOpen, activeTab, setActiveTab, setMobileMenuOpen, setAuthModalOpen]);

  if (!mounted) {
    return null;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'calendar':      return <CalendarLightView />;
      case 'chat':          return <ChatView />;
      case 'tasks':         return <TasksView />;
      case 'notes':         return <NotesView />;
      case 'ledger':        return <LedgerView />;
      case 'actions':       return <ActivityLogView />;
      case 'dashboard':     return <DashboardView />;
      case 'apps':          return <DynamicAppsView />;
      case 'settings':      return <SettingsView />;
      case 'notifications': return <NotificationsView />;
      default:              return <DashboardView />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex h-[100dvh] w-screen overflow-hidden bg-[#F5F6F8] text-(--text-primary) relative font-sans"
    >

      {/* Desktop Left Sidebar */}
      {/* ── Soft Clean Atmosphere Mesh (Subtle airy undertones) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[12%] -left-[10%] w-[550px] h-[550px] rounded-full bg-emerald-100/35 blur-[100px] transform-gpu" />
        <div className="absolute top-[25%] -right-[15%] w-[550px] h-[550px] rounded-full bg-indigo-100/35 blur-[100px] transform-gpu" />
        <div className="absolute -bottom-[15%] right-[10%] w-[550px] h-[550px] rounded-full bg-amber-100/30 blur-[100px] transform-gpu" />
      </div>

      <div className="hidden md:flex shrink-0 relative z-20">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        />
      </div>


      {/* Mobile Drawer Sidebar â€” slides in from left */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-[272px] sm:w-[288px] h-full bg-white/92 backdrop-blur-2xl border-r border-white/60 shadow-2xl flex flex-col relative z-10"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
            >
              <div className="flex-1 overflow-y-auto no-scrollbar h-full">
                <Sidebar onClose={() => setMobileMenuOpen(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-10">
        <TopNavbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        {storageDegraded && !storageBannerDismissed && (
          <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs sm:text-sm">
            <span className="shrink-0">⚠️</span>
            <p className="flex-1 leading-snug">
              <strong>Storage is offline.</strong> Tasks, reminders, ledger and expenses may not load or save.
              Fix the database connection (<code className="font-mono">MONGODB_URI</code>) in your deployment environment.
            </p>
            <button
              onClick={() => setStorageBannerDismissed(true)}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-amber-800 hover:bg-amber-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 14, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.995 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden w-full"
              onPointerDown={(e) => {
                setSwipeX(e.clientX);
                setSwipeDirection('none');
              }}
              onPointerMove={(e) => {
                if (swipeX && swipeDirection === 'none') {
                  const diff = e.clientX - swipeX;
                  if (Math.abs(diff) > SWIPE_THRESHOLD) {
                    setSwipeDirection(diff > 0 ? 'right' : 'left');
                  }
                }
              }}
              onPointerUp={() => {
                if (swipeDirection === 'right' && mobileMenuOpen) {
                  setMobileMenuOpen(false);
                }
                setSwipeX(0);
                setSwipeDirection('none');
              }}
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
        {/* Native Mobile Bottom Navigation Bar - hidden when sidebar drawer is open */}
        {!mobileMenuOpen && (
          <MobileTabBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        )}
      </div>

      {/* Global Modals / Drawers / Widgets */}
      <CommandPalette />
      <NotificationDrawer />


      {/* Global in-app confirm dialog */}
      <CustomConfirmModal dialog={confirmDialog} onClose={dismissConfirm} />

      {/* Global in-app toast alerts */}
      <CustomToastAlert toasts={toasts} onDismiss={dismissToast} />

      {/* Native App Opening Splash Animation */}
      <SplashScreen durationMs={2400} />

      {/* 4-Digit Security PIN App Lock Screen */}
      <SecurityLockScreen />

      {/* Authentication Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </motion.div>
  );
}
