import React, { useMemo, useState } from 'react';
import { Customer, Transaction } from '../types';
import { 
  Users, ClipboardList, ArrowUpRight, ArrowDownLeft, ArrowRight, Zap, ChevronRight, 
  Clock, AlertTriangle, ShieldCheck, MessageSquare, TrendingUp, Sparkles, Filter
} from 'lucide-react';
import { translations, formatNumber, Language } from '../lib/translations';
import { triggerHaptic } from '../lib/haptics';
import AnalyticsManager from './AnalyticsManager';

const parseFirestoreDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal.seconds !== undefined) return new Date(dateVal.seconds * 1000);
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

interface DashboardProps {
  customers: Customer[];
  transactions: Transaction[];
  transactionsCount: number;
  monthlySummaries: any[];
  onOpenQuickEntry: () => void;
  onSelectCustomer: (id: string) => void;
  lang: Language;
  onViewDailyTxs: () => void;
}

export default function Dashboard({
  customers,
  transactions,
  transactionsCount,
  monthlySummaries,
  onOpenQuickEntry,
  onSelectCustomer,
  lang,
  onViewDailyTxs
}: DashboardProps) {
  const t = translations[lang];
  const [journalFilter, setJournalFilter] = useState<'all' | 'due' | 'payment'>('all');

  // Calculate high-resolution statistics
  const stats = useMemo(() => {
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.outstandingDue > 0 ? c.outstandingDue : 0), 0);
    const activeDebtorsCount = customers.filter(c => c.outstandingDue > 0).length;
    const totalOverpaid = customers.reduce((sum, c) => sum + (c.outstandingDue < 0 ? Math.abs(c.outstandingDue) : 0), 0);
    const activeCreditorsCount = customers.filter(c => c.outstandingDue < 0).length;

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const todayTxs = transactions.filter(tx => {
      const txDate = parseFirestoreDate(tx.date);
      return txDate.toDateString() === new Date().toDateString() || txDate >= midnight;
    });

    const duesToday = todayTxs
      .filter(tx => tx.type === 'due')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const paymentsToday = todayTxs
      .filter(tx => tx.type === 'payment')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const duesCountToday = todayTxs.filter(tx => tx.type === 'due').length;
    const paymentsCountToday = todayTxs.filter(tx => tx.type === 'payment').length;

    // Net Cash Flow Today
    const netCashFlowToday = paymentsToday - duesToday;

    // Aging breakdown (Current <15d, Aging 15-30d, Overdue >30d)
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let safeUnder15d = 0;
    let aging15to30d = 0;
    let overdueAbove30d = 0;

    customers.filter(c => c.outstandingDue > 0).forEach(c => {
      const lastActive = c.updatedAt ? new Date(c.updatedAt).getTime() : c.createdAt ? new Date(c.createdAt).getTime() : now;
      const ageDays = Math.floor((now - lastActive) / dayMs);
      if (ageDays <= 15) {
        safeUnder15d += c.outstandingDue;
      } else if (ageDays <= 30) {
        aging15to30d += c.outstandingDue;
      } else {
        overdueAbove30d += c.outstandingDue;
      }
    });

    // Top 3 Priority Debtors
    const topDebtors = [...customers]
      .filter(c => c.outstandingDue > 0)
      .sort((a, b) => b.outstandingDue - a.outstandingDue)
      .slice(0, 3);

    return {
      totalOutstanding,
      activeDebtorsCount,
      totalOverpaid,
      activeCreditorsCount,
      duesToday,
      paymentsToday,
      duesCountToday,
      paymentsCountToday,
      netCashFlowToday,
      safeUnder15d,
      aging15to30d,
      overdueAbove30d,
      topDebtors,
      todayTxs
    };
  }, [customers, transactions]);

  // Payment capture percentage
  const paymentRatio = useMemo(() => {
    const totalActiveActions = stats.duesToday + stats.paymentsToday;
    if (totalActiveActions === 0) return 0;
    return Math.round((stats.paymentsToday / totalActiveActions) * 100);
  }, [stats]);

  // Filtered transactions for journal
  const filteredTxs = useMemo(() => {
    if (journalFilter === 'all') return stats.todayTxs;
    return stats.todayTxs.filter(tx => tx.type === journalFilter);
  }, [stats.todayTxs, journalFilter]);

  const getWhatsAppDueLink = (c: Customer) => {
    let phoneNum = c.phone ? c.phone.replace(/[^0-9]/g, '') : '';
    if (phoneNum.startsWith('01')) phoneNum = '88' + phoneNum;
    const msg = lang === 'bn'
      ? `আসসালামু আলাইকুম ${c.name}। আপনার কাছে আমাদের বকেয়া পাওনা ৳${formatNumber(c.outstandingDue, 'bn')}। সম্ভব হলে অনুগ্রহ করে দ্রুত পরিশোধ করুন। ধন্যবাদ!`
      : `Hi ${c.name}, friendly reminder that your outstanding due is ৳${formatNumber(c.outstandingDue, 'en')}. Please clear it at your earliest convenience. Thank you!`;
    return `https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 no-select animate-reveal pb-12">
      
      {/* =========================================================================
          1. EXECUTIVE BENTO GRID (WITH DISTINCTIVE BOLD BORDERS)
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
        
        {/* HERO CARD (7 cols on desktop): Net Outstanding Dues */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
                {t.totalOutstanding}
              </span>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums font-semibold">
                {lang === 'bn' ? 'চলতি খতিয়ান' : 'Active Ledger'}
              </span>
            </div>

            <div className="pt-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tabular-nums font-mono tracking-tight">
                ৳ {formatNumber(stats.totalOutstanding, lang)}
              </div>
              
              {/* Informative Metadata Strip */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 dark:text-slate-300 mt-2.5 font-medium">
                <span className="text-slate-950 dark:text-white font-bold">
                  {formatNumber(stats.activeDebtorsCount, lang)} {lang === 'bn' ? 'জন সক্রিয় দেনাদার' : 'active debtors'}
                </span>
                <span>·</span>
                <span>
                  {formatNumber(transactionsCount, lang)} {lang === 'bn' ? 'মোট এন্ট্রি' : 'ledger entries'}
                </span>
                {stats.totalOverpaid > 0 && (
                  <>
                    <span>·</span>
                    <span 
                      className="font-mono font-bold"
                      style={{ color: 'var(--accent-color)' }}
                    >
                      ৳ {formatNumber(stats.totalOverpaid, lang)} {lang === 'bn' ? 'অগ্রিম জমা' : 'overpaid credit'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Integrated Action Bar with Bold Clickable Panels */}
          <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                triggerHaptic('single');
                onOpenQuickEntry();
              }}
              className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-[0.98] border-2 border-slate-950 dark:border-white shadow-xs"
              id="dash_quick_entry_btn"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{lang === 'bn' ? '+ হিসাব লিখুন' : '+ Quick Entry'}</span>
            </button>
            
            <button
              onClick={() => {
                triggerHaptic('single');
                onViewDailyTxs();
              }}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 cursor-pointer border-2 border-slate-300 hover:border-slate-800 dark:border-slate-700 dark:hover:border-slate-200 transition-all active:scale-[0.98]"
              id="dash_daily_journal_btn"
            >
              <span>{lang === 'bn' ? 'দৈনিক খাতা' : 'Daily Journal'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TODAY'S CASH INFLOW CARD (5 cols on desktop): Dynamic Accent Color */}
        <div 
          className="lg:col-span-5 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-7 shadow-xs flex flex-col justify-between relative overflow-hidden"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span 
                className="text-[11px] font-mono uppercase tracking-[0.16em] font-bold flex items-center gap-1.5"
                style={{ color: 'var(--accent-color)' }}
              >
                {t.paymentsToday}
              </span>
              <div 
                className="p-1.5 rounded-lg border-2"
                style={{ 
                  color: 'var(--accent-color)', 
                  backgroundColor: 'var(--accent-subtle)',
                  borderColor: 'var(--accent-subtle-border)' 
                }}
              >
                <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <div 
                className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums font-mono tracking-tight"
                style={{ color: 'var(--accent-color)' }}
              >
                ৳ {formatNumber(stats.paymentsToday, lang)}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                {lang === 'bn' 
                  ? `${formatNumber(stats.paymentsCountToday, lang)}টি নগদ ও অনলাইন আদায় সম্পন্ন`
                  : `${formatNumber(stats.paymentsCountToday, lang)} cash/digital receipts today`}
              </p>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>{lang === 'bn' ? 'আজকের আদায় প্রবাহ' : 'Inflow status'}</span>
            <span 
              className="font-bold"
              style={{ color: 'var(--accent-color)' }}
            >
              {stats.paymentsToday > 0 ? (lang === 'bn' ? 'সক্রিয় ক্যাশ' : 'Cash Active') : (lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending')}
            </span>
          </div>
        </div>

        {/* TODAY'S NEW CREDIT ISSUED */}
        <div className="md:col-span-1 lg:col-span-4 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-bold block">
              {t.duesToday}
            </span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums font-mono">
              +৳ {formatNumber(stats.duesToday, lang)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {lang === 'bn' 
                ? `${formatNumber(stats.duesCountToday, lang)}টি বাকির চালান যোগ হয়েছে`
                : `${formatNumber(stats.duesCountToday, lang)} credit challans logged today`}
            </span>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl border-2 border-rose-300 dark:border-rose-900">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
        </div>

        {/* NET CASH FLOW TODAY (IMPORTANT FINANCIAL METRIC) */}
        <div className="md:col-span-1 lg:col-span-4 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 font-bold block">
              {lang === 'bn' ? 'আজকের নিট ক্যাশ ফ্লো' : 'Net Cash Flow Today'}
            </span>
            <div className={`text-2xl font-black tabular-nums font-mono ${
              stats.netCashFlowToday >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {stats.netCashFlowToday >= 0 ? '+' : '-'}৳ {formatNumber(Math.abs(stats.netCashFlowToday), lang)}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {stats.netCashFlowToday >= 0 
                ? (lang === 'bn' ? 'নগদ আদায় বাকি দেওয়ার চেয়ে বেশি' : 'Positive daily liquidity')
                : (lang === 'bn' ? 'আজ বাকি দেওয়া আদায়ের চেয়ে বেশি' : 'Higher credit extended')}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border-2 ${
            stats.netCashFlowToday >= 0 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-300 dark:border-amber-800'
          }`}>
            <TrendingUp className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>

        {/* COLLECTION VELOCITY RATIO */}
        <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="currentColor" fill="none" strokeWidth="5" className="text-slate-100 dark:text-slate-800" />
              <circle 
                cx="28" 
                cy="28" 
                r="22" 
                stroke="currentColor" 
                fill="none" 
                strokeWidth="5" 
                strokeDasharray={138}
                strokeDashoffset={138 - (138 * (stats.duesToday === 0 && stats.paymentsToday === 0 ? 0 : paymentRatio)) / 100}
                style={{ stroke: 'var(--accent-color)' }}
                className="transition-all duration-500 stroke-linecap-round" 
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-xs font-black text-slate-950 dark:text-white tabular-nums font-mono">
                {formatNumber(paymentRatio, lang)}%
              </span>
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-950 dark:text-white">{t.efficiency}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {stats.duesToday === 0 && stats.paymentsToday === 0 
                ? (lang === 'bn' ? 'আজকের কাজ খালি' : 'No transactions recorded today')
                : (lang === 'bn' ? 'মোট লেনদেনের মধ্যে আদায়কৃত অনুপাত' : t.efficiencyDesc)}
            </p>
          </div>
        </div>

      </div>

      {/* =========================================================================
          2. IMPORTANT BUSINESS INTELLIGENCE STRIP: DUE AGING BREAKDOWN
          ========================================================================= */}
      <div className="bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">
              {lang === 'bn' ? 'বকেয়া মেয়াদ ও রিকভারি স্থিতি' : 'Due Aging & Recovery Exposure'}
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
            {lang === 'bn' ? 'সময়মত আদায়ের পূর্বাভাস' : 'Collection timeline health'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* < 15 Days (Current) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                {lang === 'bn' ? '০-১৫ দিন (চলতি)' : '0-15 Days (Current)'}
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums">
              ৳ {formatNumber(stats.safeUnder15d, lang)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'bn' ? 'স্বাভাবিক ও নিয়মিত বাকি' : 'Healthy recent billing'}
            </p>
          </div>

          {/* 15 - 30 Days (Follow Up) */}
          <div className="p-3.5 rounded-xl border border-amber-300/80 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                {lang === 'bn' ? '১৬-৩০ দিন (তাগাদা)' : '16-30 Days (Follow-up)'}
              </span>
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-lg font-black text-amber-700 dark:text-amber-300 font-mono tabular-nums">
              ৳ {formatNumber(stats.aging15to30d, lang)}
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              {lang === 'bn' ? 'ফলো-আপ দেওয়ার সময় হয়েছে' : 'Follow up reminder ready'}
            </p>
          </div>

          {/* > 30 Days (Overdue Alert) */}
          <div className="p-3.5 rounded-xl border border-rose-300/80 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
                {lang === 'bn' ? '৩০+ দিন (জরুরি)' : '30+ Days (Overdue)'}
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-lg font-black text-rose-700 dark:text-rose-300 font-mono tabular-nums">
              ৳ {formatNumber(stats.overdueAbove30d, lang)}
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
              {lang === 'bn' ? 'অগ্রাধিকার ভিত্তিতে আদায় প্রয়োজন' : 'High priority recovery'}
            </p>
          </div>

        </div>

        {/* Top 3 Priority Debtors Strip (Clickable Panels with Bold Borders) */}
        {stats.topDebtors.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block mb-2.5">
              {lang === 'bn' ? 'সর্বোচ্চ বকেয়াযুক্ত শীর্ষ ৩ গ্রাহক (তাগাদা পাঠান)' : 'Top 3 Outstanding Accounts (Send Reminder)'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {stats.topDebtors.map(debtor => (
                <div 
                  key={debtor.id}
                  className="p-3 rounded-xl border-2 border-slate-300 hover:border-slate-900 dark:border-slate-700 dark:hover:border-slate-200 bg-white dark:bg-[#0D121D] flex items-center justify-between gap-3 transition-colors shadow-2xs active:scale-[0.98]"
                >
                  <div 
                    onClick={() => onSelectCustomer(debtor.id)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-slate-950 dark:text-white truncate">
                      {debtor.name}
                    </div>
                    <div className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                      ৳ {formatNumber(debtor.outstandingDue, lang)}
                    </div>
                  </div>

                  {debtor.phone && (
                    <a
                      href={getWhatsAppDueLink(debtor)}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-600 transition-colors shrink-0 shadow-2xs"
                      title={lang === 'bn' ? 'হোয়াটসঅ্যাপে তাগাদা পাঠান' : 'Send WhatsApp Reminder'}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          3. HIGH-DENSITY ACTIVITY JOURNAL (TABULAR WITH BOLD BORDERS & FILTERS)
          ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300 font-bold block">
              {t.quickBook}
            </span>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500 font-bold">
              ({formatNumber(filteredTxs.length, lang)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Journal Filter Segment */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border-2 border-slate-800/80 dark:border-slate-200/80">
              <button
                onClick={() => setJournalFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  journalFilter === 'all'
                    ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {lang === 'bn' ? 'সব' : 'All'}
              </button>
              <button
                onClick={() => setJournalFilter('payment')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  journalFilter === 'payment'
                    ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {lang === 'bn' ? 'আদায়' : 'Got'} ({stats.paymentsCountToday})
              </button>
              <button
                onClick={() => setJournalFilter('due')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  journalFilter === 'due'
                    ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-slate-950 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {lang === 'bn' ? 'বাকি' : 'Given'} ({stats.duesCountToday})
              </button>
            </div>

            <button 
              onClick={onOpenQuickEntry}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold rounded-xl cursor-pointer transition-colors border-2 border-slate-950 dark:border-white shadow-xs active:scale-[0.98]"
              id="add_now_dash_btn"
            >
              + {t.recordEntry}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
          {filteredTxs.length === 0 ? (
            <div className="p-8 sm:p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-300 dark:border-slate-700">
                <ClipboardList className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-950 dark:text-white">{t.noActivity}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.recentPayments}</p>
              </div>
              <button
                type="button"
                onClick={onViewDailyTxs}
                className="mt-2 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border-2 border-slate-800/80 dark:border-slate-200"
              >
                {lang === 'bn' ? 'পুরানো বকেয়া ও আদায় দেখতে চান?' : 'Browse older dues & payments'}
              </button>
            </div>
          ) : (
            <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
              {filteredTxs.slice(0, 6).map(tx => (
                <div 
                  key={tx.id}
                  onClick={() => onSelectCustomer(tx.customerId)}
                  className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className={`p-2 rounded-xl shrink-0 border-2 ${
                      tx.type === 'due' 
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border-rose-300 dark:border-rose-900' 
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-300 dark:border-emerald-900'
                    }`}>
                      {tx.type === 'due' ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> : <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-950 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {tx.customerName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {tx.description || (tx.type === 'due' ? t.dueTrigger : t.paymentTrigger)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-base font-bold tabular-nums font-mono ${
                      tx.type === 'due' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {tx.type === 'due' ? '+' : '-'} ৳ {formatNumber(tx.amount, lang)}
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 tabular-nums flex items-center justify-end gap-1.5">
                      {tx.isEdited && (
                        <span className="text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-slate-500/10 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400 leading-none">
                          {lang === 'bn' ? 'সম্পাদিত' : 'Edited'}
                        </span>
                      )}
                      <span>{new Date(parseFirestoreDate(tx.date)).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTxs.length > 0 && (
                <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 flex justify-center border-t-2 border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={onViewDailyTxs}
                    className="text-xs font-bold text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'bn' ? 'আজকের সব লেনদেন দেখুন' : 'View All Daily Transactions'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          4. INTEGRATED MONTHLY ANALYTICS & INSIGHTS (WITH BOLD FRAMING)
          ========================================================================= */}
      <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-800">
        <AnalyticsManager 
          customers={customers}
          monthlySummaries={monthlySummaries}
          lang={lang}
        />
      </div>

    </div>
  );
}
