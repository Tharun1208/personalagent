'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calculator,
  Users,
  Timer,
  FileText,
  Droplets,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Copy,
  Check,
  Zap,
  ArrowRight,
  TrendingUp,
  CreditCard,
  DollarSign,
  Maximize2,
  Minimize2,
  Layers,
  Code,
  Flame,
} from 'lucide-react';
import { useApp } from '@/lib/context/AppContext';

type AppCategory = 'finance' | 'productivity' | 'wellness' | 'ai-sandbox';

interface MiniAppMeta {
  id: string;
  name: string;
  category: AppCategory;
  description: string;
  icon: React.ElementType;
  gradient: string;
  badge?: string;
}

const MINI_APPS: MiniAppMeta[] = [
  {
    id: 'ai-builder',
    name: 'AI App Generator',
    category: 'ai-sandbox',
    description: 'Prompt the AI to dynamically generate and execute custom live micro-tools on the fly.',
    icon: Sparkles,
    gradient: 'from-purple-500 via-indigo-500 to-blue-500',
    badge: 'AI LIVE',
  },
  {
    id: 'emi-calc',
    name: 'Smart Loan & EMI Calculator',
    category: 'finance',
    description: 'Calculate monthly EMIs, total interest, amortization breakdown, and SIP investment returns.',
    icon: Calculator,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'expense-splitter',
    name: 'Expense & Bill Splitter',
    category: 'finance',
    description: 'Split group expenses, dinners, and trips with exact settlements and who owes whom.',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'deep-timer',
    name: 'Focus Interval & Pomodoro',
    category: 'productivity',
    description: 'Customizable 25/50m focus rounds, short breaks, and ambient ticking sessions.',
    icon: Timer,
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'scratchpad',
    name: 'Instant Quick Scratchpad',
    category: 'productivity',
    description: 'Ultra-fast cloud-persisted markdown scratchpad for thoughts, drafts, and meeting logs.',
    icon: FileText,
    gradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 'hydration',
    name: 'Hydration & Daily Wellness',
    category: 'wellness',
    description: 'Track daily water intake, hydration goals, and smart interval intake reminders.',
    icon: Droplets,
    gradient: 'from-sky-500 to-blue-600',
  },
];

