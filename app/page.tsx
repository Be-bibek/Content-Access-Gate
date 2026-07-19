'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useWalletStore } from '@/lib/store';
import { PREMIUM_ARTICLES, Article } from '@/lib/articles';
import { triggerHaptic } from '@/lib/utils';
import { UNLOCK_FEE_XLM, PLATFORM_RECEIVER_ADDRESS } from '@/lib/stellar';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Unlock, 
  Wallet, 
  Sun, 
  Moon, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  User, 
  ChevronRight, 
  RefreshCw, 
  ExternalLink, 
  Share2, 
  Layers, 
  Terminal, 
  AlertTriangle, 
  CornerDownRight, 
  Menu, 
  X, 
  Coffee,
  Heart
} from 'lucide-react';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSandboxConsole, setShowSandboxConsole] = useState(false);

  // Zustand Store
  const {
    publicKey,
    walletType,
    balance,
    isUnlocked,
    isLoading,
    error,
    txHash,
    activeArticleId,
    connectFreighter,
    connectSandbox,
    fundSandbox,
    refreshBalance,
    submitUnlockPayment,
    setActiveArticleId,
    setError,
    resetUnlocked,
    disconnect
  } = useWalletStore();

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync wallet balance periodically
  useEffect(() => {
    if (publicKey) {
      const interval = setInterval(() => {
        refreshBalance();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [publicKey, refreshBalance]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-mono">Initializing ledger...</span>
        </div>
      </div>
    );
  }

  const activeArticle = PREMIUM_ARTICLES.find(a => a.id === activeArticleId) || PREMIUM_ARTICLES[0];

  const handleConnectFreighter = async () => {
    triggerHaptic('light');
    await connectFreighter();
  };

  const handleConnectSandbox = async () => {
    triggerHaptic('medium');
    await connectSandbox();
  };

  const handleFundSandbox = async () => {
    triggerHaptic('light');
    await fundSandbox();
  };

  const handleUnlockPayment = async () => {
    triggerHaptic('medium');
    const success = await submitUnlockPayment();
    if (success) {
      triggerHaptic('success');
    } else {
      triggerHaptic('error');
    }
  };

  const handleArticleSelect = (id: string) => {
    triggerHaptic('light');
    setActiveArticleId(id);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    triggerHaptic('light');
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleManualUnlockToggle = () => {
    triggerHaptic('medium');
    useWalletStore.setState({ isUnlocked: !isUnlocked });
  };

  // Helper to render custom markdown styled paragraph elements for premium reading experience
  const renderPremiumMarkdown = (markdown: string) => {
    const lines = markdown.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Headings
      if (trimmed.startsWith('###')) {
        inTable = false;
        return (
          <h3 key={idx} className="text-2xl font-display font-semibold mt-10 mb-4 text-foreground tracking-tight scroll-mt-20">
            {trimmed.replace('###', '').trim()}
          </h3>
        );
      }

      // Divider
      if (trimmed === '---') {
        inTable = false;
        return <hr key={idx} className="my-10 border-border opacity-60" />;
      }

      // Ordered list
      if (/^\d+\.\s/.test(trimmed)) {
        inTable = false;
        const text = trimmed.replace(/^\d+\.\s/, '').trim();
        // Highlight bullet parts
        const parts = text.split(':');
        return (
          <div key={idx} className="flex gap-3 my-4 pl-2">
            <span className="font-mono text-primary font-bold">{trimmed.match(/^\d+\./)?.[0]}</span>
            <p className="text-base leading-relaxed text-muted-foreground">
              {parts.length > 1 ? (
                <>
                  <strong className="text-foreground font-medium">{parts[0]}:</strong>
                  {parts.slice(1).join(':')}
                </>
              ) : text}
            </p>
          </div>
        );
      }

      // Unordered list
      if (trimmed.startsWith('-')) {
        inTable = false;
        const text = trimmed.replace(/^-/, '').trim();
        return (
          <div key={idx} className="flex gap-3 my-3 pl-4">
            <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
            <p className="text-base leading-relaxed text-muted-foreground">{text}</p>
          </div>
        );
      }

      // Table parsing
      if (trimmed.startsWith('|')) {
        const rowCells = trimmed.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (trimmed.includes('---')) {
          // Separator row
          return null;
        }
        if (!inTable) {
          inTable = true;
          tableHeaders = rowCells;
          return null;
        } else {
          tableRows.push(rowCells);
          // If next line is empty or doesn't start with |, render table
          const nextLine = lines[idx + 1]?.trim();
          if (!nextLine || !nextLine.startsWith('|')) {
            inTable = false;
            const headers = [...tableHeaders];
            const rows = [...tableRows];
            tableHeaders = [];
            tableRows = [];
            return (
              <div key={idx} className="overflow-x-auto my-8 border border-border rounded-xl">
                <table className="w-full text-left border-collapse font-sans text-sm">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      {headers.map((h, i) => (
                        <th key={i} className="px-5 py-3 font-semibold text-foreground tracking-tight">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                        {r.map((c, ci) => (
                          <td key={ci} className="px-5 py-3 text-muted-foreground font-mono">
                            {c.includes('**') ? (
                              <strong className="text-foreground font-semibold">{c.replace(/\*\*/g, '')}</strong>
                            ) : c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          return null;
        }
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        inTable = false;
        // Simple code block capture until next ```
        const nextBacktickIdx = lines.slice(idx + 1).findIndex(l => l.trim().startsWith('```'));
        if (nextBacktickIdx !== -1) {
          const codeContent = lines.slice(idx + 1, idx + 1 + nextBacktickIdx).join('\n');
          lines.splice(idx, nextBacktickIdx + 2); // skip these lines in future loops
          return (
            <div key={idx} className="my-8 rounded-xl border border-border bg-black/95 text-zinc-300 p-5 overflow-x-auto font-mono text-sm leading-relaxed shadow-xl relative group">
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <pre><code>{codeContent}</code></pre>
            </div>
          );
        }
      }

      // Standard paragraphs
      if (trimmed !== '') {
        inTable = false;
        return (
          <p key={idx} className="text-lg leading-relaxed font-serif-premium text-foreground/90 my-6 tracking-wide [word-spacing:1px]">
            {trimmed}
          </p>
        );
      }

      return null;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 flex flex-col font-sans">
      
      {/* GLOBAL HIGH-END NAVIGATION BAR */}
      <header className="border-b border-zinc-800/50 sticky top-0 bg-[#09090b]/80 backdrop-blur-md z-40 px-4 md:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isUnlocked && (
            <button 
              onClick={() => { triggerHaptic('light'); setSidebarOpen(!sidebarOpen); }}
              className="p-2 hover:bg-zinc-800/50 rounded-lg transition-colors lg:hidden mr-1 text-zinc-400"
              id="sidebar-toggle-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" stroke-linecap="round" stroke-linejoin="round" className="text-black"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg text-white leading-none">LUMINA</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-wider uppercase mt-0.5">Stellar Access Gate</span>
            </div>
          </div>
        </div>

        {/* Dynamic Center Badge */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-zinc-500 uppercase tracking-widest">
          <span>Stellar Ledger</span>
          <span className="text-zinc-800">/</span>
          <span className="text-zinc-300 flex items-center gap-1.5 font-sans font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Testnet Horizon
          </span>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-3">
          {/* Developer Quick Bypass Toggle */}
          <button
            onClick={handleManualUnlockToggle}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800/80 hover:bg-zinc-900/50 text-zinc-400 hover:text-white text-xs font-mono font-medium transition-all bg-zinc-950/30"
            id="dev-bypass-btn"
          >
            {isUnlocked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isUnlocked ? 'Bypass Lock' : 'Bypass Unlock'}</span>
          </button>

          {/* Theme Toggler */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-zinc-800 hover:bg-zinc-900/50 text-zinc-400 hover:text-white transition-colors"
            aria-label="Toggle Theme"
            id="theme-toggler"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Wallet State Pill */}
          {publicKey ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-xs font-medium">
              <Wallet className="w-3.5 h-3.5" />
              <span className="font-mono">{publicKey.substring(0, 5)}...{publicKey.substring(publicKey.length - 4)}</span>
              <button 
                onClick={() => { triggerHaptic('error'); disconnect(); }}
                className="ml-1 text-[9px] hover:underline font-mono uppercase text-zinc-500 hover:text-red-400 transition-colors"
                id="disconnect-wallet-btn"
              >
                (Disconnect)
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 bg-zinc-900/30 border border-zinc-800/80 px-3 py-1.5 rounded-xl font-mono">
              <Wallet className="w-3.5 h-3.5" />
              <span>No Wallet Connected</span>
            </div>
          )}
        </div>
      </header>

      {/* DYNAMIC VIEW CONTAINER */}
      <main className="flex-1 flex overflow-hidden relative">
        <AnimatePresence mode="wait">
          {!isUnlocked ? (
            
            /* PAGE 1: SLEEK LOCK & ACCESS GATE PAGE */
            <motion.div 
              key="locked-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 w-full flex flex-col relative items-center justify-start overflow-y-auto px-4 py-8 lg:py-16"
            >
              {/* Premium Background auroras */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none z-0" />
              <div className="absolute bottom-10 left-10 w-[250px] h-[250px] bg-indigo-500/5 dark:bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none z-0" />

              <div className="max-w-4xl w-full z-10 flex flex-col gap-10">
                
                {/* 1. Behind the Paywall Preview Header */}
                <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
                  <div className="inline-flex items-center justify-center self-center px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-mono font-medium tracking-wide uppercase">
                    Premium Research Article
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight">
                    {activeArticle.title}
                  </h1>
                  <p className="text-base text-muted-foreground font-sans">
                    {activeArticle.subtitle}
                  </p>
                  <div className="flex items-center justify-center gap-5 mt-2 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {activeArticle.author.name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeArticle.readTime}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {activeArticle.category}</span>
                  </div>
                </div>

                {/* 2. Content Preview Block (Blurred out) */}
                <div className="relative border border-zinc-800/50 rounded-[32px] bg-[#0c0c0e]/30 overflow-hidden shadow-2xl min-h-[750px] flex flex-col justify-center">
                  
                  {/* Real article text representation, but blurred starting from second paragraph */}
                  <div className="p-6 md:p-10 select-none pointer-events-none opacity-45 dark:opacity-25 filter blur-sm flex flex-col gap-6">
                    <p className="text-lg font-serif-premium leading-relaxed">
                      Traditional subscription networks suffer from severe dynamic latency, high subscription churn, and aggressive multi-party distribution cost centers. 
                      By leveraging a decentralized ledger, media organizations can securely scale pay-per-read micro-monetization pipelines directly to their consumers.
                    </p>
                    <div className="h-px bg-border my-2" />
                    <p className="text-lg font-serif-premium leading-relaxed">
                      The core architecture of Stellar allows micropayment streaming with transaction costs amounting to fractions of a penny. This ledger design eliminates 
                      merchant processing overheads, unlocking the viability of a real-time pay-as-you-read economic engine. Developers can wire this directly to client wallets...
                    </p>
                    <p className="text-lg font-serif-premium leading-relaxed">
                      Furthermore, the integration of programmable smart contract platforms like Soroban enables dynamic on-chain splits between authors, editors, and photographers.
                      This eliminates the overhead of centralized auditing and distributes payouts instantaneously upon a successful user access event...
                    </p>
                  </div>

                  {/* 3. THE LOCK GATE SLEEK GLASS OVERLAY */}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center p-4 md:p-8 z-20">
                    <motion.div 
                      initial={{ scale: 0.95, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      className="max-w-[480px] w-full bg-zinc-900/95 border border-white/10 rounded-[32px] p-8 md:p-10 text-center shadow-2xl backdrop-blur-2xl relative overflow-hidden flex flex-col items-center gap-6"
                    >
                      {/* Decorative Accent Glow */}
                      <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 blur-[80px] rounded-full pointer-events-none" />

                      {/* Premium Locked Icon Header */}
                      <div className="relative group z-10">
                        <div className="absolute -inset-1 rounded-full bg-amber-500/30 group-hover:opacity-100 blur transition duration-500 animate-pulse" />
                        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          <Lock className="w-7 h-7" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 z-10">
                        <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white">
                          Exclusive Research
                        </h2>
                        <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto font-sans">
                          Unlock the full deep-dive into sovereign liquidity protocols and protocol-owned value. This report is limited to premium ledger members.
                        </p>
                      </div>

                      {/* On-Chain Pricing Card - Styled as premium grid */}
                      <div className="w-full bg-zinc-950/50 rounded-2xl p-4 border border-zinc-800/60 grid grid-cols-2 gap-4 text-left divide-x divide-zinc-800/80 z-10">
                        <div className="flex flex-col pl-2">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-semibold">Unlock Fee</span>
                          <span className="text-xl font-bold font-display text-amber-500 mt-1">{UNLOCK_FEE_XLM} XLM</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">~$0.50 USD</span>
                        </div>
                        <div className="flex flex-col pl-4">
                          <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-semibold">Destination</span>
                          <span className="text-xs font-mono text-zinc-300 font-semibold mt-1.5 truncate" title={PLATFORM_RECEIVER_ADDRESS}>
                            {PLATFORM_RECEIVER_ADDRESS.substring(0, 6)}...{PLATFORM_RECEIVER_ADDRESS.substring(PLATFORM_RECEIVER_ADDRESS.length - 6)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-1">Publisher Escrow</span>
                        </div>
                      </div>

                      {/* Error Banner */}
                      {error && (
                        <div className="w-full text-left bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs flex gap-2.5 items-start z-10 font-mono">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <span className="font-semibold block mb-0.5">Transaction Error</span>
                            {error}
                          </div>
                        </div>
                      )}

                      {/* Transaction Submission Progress Info */}
                      {isLoading && (
                        <div className="w-full bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl text-left flex flex-col gap-3 z-10">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">Stellar Node Transaction Progress</span>
                          </div>
                          
                          <div className="flex flex-col gap-2 font-mono text-xs text-zinc-400 pl-7">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              <span>[1/3] Building payment operation...</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>[2/3] Waiting for wallet signature...</span>
                            </div>
                            <div className="flex items-center gap-2 text-zinc-650">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                              <span>[3/3] Broadcasting to Horizon consensus...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Interactive Buttons Stack */}
                      <div className="w-full flex flex-col gap-4 z-10">
                        {publicKey ? (
                          /* Connected State: Submit transaction button */
                          <div className="flex flex-col gap-3">
                            <motion.button
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={handleUnlockPayment}
                              disabled={isLoading}
                              className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
                              id="pay-to-unlock-btn"
                            >
                              {isLoading ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>Authorizing Access Gate...</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4" />
                                  <span>Unlock with XLM ({UNLOCK_FEE_XLM} XLM)</span>
                                </>
                              )}
                            </motion.button>
                            
                            {/* Wallet Info Footer card */}
                            <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950/40 rounded-xl text-xs border border-zinc-800/60 font-mono">
                              <span className="text-zinc-400 flex items-center gap-1">
                                <Wallet className="w-3.5 h-3.5" />
                                Balance: <strong className="text-zinc-100 font-bold">{balance} XLM</strong>
                              </span>
                              {walletType === 'sandbox' ? (
                                <button
                                  onClick={handleFundSandbox}
                                  className="text-amber-500 hover:underline font-bold flex items-center gap-1.5"
                                  id="sandbox-fund-btn"
                                >
                                  <RefreshCw className="w-3 h-3" /> Get free 10k XLM
                                </button>
                              ) : (
                                <span className="text-zinc-500 italic">Freighter Wallet</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Disconnected State: Connect Wallet Options */
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Option 1: Freighter extension wallet */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConnectFreighter}
                                className="bg-zinc-800/50 border border-zinc-700/50 text-white font-semibold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-sm"
                                id="connect-freighter-btn"
                              >
                                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                                </svg>
                                <span>Freighter Wallet</span>
                              </motion.button>
 
                              {/* Option 2: Simulated Sandbox / Playground Wallet */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConnectSandbox}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/10"
                                id="connect-sandbox-btn"
                              >
                                <Terminal className="w-4 h-4" />
                                <span>Stellar Sandbox</span>
                              </motion.button>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-zinc-800"></div>
                              <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Or Use Local Bypass</span>
                              <div className="h-px flex-1 bg-zinc-800"></div>
                            </div>

                            <button 
                              onClick={handleManualUnlockToggle}
                              className="w-full py-3 bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                              id="dev-bypass-btn-overlay"
                            >
                              <span>Demo Reader Bypass (Unlock Instant)</span>
                            </button>
                            
                            <span className="text-[10px] text-zinc-500 font-mono block">
                              💡 Stellar Sandbox creates a secure, temporary testnet wallet loaded with free XLM. Highly recommended for quick in-browser testing!
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="mt-4 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
                        Transactions secured by Stellar Consensus Protocol
                      </p>

                    </motion.div>
                  </div>

                </div>

                {/* 4. Stellar Educational Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="p-5 border border-zinc-800/60 rounded-xl bg-zinc-900/40 flex flex-col gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">Decentralized Escrow <span className="text-xs">💸</span></h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Micro-payouts travel atomically on-chain. There are no corporate intermediaries or credit card processing clearinghouses taking 30% of your transaction.
                    </p>
                  </div>

                  <div className="p-5 border border-zinc-800/60 rounded-xl bg-zinc-900/40 flex flex-col gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">Instant Consensual Verify <span className="text-xs">⚡</span></h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Stellar validation blocks settle in less than 5 seconds. Once written, the immutable payment hash confirms your lifetime content reading authorization.
                    </p>
                  </div>

                  <div className="p-5 border border-zinc-800/60 rounded-xl bg-zinc-900/40 flex flex-col gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <h3 className="font-display font-bold text-sm text-zinc-100 flex items-center gap-1.5">Stellar Testnet Friendly <span className="text-xs">🧪</span></h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Our system is fully configured to use the official Horizon Testnet network. Interact with genuine nodes using temporary browser keypairs or real Freighter extensions.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            
            /* PAGE 2: PREMIUM CONTENT VIEW WITH NAVIGATION SIDEBAR */
            <motion.div 
              key="unlocked-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 w-full flex relative overflow-hidden"
            >
              
              {/* RESPONSIVE NAVIGATION SIDEBAR */}
              <aside className={`
                absolute lg:static inset-y-0 left-0 w-80 bg-card border-r border-border/80 flex flex-col z-30 transition-all duration-300 transform 
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}>
                {/* Sidebar Header */}
                <div className="p-4 border-b border-border/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="font-display font-bold text-sm tracking-tight">Premium Library</span>
                  </div>
                  <button 
                    onClick={() => { triggerHaptic('light'); setSidebarOpen(false); }}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors lg:hidden"
                    id="close-sidebar-btn"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sidebar Articles Selector List */}
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground/80 uppercase px-2 mb-1 tracking-wider">Select Article</span>
                  
                  {PREMIUM_ARTICLES.map((article) => {
                    const isSelected = article.id === activeArticleId;
                    return (
                      <button
                        key={article.id}
                        onClick={() => handleArticleSelect(article.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1.5 border ${
                          isSelected 
                            ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10' 
                            : 'hover:bg-muted border-transparent text-foreground'
                        }`}
                        id={`select-article-${article.id}`}
                      >
                        <div className="flex justify-between items-start gap-2 w-full">
                          <span className={`text-[10px] font-mono tracking-wide uppercase px-2 py-0.5 rounded-full ${
                            isSelected ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {article.category}
                          </span>
                          <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {article.readTime}
                          </span>
                        </div>
                        <h4 className={`text-sm font-semibold tracking-tight line-clamp-2 leading-snug ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Image 
                            src={article.author.avatar} 
                            alt={article.author.name} 
                            width={18}
                            height={18}
                            className="rounded-full border border-border/20 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className={`text-[11px] truncate ${isSelected ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                            {article.author.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Footer: Stellar Account Monitor */}
                <div className="p-4 border-t border-zinc-800/50 bg-[#0c0c0e]/80 flex flex-col gap-4">
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex flex-col shadow-inner">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 flex items-center justify-between font-mono font-bold">
                      <span>Wallet Connected</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[9px] text-zinc-400 uppercase tracking-tighter">Testnet</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-300 truncate max-w-[130px]">
                        {publicKey ? `${publicKey.substring(0, 6)}...${publicKey.substring(publicKey.length - 4)}` : 'Demo Bypass'}
                      </span>
                      {txHash && (
                        <a 
                          href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-amber-500 hover:underline flex items-center gap-0.5 font-mono"
                          title="View on StellarExpert Explorer"
                        >
                          Explorer <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    
                    <div className="mt-3 text-sm font-bold text-zinc-100 font-mono">
                      {balance || '0.00'} <span className="text-zinc-500 font-normal">XLM</span>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full">
                    {/* Lock again for testing */}
                    <button
                      onClick={() => { triggerHaptic('light'); resetUnlocked(); }}
                      className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800/80 rounded-xl text-xs font-medium transition-all text-center font-mono"
                      id="relock-btn"
                    >
                      Lock Page
                    </button>
                    <button
                      onClick={() => { triggerHaptic('error'); disconnect(); }}
                      className="flex-1 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/30 rounded-xl text-xs font-medium transition-all text-center font-mono"
                      id="disconnect-footer-btn"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

              </aside>

              {/* OUTSIDE SHADOW BLOCKER FOR SIDEBAR ON MOBILE */}
              {sidebarOpen && (
                <div 
                  onClick={() => setSidebarOpen(false)}
                  className="absolute inset-0 bg-black/40 z-20 lg:hidden"
                />
              )}

              {/* MAIN CONTENT READING AREA */}
              <div className="flex-1 flex flex-col bg-background overflow-y-auto">
                
                {/* Stellar Explorer Sub-Terminal (Optional showable console) */}
                <div className="bg-card border-b border-border/50 px-4 md:px-8 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Active Topic: <strong className="text-foreground">{activeArticle.category}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => { triggerHaptic('light'); setShowSandboxConsole(!showSandboxConsole); }}
                    className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                    id="toggle-console-btn"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>{showSandboxConsole ? 'Hide Stellar Console' : 'Show Stellar Console'}</span>
                  </button>
                </div>

                {/* Expandable Sandbox Console */}
                <AnimatePresence>
                  {showSandboxConsole && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-zinc-950 border-b border-border text-zinc-300 font-mono text-xs overflow-hidden"
                    >
                      <div className="p-4 md:p-6 flex flex-col gap-4 max-w-4xl mx-auto">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                          <span className="text-indigo-400 font-bold flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 animate-pulse" /> STELLAR TESTING SANDBOX TERMINAL
                          </span>
                          <span className="text-[10px] text-zinc-500">API Horizon 2.0</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Wallet State Information</span>
                            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-col gap-1 text-zinc-400">
                              <div><span className="text-zinc-500">Public Address:</span> <span className="text-zinc-200">{publicKey || 'Bypassed Session'}</span></div>
                              <div><span className="text-zinc-500">Wallet Class:</span> <span className="text-zinc-200">{walletType || 'Demo / System Bypass'}</span></div>
                              <div><span className="text-zinc-500">Native Balance:</span> <span className="text-zinc-200 font-bold">{balance}</span></div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Quick actions & Tools</span>
                            <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex flex-wrap gap-2">
                              <button
                                onClick={async () => { triggerHaptic('light'); await refreshBalance(); }}
                                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1"
                                id="console-refresh-balance-btn"
                              >
                                <RefreshCw className="w-3 h-3" /> Refresh Balance
                              </button>
                              {walletType === 'sandbox' && (
                                <button
                                  onClick={handleFundSandbox}
                                  className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded text-xs transition-colors"
                                  id="console-fund-friendbot-btn"
                                >
                                  Trigger Friendbot (+10,000 XLM)
                                </button>
                              )}
                              <button
                                onClick={() => { triggerHaptic('light'); window.open('https://stellar.expert/explorer/testnet', '_blank'); }}
                                className="bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-900/50 text-indigo-400 px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1"
                                id="console-expert-explorer-btn"
                              >
                                StellarExpert <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {txHash && (
                          <div className="bg-emerald-950/20 border border-emerald-800/30 p-3.5 rounded-lg text-emerald-400 flex flex-col gap-1">
                            <div className="font-bold flex items-center gap-1 text-[11px] uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" /> SECURE UNLOCKED CRYPTO-PROOF
                            </div>
                            <div className="text-[10px] text-zinc-400 mt-1 break-all">
                              <span className="text-zinc-500 font-semibold block">TRANSACTION HASH:</span>
                              {txHash}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* LONG FORM TYPOGRAPHY STAGE */}
                <article className="max-w-3xl mx-auto px-6 md:px-10 py-10 lg:py-16 w-full flex-1 flex flex-col">
                  
                  {/* Article Hero Banner */}
                  <div className="flex flex-col gap-4 border-b border-border/80 pb-8 mb-8">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold tracking-wider text-primary uppercase bg-muted px-2.5 py-1 rounded-md border border-border/40">
                        {activeArticle.category}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Published {activeArticle.date}
                      </span>
                    </div>

                    <h1 className="text-3xl md:text-5xl font-display font-extrabold tracking-tight text-foreground leading-tight">
                      {activeArticle.title}
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed mt-1">
                      {activeArticle.subtitle}
                    </p>

                    {/* Author card row */}
                    <div className="flex items-center justify-between mt-4 p-3 border border-border/40 rounded-xl bg-card/40">
                      <div className="flex items-center gap-3">
                        <Image 
                          src={activeArticle.author.avatar} 
                          alt={activeArticle.author.name} 
                          width={44}
                          height={44}
                          className="rounded-full object-cover border border-border"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">{activeArticle.author.name}</span>
                          <span className="text-xs text-muted-foreground">{activeArticle.author.role}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => { triggerHaptic('light'); alert('Link copied to clipboard!'); }}
                          className="p-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-border/30"
                          title="Share Article"
                          id="share-article-btn"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full">
                          <Clock className="w-3.5 h-3.5" /> {activeArticle.readTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Render of Premium Long-form reading paragraphs */}
                  <div className="prose dark:prose-invert max-w-none flex flex-col select-text font-serif-premium">
                    {renderPremiumMarkdown(activeArticle.contentMarkdown)}
                  </div>

                  {/* Reader Feedback Footer */}
                  <div className="border-t border-border/80 pt-8 mt-16 pb-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      Thanks for reading. Supported by <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse" /> & Stellar consensus.
                    </span>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => triggerHaptic('light')} 
                        className="hover:text-foreground transition-colors flex items-center gap-1"
                        id="coffee-support-btn"
                      >
                        <Coffee className="w-3.5 h-3.5" /> Buy author a coffee
                      </button>
                      <span>© 2026 MediaGate</span>
                    </div>
                  </div>

                </article>

              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>

    </div>
  );
}
