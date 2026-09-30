'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  Sparkles,
  ListTodo,
  Wallet,
  AlarmClock,
} from 'lucide-react';
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
import CustomConfirmModal from '@/components/common/CustomConfirmModal';
import CustomToastAlert from '@/components/common/CustomToastAlert';
import SplashScreen from '@/components/common/SplashScreen';

export default function AppLayout() {
  const {
    activeTab,
    setActiveTab,
    liveVoiceOpen,
    setLiveVoiceOpen,
    focusTimerOpen,
    setFocusTimerOpen,
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

  // ── SSR-safe mount gate (no localStorage on server) ──────────────────────
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-continue as guest in background if no token exists yet
    const hasToken = !!localStorage.getItem('recall_token');
    if (!hasToken) {
      continueAsGuest().catch(() => {});
    }
  }, [continueAsGuest]);

  if (!mounted) {
    return null;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex h-[100dvh] w-screen overflow-hidden bg-(--bg-primary) text-(--text-primary)"
    >

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
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6, scale: 0.998 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.998 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex-1 flex flex-col h-full overflow-hidden w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-(--bg-primary)/95 backdrop-blur-xl border-t border-(--border-subtle)/60 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Compass },
          { id: 'chat', label: 'Chat', icon: Sparkles },
          { id: 'tasks', label: 'Tasks', icon: ListTodo },
          { id: 'ledger', label: 'Dues & Spend', icon: Wallet },
          { id: 'reminders', label: 'Alarms', icon: AlarmClock },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer relative ${
                isActive
                  ? 'text-[#4E82EE] font-bold'
                  : 'text-(--text-muted) hover:text-(--text-primary)'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobileNavActivePill"
                  className="absolute inset-0 bg-[#4E82EE]/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={18} className={`relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5 relative z-10 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Global Modals / Drawers / Widgets */}
      <CommandPalette />
      <NotificationDrawer />
      <NotificationAlertToast />

      <LiveVoiceModal isOpen={liveVoiceOpen} onClose={() => setLiveVoiceOpen(false)} />

      {/* Global in-app confirm dialog */}
      <CustomConfirmModal dialog={confirmDialog} onClose={dismissConfirm} />

      {/* Global in-app toast alerts */}
      <CustomToastAlert toasts={toasts} onDismiss={dismissToast} />

      {focusTimerOpen && (
        <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-40 shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <TimerWidget onClose={() => setFocusTimerOpen(false)} />
        </div>
      )}

      {/* Native App Opening Splash Animation */}
      <SplashScreen durationMs={1100} />
    </motion.div>
  );
}
