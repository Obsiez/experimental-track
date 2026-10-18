import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import { 
  BarChart3, Calendar, ArrowUpRight, ArrowDownLeft, TrendingUp, Users, Award, Percent
} from 'lucide-react';
import { translations, formatNumber, Language } from '../lib/translations';

// Compact formatter for chart labels ONLY (K/M/B)
function compactChart(val: number, lang: Language): string {
  const bengaliDigits = ['০','১','২','৩','৪','৫','৬','৭','৮','৯'];
  const toBn = (s: string) => lang === 'bn' ? s.replace(/[0-9]/g, d => bengaliDigits[+d]) : s;
  const abs = Math.abs(val);
  if (abs >= 1_000_000_000) {
    const n = abs / 1_000_000_000;
    return toBn((n % 1 === 0 ? n.toFixed(0) : parseFloat(n.toFixed(2)).toString()) + 'B');
  }
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    return toBn((n % 1 === 0 ? n.toFixed(0) : parseFloat(n.toFixed(2)).toString()) + 'M');
  }
  if (abs >= 1_000) {
    const n = abs / 1_000;
    return toBn((n % 1 === 0 ? n.toFixed(0) : parseFloat(n.toFixed(1)).toString()) + 'K');
  }
  return toBn(abs.toString());
}

interface AnalyticsManagerProps {
  customers: Customer[];
  monthlySummaries: any[];
  lang: Language;
}