export default function DynamicAppsView() {
  const { setActiveTab, sendMessage } = useApp();
  const [selectedAppId, setSelectedAppId] = useState<string>('ai-builder');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AppCategory>('all');

  // ── 1. EMI Calculator State ──
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [interestRate, setInterestRate] = useState<number>(9.5);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(5);

  const calculateEmi = () => {
    const monthlyRate = interestRate / 12 / 100;
    const totalMonths = loanTenureYears * 12;
    if (monthlyRate === 0) {
      const emi = Math.round(loanAmount / totalMonths);
      return {
        monthlyEmi: emi,
        totalInterest: 0,
        totalPayment: loanAmount,
      };
    }
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const totalPayment = emi * totalMonths;
    const totalInterest = totalPayment - loanAmount;
    return {
      monthlyEmi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayment: Math.round(totalPayment),
    };
  };
  const emiStats = calculateEmi();

  // ── 2. Expense Splitter State ──
  const [splitBillAmount, setSplitBillAmount] = useState<number>(2400);
  const [peopleCount, setPeopleCount] = useState<number>(4);
  const [tipPct, setTipPct] = useState<number>(10);
  const [customMembers, setCustomMembers] = useState<string[]>(['Alex', 'Sam', 'Jordan', 'You']);
  const [newMemberName, setNewMemberName] = useState('');

  const tipAmount = Math.round((splitBillAmount * tipPct) / 100);
  const grandTotal = splitBillAmount + tipAmount;
  const perPerson = Math.round(grandTotal / (customMembers.length || 1));

  // ── 3. Quick Scratchpad State ──
  const [scratchContent, setScratchContent] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('assistance_quick_scratchpad');
      if (saved) setScratchContent(saved);
    } catch {}
  }, []);

  const handleSaveScratch = (val: string) => {
    setScratchContent(val);
    try {
      localStorage.setItem('assistance_quick_scratchpad', val);
    } catch {}
  };

  const handleCopyScratch = () => {
    navigator.clipboard.writeText(scratchContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ── 4. Hydration State ──
  const [waterGlasses, setWaterGlasses] = useState<number>(4);
  const dailyTargetGlasses = 8;

  // ── 5. AI Dynamic App Prompt State ──
  const [aiAppPrompt, setAiAppPrompt] = useState<string>('');
  const [aiSandboxCode, setAiSandboxCode] = useState<string>(`// Dynamic Micro-App Sandbox
// You can prompt the AI to generate any custom interactive tool.
function DynamicTipCalc() {
  const [subtotal, setSubtotal] = React.useState(1200);
  const [tip, setTip] = React.useState(15);
  const total = subtotal + (subtotal * tip) / 100;
  return (
    <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-center space-y-2">
      <h3 className="font-bold text-sm text-blue-400">⚡ Live Generated Tip Calculator</h3>
      <p className="text-2xl font-black font-mono">₹{total.toFixed(0)}</p>
      <div className="flex justify-center gap-2">
        {[10, 15, 20].map(t => (
          <button key={t} onClick={() => setTip(t)} className={\`px-2 py-1 text-xs rounded-lg \${tip === t ? 'bg-blue-600 text-white' : 'bg-white/10'}\`}>
            {t}%
          </button>
        ))}
      </div>
    </div>
  );
}`);

  const filteredApps = MINI_APPS.filter(
    (app) => selectedCategory === 'all' || app.category === selectedCategory
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-(--bg-primary) text-(--text-primary)">
      
      {/* Top Header */}
      <div className="px-4 py-3 sm:px-6 sm:h-16 border-b border-(--border-subtle) flex items-center justify-between shrink-0 bg-(--bg-primary)/95 backdrop-blur-md">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <Zap size={16} />
          </div>
          <div>
            <h1 className="app-page-title">
              Dynamic Apps & Tools
            </h1>
            <p className="app-page-subtitle">
              Interactive utilities, financial calculators & AI dynamic sandboxes
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setActiveTab('chat');
            sendMessage('Create a new dynamic interactive tool for my daily workflow.');
          }}
          className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 text-white text-[11px] sm:text-xs font-semibold hover:opacity-95 shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shrink-0"
        >
          <Sparkles size={13} />
          <span>Ask AI Tool</span>
        </button>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 max-w-6xl mx-auto w-full space-y-5 custom-scrollbar pb-32 sm:pb-36 md:pb-12">
        
        {/* Category Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'all', label: 'All Apps' },
            { id: 'ai-sandbox', label: '⚡ AI Sandbox' },
            { id: 'finance', label: '💰 Finance & Debt' },
            { id: 'productivity', label: '⏱️ Productivity' },
            { id: 'wellness', label: '💧 Wellness' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedCategory === cat.id
                  ? 'bg-[#4E82EE] text-white shadow-xs'
                  : 'bg-(--bg-card) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic App Cards Grid (Mobile 2-col / Desktop 3-col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredApps.map((app) => {
            const Icon = app.icon;
            const isSelected = selectedAppId === app.id;
            return (
              <div
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 group active:scale-98 ${
                  isSelected
                    ? 'border-[#4E82EE] bg-[#4E82EE]/5 shadow-sm ring-2 ring-[#4E82EE]/20'
                    : 'border-(--border-subtle) bg-(--bg-card) hover:border-(--border-medium)'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${app.gradient} text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon size={19} />
                  </div>
                  {app.badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {app.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="app-card-title group-hover:text-[#4E82EE] transition-colors">
                    {app.name}
                  </h3>
                  <p className="app-card-subtitle line-clamp-2 mt-1 leading-relaxed">
                    {app.description}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-[#4E82EE] pt-1">
                  <span>{isSelected ? 'Active App' : 'Launch App'}</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Active App Interactive Workspace ── */}
        <div className="p-5 sm:p-6 rounded-3xl bg-(--bg-card) border border-(--border-subtle) shadow-xs space-y-5">
          
          {/* 1. AI Sandbox Live Generator */}
          {selectedAppId === 'ai-builder' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">AI Dynamic App Sandbox</h3>
                    <p className="app-card-subtitle">Generate and run bespoke micro-apps instantly</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                  JS / REACT LIVE
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiAppPrompt}
                  onChange={(e) => setAiAppPrompt(e.target.value)}
                  placeholder="e.g. Create a currency converter, custom habit graph, or debt payback simulator..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) focus:border-[#4E82EE] focus:outline-hidden"
                />
                <button
                  onClick={() => {
                    setActiveTab('chat');
                    sendMessage(`Generate a dynamic interactive application for: "${aiAppPrompt || 'Quick Daily Workout Stopwatch and Reps Counter'}"`);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-[#4E82EE] text-white text-xs font-semibold cursor-pointer active:scale-95 shrink-0 flex items-center gap-1.5"
                >
                  <Zap size={14} />
                  <span>Generate</span>
                </button>
              </div>

              {/* Code / Preview Card */}
              <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-(--text-muted)">
                  <span className="flex items-center gap-1.5">
                    <Code size={13} className="text-[#4E82EE]" />
                    Interactive Live Sandbox Component
                  </span>
                </div>

                {/* Rendered Live Component */}
                <div className="p-4 bg-(--bg-card) rounded-xl border border-(--border-subtle) text-center space-y-3">
                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                    <Zap size={12} />
                    <span>Dynamic Live Sandbox Active</span>
                  </div>
                  <p className="text-xs text-(--text-secondary)">
                    Tip: Ask the AI in chat anytime: <em>&ldquo;Build me a dynamic tool for X&rdquo;</em> and it will compile and render it right here!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. EMI & Loan Calculator */}
          {selectedAppId === 'emi-calc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                    <Calculator size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">Smart Loan & EMI Calculator</h3>
                    <p className="app-card-subtitle">Accurate monthly payments & interest analytics</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1.5">
                  <label className="text-[11px] font-semibold text-(--text-muted)">Loan Amount (₹)</label>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full text-base font-black font-mono bg-(--bg-card) px-3 py-2 rounded-xl border border-(--border-subtle) text-(--text-primary) focus:outline-hidden"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1.5">
                  <label className="text-[11px] font-semibold text-(--text-muted)">Annual Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full text-base font-black font-mono bg-(--bg-card) px-3 py-2 rounded-xl border border-(--border-subtle) text-(--text-primary) focus:outline-hidden"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1.5">
                  <label className="text-[11px] font-semibold text-(--text-muted)">Tenure (Years)</label>
                  <input
                    type="number"
                    value={loanTenureYears}
                    onChange={(e) => setLoanTenureYears(Number(e.target.value))}
                    className="w-full text-base font-black font-mono bg-(--bg-card) px-3 py-2 rounded-xl border border-(--border-subtle) text-(--text-primary) focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Calculated Results */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-1">
                  <span className="text-[11px] font-semibold text-blue-400">Monthly EMI</span>
                  <p className="text-2xl font-black text-[#4E82EE] font-mono">₹{emiStats.monthlyEmi.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1">
                  <span className="text-[11px] font-semibold text-rose-400">Total Interest Payable</span>
                  <p className="text-2xl font-black text-rose-500 font-mono">₹{emiStats.totalInterest.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400">Total Overall Payment</span>
                  <p className="text-2xl font-black text-emerald-500 font-mono">₹{emiStats.totalPayment.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Expense & Bill Splitter */}
          {selectedAppId === 'expense-splitter' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">Group Bill & Expense Splitter</h3>
                    <p className="app-card-subtitle">Equal & fair division with automatic tip calculation</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                  <label className="text-[11px] font-semibold text-(--text-muted)">Bill Amount (₹)</label>
                  <input
                    type="number"
                    value={splitBillAmount}
                    onChange={(e) => setSplitBillAmount(Number(e.target.value))}
                    className="w-full text-base font-black font-mono bg-(--bg-card) px-3 py-2 rounded-xl border border-(--border-subtle) text-(--text-primary) focus:outline-hidden"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-1">
                  <label className="text-[11px] font-semibold text-(--text-muted)">Tip / Service Charge (%)</label>
                  <div className="flex gap-1.5">
                    {[0, 5, 10, 15].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTipPct(t)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition-colors cursor-pointer ${
                          tipPct === t ? 'bg-emerald-600 text-white' : 'bg-(--bg-card) text-(--text-secondary)'
                        }`}
                      >
                        {t}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400">Each Person Pays</span>
                  <p className="text-2xl font-black text-emerald-500 font-mono">₹{perPerson.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Members List */}
              <div className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-(--text-primary)">Group Members ({customMembers.length})</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="Add person..."
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-(--bg-card) border border-(--border-subtle) text-(--text-primary) w-28 focus:outline-hidden"
                    />
                    <button
                      onClick={() => {
                        if (newMemberName.trim()) {
                          setCustomMembers([...customMembers, newMemberName.trim()]);
                          setNewMemberName('');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {customMembers.map((m, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-xl bg-(--bg-card) border border-(--border-subtle) text-xs font-semibold flex items-center gap-2">
                      <span>{m}</span>
                      <span className="text-[10px] text-emerald-500 font-mono font-bold">₹{perPerson}</span>
                      {customMembers.length > 2 && (
                        <button
                          onClick={() => setCustomMembers(customMembers.filter((_, idx) => idx !== i))}
                          className="text-(--text-muted) hover:text-rose-500 cursor-pointer ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 4. Instant Quick Scratchpad */}
          {selectedAppId === 'scratchpad' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-500 text-white flex items-center justify-center">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">Instant Quick Scratchpad</h3>
                    <p className="app-card-subtitle">Auto-saved markdown notes and rapid thoughts</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScratch}
                    className="px-3 py-1.5 rounded-xl bg-(--bg-elevated) border border-(--border-subtle) text-xs font-semibold flex items-center gap-1.5 text-(--text-primary) hover:border-[#4E82EE] cursor-pointer"
                  >
                    {isCopied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <textarea
                value={scratchContent}
                onChange={(e) => handleSaveScratch(e.target.value)}
                placeholder="Type your notes, thoughts, rapid meeting bullet points, or code snippets here... Auto-persisted."
                rows={9}
                className="w-full p-3.5 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) text-xs text-(--text-primary) font-mono leading-relaxed focus:border-[#4E82EE] focus:outline-hidden resize-y"
              />
            </div>
          )}

          {/* 5. Hydration & Daily Wellness */}
          {selectedAppId === 'hydration' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                    <Droplets size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">Daily Hydration Tracker</h3>
                    <p className="app-card-subtitle">Log your water intake to stay sharp and energized</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-sky-400">Daily Intake Progress</span>
                  <p className="text-3xl font-black text-sky-500 font-mono">
                    {waterGlasses} / {dailyTargetGlasses} Glasses
                  </p>
                  <p className="text-xs text-(--text-muted)">{(waterGlasses * 250).toLocaleString()} ml consumed today</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWaterGlasses((p) => Math.max(0, p - 1))}
                    className="p-3 rounded-2xl bg-(--bg-card) border border-(--border-subtle) text-base font-bold text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setWaterGlasses((p) => p + 1)}
                    className="px-5 py-3 rounded-2xl bg-sky-600 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <Plus size={16} />
                    <span>+1 Glass</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. Focus Timer / Pomodoro Launcher */}
          {selectedAppId === 'deep-timer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Timer size={16} />
                  </div>
                  <div>
                    <h3 className="app-card-title">Deep Focus & Pomodoro Blocks</h3>
                    <p className="app-card-subtitle">Launch dedicated focus intervals for peak flow</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { title: '25m Focus Block', desc: 'Standard Pomodoro round', mins: 25 },
                  { title: '50m Deep Work', desc: 'Extended deep coding/writing', mins: 50 },
                  { title: '15m Power Sprint', desc: 'Rapid task clearance', mins: 15 },
                ].map((b, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setActiveTab('dashboard');
                    }}
                    className="p-4 rounded-2xl bg-(--bg-elevated) border border-(--border-subtle) hover:border-amber-500/50 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                      <span>{b.mins} Minutes</span>
                      <Play size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <h4 className="text-xs font-bold text-(--text-primary)">{b.title}</h4>
                    <p className="text-[11px] text-(--text-muted)">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
