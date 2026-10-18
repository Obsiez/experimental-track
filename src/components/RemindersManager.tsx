import React, { useState } from 'react';
import { Customer, Reminder, SavingGoal } from '../types';
import { 
  Bell, Calendar, User, Clock, AlertTriangle, CheckSquare, Square, 
  Volume2, X, CreditCard, CalendarClock, Info 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, formatNumber, Language } from '../lib/translations';
import { triggerHaptic } from '../lib/haptics';
import { toast } from 'sonner';
import { showNotification } from '../lib/notifications';

interface RemindersManagerProps {
  reminders: Reminder[];
  customers: Customer[];
  goals?: SavingGoal[];
  addReminder: (
    customerId: string, 
    notes: string, 
    dueDate: Date,
    extra?: {
      type?: 'customer' | 'emi';
      goalId?: string;
      customerName?: string;
      emiDayOfMonth?: number;
      installmentAmount?: number;
    }
  ) => Promise<void>;
  toggleReminder: (id: string, active: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  dailyReminderTime: string;
  updateSettings: (time: string) => Promise<void>;
  lang: Language;
}

export default function RemindersManager({
  reminders,
  customers,
  goals = [],
  addReminder,
  toggleReminder,
  deleteReminder,
  dailyReminderTime,
  updateSettings,
  lang
}: RemindersManagerProps) {
  const t = translations[lang];

  const [showAddForm, setShowAddForm] = useState(false);
  const [reminderCategory, setReminderCategory] = useState<'customer' | 'emi'>('customer');
  
  // Customer Due Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDateStr, setDueDateStr] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('10:00');

  // EMI Installment Form State
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [emiTitle, setEmiTitle] = useState('');
  const [emiDayOfMonth, setEmiDayOfMonth] = useState<number>(5);
  const [emiAmount, setEmiAmount] = useState('');
  const [emiTimeStr, setEmiTimeStr] = useState('09:00');

  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In-app test trigger alert state
  const [testAlertText, setTestAlertText] = useState<string | null>(null);

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoalId(goalId);
    const g = goals.find(item => item.id === goalId);
    if (g) {
      setEmiTitle(g.title);
      if (g.installmentAmount) {
        setEmiAmount(String(g.installmentAmount));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (reminderCategory === 'customer') {
      if (!selectedCustomerId) {
        setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে গ্রাহক নির্বাচন করুন।' : 'Choose a customer to remind.');
        return;
      }

      // Check if an active reminder already exists for this customer
      const existingCustomerReminder = reminders.find(
        r => r.active && (r.type === 'customer' || (!r.type && !r.goalId)) && r.customerId === selectedCustomerId
      );
      if (existingCustomerReminder) {
        const cust = customers.find(c => c.id === selectedCustomerId);
        setErrorMsg(
          lang === 'bn' 
            ? `এই গ্রাহকের (${cust?.name || ''}) জন্য ইতিমধ্যে একটি সক্রিয় তাগাদা রিমাইন্ডার রয়েছে।` 
            : `An active reminder already exists for this customer (${cust?.name || ''}).`
        );
        return;
      }

      if (!dueDateStr) {
        setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে তারিখ বেছে নিন।' : 'Please choose a due date.');
        return;
      }

      setIsSubmitting(true);
      try {
        const fullDate = new Date(`${dueDateStr}T${dueTimeStr}:00`);
        await addReminder(selectedCustomerId, notes, fullDate, {
          type: 'customer'
        });
        
        setSelectedCustomerId('');
        setNotes('');
        setDueDateStr('');
        setDueTimeStr('10:00');
        setShowAddForm(false);
        
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
        toast.success(lang === 'bn' ? 'গ্রাহক রিমাইন্ডার সংরক্ষণ করা হয়েছে' : 'Customer reminder scheduled successfully');
      } catch (err) {
        setErrorMsg(lang === 'bn' ? 'রিমাইন্ডার সংরক্ষণ করা যায়নি।' : 'Failed to save reminder.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // EMI Reminder
      const title = emiTitle.trim();
      if (!title) {
        setErrorMsg(lang === 'bn' ? 'কিস্তি বা ঋণের শিরোনাম লিখুন।' : 'Please enter an EMI title.');
        return;
      }

      if (selectedGoalId) {
        const existingEmiReminder = reminders.find(
          r => r.active && r.type === 'emi' && r.goalId === selectedGoalId
        );
        if (existingEmiReminder) {
          setErrorMsg(
            lang === 'bn' 
              ? 'এই কিস্তি বা লক্ষ্যের জন্য ইতিমধ্যে একটি সক্রিয় রিমাইন্ডার রয়েছে।' 
              : 'An active reminder already exists for this EMI or goal.'
          );
          return;
        }
      }

      setIsSubmitting(true);
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        let nextDueDate = new Date(year, month, emiDayOfMonth);
        const [hr, min] = emiTimeStr.split(':').map(Number);
        nextDueDate.setHours(hr || 9, min || 0, 0, 0);

        if (nextDueDate.getTime() < now.getTime()) {
          nextDueDate = new Date(year, month + 1, emiDayOfMonth);
          nextDueDate.setHours(hr || 9, min || 0, 0, 0);
        }

        const amt = parseFloat(emiAmount) || undefined;
        await addReminder('', notes, nextDueDate, {
          type: 'emi',
          goalId: selectedGoalId || undefined,
          customerName: title,
          emiDayOfMonth,
          installmentAmount: amt
        });

        setSelectedGoalId('');
        setEmiTitle('');
        setEmiAmount('');
        setNotes('');
        setEmiDayOfMonth(5);
        setEmiTimeStr('09:00');
        setShowAddForm(false);

        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
        toast.success(lang === 'bn' ? 'মাসিক কিস্তির রিমাইন্ডার সক্রিয় করা হয়েছে' : 'Monthly EMI reminder activated successfully');
      } catch (err) {
        setErrorMsg(lang === 'bn' ? 'কিস্তি রিমাইন্ডার সংরক্ষণ করা যায়নি।' : 'Failed to save EMI reminder.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const currentActiveReminders = reminders.filter(r => r.active);

  // Trigger simulated alarm instantly for testing
  const triggerDemoAlert = () => {
    const randomPick = currentActiveReminders[0] || {
      customerName: lang === 'bn' ? 'ওয়াহিদ জামান' : 'Wahid Zaman',
      notes: lang === 'bn' ? 'বকেয়া ১২০০ টাকা পরিশোধের ফলো-আপ।' : 'Follow up on ৳1,200 pending due.'
    };
    
    const message = `${lang === 'bn' ? 'খাতা রিমাইন্ডার' : 'LEDGER REMINDER'}: ${randomPick.customerName}! ${lang === 'bn' ? 'নোট' : 'Note'}: "${randomPick.notes}"`;
    setTestAlertText(message);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      showNotification(lang === 'bn' ? "চালান ট্র্যাক অ্যালার্ট" : "Challan Track Alert", {
        body: lang === 'bn' 
          ? `বকেয়া আদায়ের জন্য ${randomPick.customerName}-এর সাথে যোগাযোগ করতে মনে রাখুন!` 
          : `Remember to contact ${randomPick.customerName} for pending dues!`,
        icon: '/icon-192.png'
      });
    }

    if (typeof window !== 'undefined') {
      triggerHaptic([200, 100, 200]);
    }
  };

  return (
    <div className="space-y-6 no-select">
      
      {/* Test alert banner popup */}
      <AnimatePresence>
        {testAlertText && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100vw-32px)] max-w-sm bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white p-4 rounded-2xl shadow-2xl z-50 flex flex-col gap-2.5 border-2 border-slate-300 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black flex items-center gap-1.5 uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
                {t.liveNotification}
              </span>
              <button 
                onClick={() => setTestAlertText(null)} 
                className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="font-bold text-xs sm:text-sm leading-snug text-slate-900 dark:text-white">{testAlertText}</p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                {t.vibrationDemo}
              </span>
              <button 
                onClick={() => setTestAlertText(null)}
                className="text-xs font-bold bg-slate-950 text-white dark:bg-white dark:text-slate-950 px-3 py-1 rounded-lg border-2 border-slate-950 dark:border-white cursor-pointer"
              >
                {t.clearAlert}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header section with Daily Reminder trigger settings */}
      <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-6 rounded-xl space-y-4">
        <h2 className="text-lg sm:text-xl font-black text-black dark:text-white flex items-center gap-2.5 tracking-tight">
          <Bell className="w-5 h-5 stroke-[2.2]" />
          {t.alarmTitle}
        </h2>
        <p className="text-xs text-[#757575] leading-relaxed">
          {t.alarmDesc}
        </p>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#757575]" />
            <div>
              <div className="text-xs font-bold text-black dark:text-white">{t.dailyRecap}</div>
              <p className="text-[11px] text-[#757575]">{t.dailyRecapDesc}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <input 
              type="time"
              defaultValue={dailyReminderTime}
              onChange={(e) => updateSettings(e.target.value)}
              className="px-3 py-2 border border-slate-200 dark:border-slate-800/80 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-black dark:text-white font-mono font-bold text-xs"
            />
            <button
              onClick={triggerDemoAlert}
              className="px-3.5 py-2 bg-black hover:bg-[#262626] dark:bg-white dark:hover:bg-[#E2E2E2] text-white dark:text-black font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5" />
              {t.testAlarm}
            </button>
          </div>
        </div>
      </div>

      {/* Primary Reminder Add action */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
          {lang === 'bn' ? 'সংরক্ষিত অ্যালার্ট তালিকা' : 'Scheduled Follow-ups'}
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-xs font-bold text-black dark:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800/80 cursor-pointer transition-colors"
        >
          {showAddForm ? (lang === 'bn' ? 'ফর্ম বন্ধ করুন' : 'Close Scheduler') : `+ ${t.scheduleTitle}`}
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-5 rounded-xl space-y-4"
          >
            <div className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 stroke-[2]" />
              {t.scheduleContact}
            </div>

            {/* Category Switcher: Customer Due vs Monthly EMI */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => { setReminderCategory('customer'); setErrorMsg(''); }}
                className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  reminderCategory === 'customer'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-[#757575] hover:text-black dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'গ্রাহক বকেয়া তাগাদা' : 'Customer Follow-up'}
              </button>
              <button
                type="button"
                onClick={() => { setReminderCategory('emi'); setErrorMsg(''); }}
                className={`py-2 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  reminderCategory === 'emi'
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                    : 'text-[#757575] hover:text-black dark:hover:text-white'
                }`}
              >
                <CalendarClock className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'মাসিক কিস্তি / EMI' : 'Monthly EMI / Installment'}
              </button>
            </div>

            {/* Conditional Form Inputs */}
            {reminderCategory === 'customer' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#757575] uppercase flex items-center gap-1">
                    <User className="w-3 h-3"/>
                    {lang === 'bn' ? 'গ্রাহক অ্যাকাউন্ট' : 'Customer'}
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs font-medium focus:border-black dark:focus:border-white outline-none"
                    required
                  >
                    <option value="">{t.selectCustomerPrompt}</option>
                    {customers.map(c => {
                      const hasActive = reminders.some(
                        r => r.active && (r.type === 'customer' || (!r.type && !r.goalId)) && r.customerId === c.id
                      );
                      return (
                        <option 
                          key={c.id} 
                          value={c.id} 
                          disabled={hasActive}
                        >
                          {c.name} (Due: ৳ {formatNumber(c.outstandingDue || 0, lang)}){hasActive ? (lang === 'bn' ? ' — [ইতিমধ্যে সক্রিয়]' : ' — [Already set]') : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#757575] uppercase">
                    {lang === 'bn' ? 'রিমাইন্ডার নোট/বিবরণ' : 'Reminder Note'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Call for rice payment"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#757575] uppercase">
                    {t.targetDate}
                  </label>
                  <input
                    type="date"
                    value={dueDateStr}
                    onChange={(e) => setDueDateStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#757575] uppercase">
                    {t.targetTime}
                  </label>
                  <input
                    type="time"
                    value={dueTimeStr}
                    onChange={(e) => setDueTimeStr(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white font-mono"
                    required
                  />
                </div>
              </div>
            ) : (
              /* EMI / Installment Reminder Form */
              <div className="space-y-3.5">
                {/* 7-day alert helper banner */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-xs text-black dark:text-white font-medium flex items-start gap-2.5">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {lang === 'bn' 
                      ? 'প্রতি মাসে কিস্তির নির্দিষ্ট তারিখের ৭ দিন আগে থেকে প্রতিদিন নোটিফিকেশন পাঠানো হবে যাতে আপনার কিস্তির প্রস্তুতি থাকে।' 
                      : 'A notification will be sent each day 7 days prior to remind you that your upcoming monthly EMI installment is coming.'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Select Goal (optional link) */}
                  {goals.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#757575] uppercase flex items-center gap-1">
                        <CreditCard className="w-3 h-3"/>
                        {lang === 'bn' ? 'সংরক্ষিত লক্ষ্য বা কিস্তি (ঐচ্ছিক)' : 'Linked Goal / EMI (Optional)'}
                      </label>
                      <select
                        value={selectedGoalId}
                        onChange={(e) => handleGoalSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white"
                      >
                        <option value="">{lang === 'bn' ? '-- নতুন কিস্তির নাম লিখুন --' : '-- Custom EMI Title --'}</option>
                        {goals.filter(g => g.status === 'active').map(g => {
                          const hasActive = reminders.some(
                            r => r.active && r.type === 'emi' && r.goalId === g.id
                          );
                          return (
                            <option 
                              key={g.id} 
                              value={g.id} 
                              disabled={hasActive}
                            >
                              {g.title} ({g.type === 'deposit' ? 'EMI' : 'Savings'} - ৳{formatNumber(g.installmentAmount || g.targetAmount, lang)}){hasActive ? (lang === 'bn' ? ' — [ইতিমধ্যে সক্রিয়]' : ' — [Already set]') : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  {/* EMI Title */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#757575] uppercase">
                      {lang === 'bn' ? 'কিস্তি/ঋণের নাম' : 'EMI Title'} *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TV Installment, Bank Loan"
                      value={emiTitle}
                      onChange={(e) => setEmiTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white"
                      required
                    />
                  </div>

                  {/* Day of Month Selector (1-31) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#757575] uppercase flex items-center gap-1">
                      <CalendarClock className="w-3 h-3"/>
                      {lang === 'bn' ? 'প্রতি মাসের কিস্তির তারিখ' : 'Monthly Due Day'} *
                    </label>
                    <select
                      value={emiDayOfMonth}
                      onChange={(e) => setEmiDayOfMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs font-bold outline-none focus:border-black dark:focus:border-white"
                      required
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                        <option key={day} value={day}>
                          {lang === 'bn' ? `প্রতি মাসের ${formatNumber(day, 'bn')} তারিখ` : `Every month on day ${day}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Installment Amount */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#757575] uppercase">
                      {lang === 'bn' ? 'কিস্তির পরিমাণ (৳)' : 'Installment Amount (৳)'}
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={emiAmount}
                      onChange={(e) => setEmiAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs font-mono font-bold outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Notification Time */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#757575] uppercase">
                      {lang === 'bn' ? 'নোটিফিকেশন সময়' : 'Daily Alert Time'}
                    </label>
                    <input
                      type="time"
                      value={emiTimeStr}
                      onChange={(e) => setEmiTimeStr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs font-mono font-bold outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>

                  {/* Additional Note */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#757575] uppercase">
                      {lang === 'bn' ? 'নোট বা মন্তব্য (ঐচ্ছিক)' : 'Note (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Pay via Bkash or bank transfer"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-black dark:text-white text-xs outline-none focus:border-black dark:focus:border-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="text-[#DC2626] text-xs font-semibold flex items-center gap-1.5 p-2 bg-[#FFECEB] dark:bg-[#DC2626]/20 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-black dark:text-white font-semibold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-black hover:bg-[#262626] dark:bg-white dark:hover:bg-[#E2E2E2] text-white dark:text-black font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                {reminderCategory === 'emi' 
                  ? (lang === 'bn' ? 'কিস্তি অ্যালার্ট চালু করুন' : 'Enable EMI Alert')
                  : t.scheduleNow
                }
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* List of active scheduled alarms */}
      <div className="space-y-3">
        {reminders.length === 0 ? (
          <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 p-8 text-center rounded-xl text-[#757575]">
            <AlertTriangle className="w-10 h-10 mx-auto stroke-[1.5] mb-2" />
            <p className="font-bold text-sm text-black dark:text-white">{t.noRemindersYet}</p>
            <p className="text-xs mt-1">{t.scheduleOneNotice}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reminders.map(rem => {
              const isEmi = rem.type === 'emi';
              return (
                <div 
                  key={rem.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                    rem.active 
                      ? 'bg-white border-black/[0.08] dark:bg-[#0F1623] dark:border-white/[0.12]' 
                      : 'bg-slate-50 border-black/[0.04] dark:bg-slate-900/60 dark:border-white/[0.06] opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button 
                      onClick={() => toggleReminder(rem.id, !rem.active)}
                      className="p-1 shrink-0 text-[#757575] hover:text-black dark:hover:text-white cursor-pointer rounded-md transition-colors"
                    >
                      {rem.active ? (
                        <CheckSquare className="w-5 h-5 stroke-[2] text-black dark:text-white" />
                      ) : (
                        <Square className="w-5 h-5 text-[#757575]" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-bold truncate ${rem.active ? 'text-black dark:text-white' : 'text-[#757575] line-through'}`}>
                          {rem.customerName}
                        </span>

                        {isEmi ? (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-slate-50 dark:bg-slate-900/60 text-black dark:text-white border border-slate-200 dark:border-slate-800/80 rounded uppercase tracking-wider flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {lang === 'bn' ? 'মাসিক কিস্তি' : 'Monthly EMI'}
                          </span>
                        ) : (
                          rem.active && (
                            <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-black text-white dark:bg-white dark:text-black rounded uppercase tracking-wider">
                              {t.activeAlert}
                            </span>
                          )
                        )}

                        {isEmi && rem.active && (
                          <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-slate-50 dark:bg-slate-900/60 text-[#757575] rounded">
                            {lang === 'bn' ? '৭ দিন আগে তাগাদা' : '7d Daily Alert'}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-[#757575] mt-0.5 truncate">
                        {rem.notes || (isEmi ? (lang === 'bn' ? 'মাসিক কিস্তি পরিশোধ' : 'Monthly installment payment') : t.contactRegardingDue)}
                        {rem.installmentAmount ? ` • ৳${formatNumber(rem.installmentAmount, lang)}` : ''}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#757575] font-semibold mt-2 uppercase tracking-wide flex-wrap font-mono">
                        {isEmi && rem.emiDayOfMonth ? (
                          <>
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span>
                              {lang === 'bn' ? `প্রতি মাসের ${formatNumber(rem.emiDayOfMonth, 'bn')} তারিখ` : `Every month on day ${rem.emiDayOfMonth}`}
                            </span>
                            {' • '}
                            <span>{lang === 'bn' ? 'পরবর্তী:' : 'Next:'}</span>
                          </>
                        ) : (
                          <Calendar className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {new Date(rem.dueDate).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {' • '}
                        <Clock className="w-3.5 h-3.5 ml-1" />
                        <span>
                          {new Date(rem.dueDate).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      onClick={() => {
                        deleteReminder(rem.id);
                        toast.info(lang === 'bn' ? 'রিমাইন্ডার মুছে ফেলা হয়েছে' : 'Reminder deleted');
                      }}
                      className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-black dark:text-white rounded-lg cursor-pointer transition-colors"
                      title="Delete reminder alarm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
