'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '@/lib/context/AppContext';
import Sidebar from '@/components/sidebar/Sidebar';
import TopNavbar from '@/components/layout/TopNavbar';
import ChatView from '@/components/chat/ChatView';
import CalendarView from '@/components/calendar/CalendarView';
import HabitsView from '@/components/habits/HabitsView';
import TasksView from '@/components/tasks/TasksView';
import RemindersView from '@/components/reminders/RemindersView';
import GoalsView from '@/components/goals/GoalsView';
import ActivityLogView from '@/components/activity/ActivityLogView';
import DashboardView from '@/components/dashboard/DashboardView';
import SettingsView from '@/components/settings/SettingsView';
import LedgerView from '@/components/ledger/LedgerView';
import CommandPalette from '@/components/common/CommandPalette';
import NotificationDrawer from '@/components/common/NotificationDrawer';
import NotificationAlertToast from '@/components/common/NotificationAlertToast';
import LiveVoiceModal from '@/components/voice/LiveVoiceModal';
import TimerWidget from '@/components/widgets/TimerWidget';
import AuthModal from '@/components/auth/AuthModal';
import AuthScreen from '@/components/auth/AuthScreen';
import CustomConfirmModal from '@/components/common/CustomConfirmModal';
import CustomToastAlert from '@/components/common/CustomToastAlert';

const GUEST_EMAILS = ['guest@assistance.ai', 'alex@example.com'];

export default function AppLayout() {
  const {
    activeTab,
    liveVoiceOpen,
    setLiveVoiceOpen,
    focusTimerOpen,
    setFocusTimerOpen,
    authModalOpen,
    setAuthModalOpen,
    user,
    isGuest,
    guestPromptsUsed,
    guestPromptLimit,
    toasts,
    dismissToast,
    confirmDialog,
    dismissConfirm,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [guestLimitHit, setGuestLimitHit] = useState(false);

  // ── SSR-safe auth gate ────────────────────────────────────────────────────
  // All localStorage reads MUST happen inside useEffect to avoid hydration
  // mismatch (server has no localStorage; client does).
  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    // A valid session exists only if BOTH a token and a cached user are present.
    // (Old sessions that only had `recall_onboarded` are treated as signed out.)
    setHasSession(!!localStorage.getItem('recall_token') && !!localStorage.getItem('recall_user'));
    setMounted(true);
  }, []);

  // Re-check session whenever user changes (e.g. after sign-in / sign-out)
  useEffect(() => {
    if (mounted) {
      setHasSession(!!localStorage.getItem('recall_token') && !!localStorage.getItem('recall_user'));
    }
  }, [user, mounted]);

  // If the guest burns all free prompts while inside the app, force the auth screen
  useEffect(() => {
    if (mounted && isGuest && user && guestPromptsUsed >= guestPromptLimit) {
      setGuestLimitHit(true);
    }
  }, [mounted, isGuest, user, guestPromptsUsed, guestPromptLimit]);

  // No session at all → AuthScreen (covers first visit AND post-sign-out)
  if (!mounted) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-(--bg-primary)">
        <div className="w-8 h-8 rounded-full border-2 border-(--border-subtle) border-t-[#4E82EE] animate-spin" />
      </div>
    );
  }

  if (!hasSession || !user) {
    return (
      <>
        <AuthScreen />
        <CustomConfirmModal dialog={confirmDialog} onClose={dismissConfirm} />
        <CustomToastAlert toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Guest who used up their free prompts → back to auth with a notice
  if (guestLimitHit) {
    return (
      <>
        <AuthScreen
          notice={`You've used all ${guestPromptLimit} free guest messages. Sign in or create an account to keep chatting — your sign-in will restore your saved history.`}
          hideGuest
        />
        <CustomConfirmModal dialog={confirmDialog} onClose={dismissConfirm} />
        <CustomToastAlert toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'chat':      return <ChatView />;
      case 'calendar':  return <CalendarView />;
      case 'habits':    return <HabitsView />;
      case 'tasks':     return <TasksView />;
      case 'reminders': return <RemindersView />;
      case 'goals':     return <GoalsView />;
      case 'ledger':    return <LedgerView />;
      case 'actions':   return <ActivityLogView />;
      case 'dashboard': return <DashboardView />;
      case 'settings':  return <SettingsView />;
      default:          return <ChatView />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-(--bg-primary) text-(--text-primary)">

      {/* Desktop Left Sidebar */}
      {!sidebarCollapsed && (
        <div className="hidden md:flex">
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(true)}
          />
        </div>
      )}

      {/* Mobile Drawer Sidebar — full screen, slides in/out */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="sidebar-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full h-full bg-(--bg-sidebar) shadow-2xl flex flex-col"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%', transition: { type: 'tween', duration: 0.22, ease: [0.4, 0, 1, 1] } }}
              transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }}
            >
              <motion.div
                className="flex-1 overflow-y-auto no-scrollbar"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <Sidebar onClose={() => setMobileMenuOpen(false)} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative">
        <TopNavbar
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((p) => !p)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 flex flex-col h-full overflow-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals / Drawers / Widgets */}
      <CommandPalette />
      <NotificationDrawer />
      <NotificationAlertToast />

      {/* AuthModal — still available from Settings > Security (signed-in view / sign-out) */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <LiveVoiceModal isOpen={liveVoiceOpen} onClose={() => setLiveVoiceOpen(false)} />

      {/* Global in-app confirm dialog */}
      <CustomConfirmModal dialog={confirmDialog} onClose={dismissConfirm} />

      {/* Global in-app toast alerts */}
      <CustomToastAlert toasts={toasts} onDismiss={dismissToast} />

      {focusTimerOpen && (
        <div className="fixed bottom-6 right-4 md:right-6 z-40 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <TimerWidget onClose={() => setFocusTimerOpen(false)} />
        </div>
      )}
    </div>
  );
}