export default function AnalyticsManager({ customers, monthlySummaries, lang }: AnalyticsManagerProps) {
  const t = translations[lang];

  // Helper: list all months that have transactions, sorted descending
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(currentMonthKey);

    monthlySummaries.forEach(s => {
      if (s.id) {
        monthsSet.add(s.id);
      }
    });

    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [monthlySummaries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '');

  // Helpers
  const toBnNum = (n: string | number) =>
    n.toString().replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);

  const getMonthName = (monthKey: string) => {
    if (!monthKey) return '';
    const [year, monthStr] = monthKey.split('-');
    const monthIndex = parseInt(monthStr, 10) - 1;
    const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const bnMonths = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
    const mName = lang === 'bn' ? bnMonths[monthIndex] : enMonths[monthIndex];
    const yName = lang === 'bn' ? toBnNum(year) : year;
    return `${mName} ${yName}`;
  };

  // 1. Monthly summary metrics for the selected month
  const monthlyMetrics = useMemo(() => {
    if (!selectedMonth) return { dues: 0, payments: 0, count: 0, efficiency: 0 };
    const summary = monthlySummaries.find(s => s.id === selectedMonth);

    const duesTotal = summary?.dues || 0;
    const paymentsTotal = summary?.payments || 0;
    const txCount = summary?.count || 0;

    const efficiency = duesTotal > 0
      ? Math.round((paymentsTotal / duesTotal) * 100)
      : paymentsTotal > 0 ? 100 : 0;

    return { dues: duesTotal, payments: paymentsTotal, count: txCount, efficiency: Math.min(100, efficiency) };
  }, [monthlySummaries, selectedMonth]);

  // 2. Chart data: last 6 months
  const chartData = useMemo(() => {
    const EN_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const BN_SHORT = ['জানু','ফেব্রু','মার্চ','এপ্রি','মে','জুন','জুলা','আগ','সেপ্টে','অক্টো','নভে','ডিসে'];
    const now = new Date();
    const list: { key: string; label: string; dues: number; payments: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const key = `${yr}-${String(mo + 1).padStart(2, '0')}`;

      const summary = monthlySummaries.find(s => s.id === key);
      const dSum = summary?.dues || 0;
      const pSum = summary?.payments || 0;

      list.push({
        key,
        label: lang === 'bn' ? BN_SHORT[mo] : EN_SHORT[mo],
        dues: dSum,
        payments: pSum,
      });
    }

    return list;
  }, [monthlySummaries, lang]);

  // 3. Scale
  const maxChartValue = useMemo(() => {
    let max = 0;
    chartData.forEach(d => {
      if (d.dues > max) max = d.dues;
      if (d.payments > max) max = d.payments;
    });
    return max > 0 ? max * 1.15 : 1000;
  }, [chartData]);

  const hasAnyData = chartData.some(d => d.dues > 0 || d.payments > 0);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 4. Top debtors
  const topDebtors = useMemo(() =>
    [...customers]
      .filter(c => c.outstandingDue > 0)
      .sort((a, b) => b.outstandingDue - a.outstandingDue)
      .slice(0, 5),
    [customers]
  );

  // 5. Top payers in the selected month
  const topPayers = useMemo(() => {
    if (!selectedMonth) return [];
    const summary = monthlySummaries.find(s => s.id === selectedMonth);
    if (!summary || !summary.customerPayments) return [];

    return Object.values(summary.customerPayments)
      .map((val: any) => ({ name: val.name, total: val.total }))
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5);
  }, [monthlySummaries, selectedMonth]);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white flex items-center gap-2.5 tracking-tight">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
            {t.analytics}
          </h2>
          <p className="text-xs text-[#757575] font-medium mt-1">
            {lang === 'bn'
              ? 'দোকানের মাসিক বাকি এবং কালেকশন ট্র্যাক করার সহজ ড্যাশবোর্ড।'
              : 'Easy insights to monitor sales performance and outstanding balances.'}
          </p>
        </div>

        {/* Month filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-[#757575] shrink-0" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#F6F6F6] dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 rounded-lg px-3 py-2 text-xs font-bold text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white cursor-pointer"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Credit Sales */}
        <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
              {lang === 'bn' ? 'বাকি দেওয়া হয়েছে' : 'Credit Sales (Dues Given)'}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#DC2626] tabular-nums font-mono">
              ৳ {formatNumber(monthlyMetrics.dues, lang)}
            </div>
            <span className="text-xs text-[#757575]">
              {lang === 'bn' ? 'চলতি মাসে মোট বাকি বিক্রি' : 'Total credit sales logged'}
            </span>
          </div>
          <div className="p-3 bg-[rgba(220, 38, 38, 0.08)] dark:bg-[#DC2626]/20 rounded-lg text-[#DC2626] shrink-0">
            <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>

        {/* Cash Collected */}
        <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
              {lang === 'bn' ? 'নগদ আদায় হয়েছে' : 'Cash Collected (Payments Got)'}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#059669] tabular-nums font-mono">
              ৳ {formatNumber(monthlyMetrics.payments, lang)}
            </div>
            <span className="text-xs text-[#757575]">
              {lang === 'bn' ? 'চলতি মাসে নগদ আদায়' : 'Total payments received'}
            </span>
          </div>
          <div className="p-3 bg-[rgba(5, 150, 105, 0.08)] dark:bg-[#059669]/20 rounded-lg text-[#059669] shrink-0">
            <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>

        {/* Efficiency */}
        <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
              {t.efficiency}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-black dark:text-white tabular-nums font-mono">
              {formatNumber(monthlyMetrics.efficiency, lang)}%
            </div>
            <span className="text-xs text-[#757575] truncate block">
              {lang === 'bn' ? 'বাকি আদায়ের সাফল্য হার' : 'Cash recovery progress percentage'}
            </span>
          </div>
          <div className="p-3 bg-[#F6F6F6] dark:bg-[#1F1F1F] rounded-lg text-black dark:text-white shrink-0">
            <Percent className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>

      </div>

      {/* CHART + LISTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CHART PANEL */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-4 overflow-hidden">

          {/* Panel header */}
          <div>
            <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 stroke-[2]" />
              {t.salesVsCollections}
            </h3>
            <p className="text-xs text-[#757575] mt-0.5">
              {lang === 'bn'
                ? 'গত ৬ মাসের বাকি বিক্রি ও নগদ আদায়ের তুলনা'
                : 'Last 6 months – credit given vs. cash collected'}
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-5 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626] block shrink-0" />
              <span className="text-[#757575]">
                {lang === 'bn' ? 'বাকি দেওয়া' : 'Credit Sales'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#059669] block shrink-0" />
              <span className="text-[#757575]">
                {lang === 'bn' ? 'নগদ আদায়' : 'Cash Collected'}
              </span>
            </div>
          </div>

          {/* Chart or empty state */}
          {!hasAnyData ? (
            <div className="h-52 flex flex-col items-center justify-center gap-3 text-[#757575]">
              <BarChart3 className="w-10 h-10 stroke-[1.5]" />
              <p className="text-xs font-semibold text-center">
                {lang === 'bn'
                  ? 'গত ৬ মাসে কোনো লেনদেন পাওয়া যায়নি'
                  : 'No transactions found in the last 6 months'}
              </p>
            </div>
          ) : (
            <div className="relative mt-2 overflow-x-hidden">
              {/* Y-axis gridlines */}
              <div className="absolute left-0 top-0 w-full h-[175px] pointer-events-none">
                {[1, 0.75, 0.5, 0.25, 0].map((frac, i) => {
                  const val = Math.round(maxChartValue * frac);
                  return (
                    <div
                      key={i}
                      className="absolute left-0 right-0 flex items-center"
                      style={{ top: `${(1 - frac) * 100}%` }}
                    >
                      <span className="text-[10px] font-mono font-bold text-[#757575] w-10 text-right shrink-0 leading-none">
                        {compactChart(val, lang)}
                      </span>
                      <div className="flex-1 ml-2 border-t border-black/[0.06] dark:border-white/[0.08]" />
                    </div>
                  );
                })}
              </div>

              {/* Bars */}
              <div className="ml-12 h-[175px] flex items-end justify-around gap-1 border-b border-black/[0.1] dark:border-white/[0.15]">
                {chartData.map((data, idx) => {
                  const opacity = 0.4 + (idx / 5) * 0.6;
                  const isCurrent = data.key === currentMonthKey;
                  const dueH  = data.dues     > 0 ? Math.max(3, (data.dues     / maxChartValue) * 100) : 0;
                  const payH  = data.payments > 0 ? Math.max(3, (data.payments / maxChartValue) * 100) : 0;
                  const net   = data.payments - data.dues;

                  return (
                    <div
                      key={data.key}
                      className="relative flex-1 flex items-end justify-center gap-1 h-full group"
                      style={{ opacity }}
                    >
                      {/* Hover tooltip */}
                      <div className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 bg-black text-white dark:bg-white dark:text-black rounded-lg shadow-xl px-3 py-2 text-xs font-bold whitespace-nowrap min-w-[120px]">
                        <div className="text-[11px] font-black uppercase mb-1">{data.label}</div>
                        <div className="flex justify-between gap-3 text-[11px]">
                          <span className="text-[#DC2626]">{lang === 'bn' ? 'বাকি' : 'Due'}</span>
                          <span className="font-mono">৳{compactChart(data.dues, lang)}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-[11px]">
                          <span className="text-[#059669]">{lang === 'bn' ? 'আদায়' : 'Paid'}</span>
                          <span className="font-mono">৳{compactChart(data.payments, lang)}</span>
                        </div>
                        <div className="border-t border-white/20 dark:border-black/20 mt-1 pt-1 flex justify-between gap-3 text-[11px]">
                          <span className="opacity-70">{lang === 'bn' ? 'নেট' : 'Net'}</span>
                          <span className={`font-mono ${net >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                            {net >= 0 ? '+' : ''}৳{compactChart(Math.abs(net), lang)}
                          </span>
                        </div>
                      </div>

                      {/* Bar pair */}
                      <div className="flex items-end justify-center gap-1 h-full">
                        <div
                          className="w-3.5 sm:w-5 rounded-t-xs transition-all duration-300 ease-out bg-[#DC2626]"
                          style={{ height: `${dueH}%` }}
                        />
                        <div
                          className="w-3.5 sm:w-5 rounded-t-xs transition-all duration-300 ease-out bg-[#059669]"
                          style={{ height: `${payH}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Month labels */}
              <div className="ml-12 flex justify-around gap-1 pt-2">
                {chartData.map((data, idx) => {
                  const isCurrent = data.key === currentMonthKey;
                  const opacity = 0.4 + (idx / 5) * 0.6;
                  return (
                    <div
                      key={data.key}
                      className={`flex-1 text-[11px] font-bold text-center ${
                        isCurrent ? 'text-black dark:text-white' : 'text-[#757575]'
                      }`}
                      style={{ opacity }}
                    >
                      {data.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* INSIGHTS COLUMN */}
        <div className="space-y-4">

          {/* TOP DEBTORS */}
          <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 stroke-[2]" />
              {t.topDebtors}
            </h3>
            {topDebtors.length === 0 ? (
              <p className="text-xs text-[#757575] font-medium py-3">
                {lang === 'bn' ? 'কোনো বকেয়া বাকি অ্যাকাউন্ট নেই!' : 'No customer accounts with unpaid balance.'}
              </p>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {topDebtors.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-[#757575] w-4 shrink-0">#{formatNumber(i + 1, lang)}</span>
                      <span className="text-xs font-bold text-black dark:text-white truncate">{c.name}</span>
                    </div>
                    <span className="text-xs font-black text-[#DC2626] tabular-nums font-mono shrink-0 ml-2">৳ {formatNumber(c.outstandingDue, lang)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOP PAYERS */}
          <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 stroke-[2]" />
              {t.topEarners}
            </h3>
            {topPayers.length === 0 ? (
              <p className="text-xs text-[#757575] font-medium py-3">
                {lang === 'bn' ? 'এই মাসে কোনো আদায় নেই!' : 'No payments received in this month.'}
              </p>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
                {topPayers.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-bold text-[#757575] w-4 shrink-0">#{formatNumber(i + 1, lang)}</span>
                      <span className="text-xs font-bold text-black dark:text-white truncate">{p.name}</span>
                    </div>
                    <span className="text-xs font-black text-[#059669] tabular-nums font-mono shrink-0 ml-2">৳ {formatNumber(p.total, lang)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
