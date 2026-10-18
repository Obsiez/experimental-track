import React, { useState, useEffect, useMemo } from 'react';
import { 
 onAuthStateChanged, 
 signInWithPopup, 
 signInAnonymously, 
 signOut, 
 User 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { useLedger } from './hooks/useLedger';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import RemindersManager from './components/RemindersManager';
import SettingsManager from './components/SettingsManager';
import GoalsManager from './components/GoalsManager';
import QuickEntryModal from './components/QuickEntryModal';
import AnalyticsManager from './components/AnalyticsManager';
import ChallanTrackLogo, { ChallanTrackMark } from './components/ChallanTrackLogo';
import AccentColorPickerModal from './components/AccentColorPickerModal';
import BiometricLockScreen from './components/BiometricLockScreen';
import CalculatorKeypad from './components/CalculatorKeypad';
import { isBiometricEnabled, isBiometricSessionUnlocked, setBiometricSessionUnlocked } from './lib/biometrics';
import { getSavedAccentColor, applyAccentColor, getSavedThemePalette, applyThemePalette } from './lib/accentTheme';
import {
  LayoutDashboard, Users, Bell, Settings, BookOpen, Clock, Globe, Plus, Moon, Sun, ArrowUpRight, ArrowDownLeft, ChevronRight, BarChart3, ArrowLeft, ClipboardList, Lock, Loader2, Calendar, PiggyBank, Goal, Palette
} from 'lucide-react';
import { showNotification } from './lib/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { triggerHaptic } from './lib/haptics';
import { translations, Language, formatNumber } from './lib/translations';

const parseFirestoreDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal.seconds !== undefined) return new Date(dateVal.seconds * 1000);
  const parsed = new Date(dateVal);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'home' | 'customers' | 'analytics' | 'reminders' | 'settings' | 'daily_transactions' | 'goals'>('home');
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [swipeGesturesEnabled, setSwipeGesturesEnabled] = useState(() => localStorage.getItem('swipe_gestures_enabled') !== 'false');
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
  const [isAccentModalOpen, setIsAccentModalOpen] = useState(false);
  const [activeAccentHex, setActiveAccentHex] = useState(getSavedAccentColor);
  const [biometricUnlocked, setBiometricUnlocked] = useState<boolean>(() => isBiometricSessionUnlocked());

  useEffect(() => {
    applyAccentColor(getSavedAccentColor());
    applyThemePalette(getSavedThemePalette());
    const handleAccentChange = (e: any) => {
      if (e.detail?.hex) {
        setActiveAccentHex(e.detail.hex);
      }
    };
    window.addEventListener('accent-color-changed', handleAccentChange);
    return () => window.removeEventListener('accent-color-changed', handleAccentChange);
  }, []);

  const isQuickEntryOpenRef = React.useRef(isQuickEntryOpen);
  React.useEffect(() => {
    isQuickEntryOpenRef.current = isQuickEntryOpen;
  }, [isQuickEntryOpen]);

  // Reset scroll height to top on tab or selected customer changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentTab, selectedCustomerIdForDetail]);

 useEffect(() => {
   const handleBeforeInstallPrompt = (e: any) => {
     e.preventDefault();
     setDeferredPrompt(e);
   };
   window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
   return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
 }, []);

 // History API / Breadcrumbs for Android Back Button support
 const navigateTo = (tab: typeof currentTab, customerId: string | null = null, replace = false) => {
 triggerHaptic('single');
 setCurrentTab(tab);
 setSelectedCustomerIdForDetail(customerId);
 const state = { tab, customerId, quickEntry: false };
 const url = `?tab=${tab}${customerId ? `&c=${customerId}` : ''}`;
 if (replace) {
 window.history.replaceState(state, '', url);
 } else {
 window.history.pushState(state, '', url);
 }
 };

 const openQuickEntry = () => {
 triggerHaptic('single');
 window.history.pushState({ ...window.history.state, quickEntry: true }, '', window.location.href);
 setIsQuickEntryOpen(true);
 };

  const closeQuickEntry = () => {
    if (!window.history.state?.quickEntry) {
      triggerHaptic('tick');
      setIsQuickEntryOpen(false);
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    // Force open dashboard on fresh load regardless of previous URL
    setCurrentTab('home');
    setSelectedCustomerIdForDetail(null);
    setIsQuickEntryOpen(false);
    
    window.history.replaceState({ tab: 'home', customerId: null, quickEntry: false }, '', window.location.pathname + '?tab=home');

    const handlePopState = (e: PopStateEvent) => {
      setAppDialog(null);
      const wasQuickEntryOpen = isQuickEntryOpenRef.current;
      const isNowQuickEntryOpen = e.state?.quickEntry || false;
      if (wasQuickEntryOpen && !isNowQuickEntryOpen) {
        triggerHaptic('tick');
      }
      if (e.state) {
        if (e.state.tab) {
          setCurrentTab(e.state.tab);
          setSelectedCustomerIdForDetail(e.state.customerId !== undefined ? e.state.customerId : null);
        }
        setIsQuickEntryOpen(isNowQuickEntryOpen);
      } else {
        setIsQuickEntryOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Cleanup any old senior mode remnants on mount + listen for open-daily-transactions
  useEffect(() => {
    document.documentElement.classList.remove('senior-mode');
    localStorage.removeItem('senior_mode');

    const handleOpenDailyTxs = () => {
      navigateTo('daily_transactions');
    };
    window.addEventListener('open-daily-transactions', handleOpenDailyTxs);
    return () => {
      window.removeEventListener('open-daily-transactions', handleOpenDailyTxs);
    };
  }, []);
 // Multilingual State ('bn' is Bangla, 'en' is English)
 const [lang, setLang] = useState<Language>(() => {
 return (localStorage.getItem('lang') as Language) || 'en';
 });

 const handleLangChange = (newLang: Language) => {
 setLang(newLang);
 localStorage.setItem('lang', newLang);
 };

 const t = translations[lang];



 // State for Theme
 const [theme, setTheme] = useState<'light' | 'dark'>(() => {
 return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
 });

 // Apply theme class to document element dynamically
 useEffect(() => {
 const root = document.documentElement;
 if (theme === 'dark') {
 root.classList.add('dark');
 } else {
 root.classList.remove('dark');
 }
 localStorage.setItem('theme', theme);
 }, [theme]);

 const [authError, setAuthError] = useState<string | null>(null);

 // Sync Auth State
 useEffect(() => {
 const isGuest = localStorage.getItem('local_guest_session') === 'true';
 if (isGuest) {
 setUser({
 uid: 'local-guest-session',
 email: 'guest@challantrack.local',
 displayName: 'Guest Owner'
 } as any);
 setAuthLoading(false);
 }

 const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
 if (currentUser) {
 setUser(currentUser);
 localStorage.removeItem('local_guest_session');
 } else {
 if (localStorage.getItem('local_guest_session') !== 'true') {
 setUser(null);
 }
 }
 setAuthLoading(false);
 });
 return () => unsubscribe();
 }, []);

  const [selectedDailyDate, setSelectedDailyDate] = useState<Date>(new Date());

 // Hook for full database state & synced offline storage
  const {
    customers,
    customerTransactions,
    dailyTransactions,
    todayTransactions,
    reminders,
    settings,
    loading: ledgerLoading,
    isOfflineFallback,
    updateTheme,
    updateSettings,
    createCustomer,
    updateCustomerDetails,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addReminder,
    toggleReminder,
    deleteReminder,
    deleteCustomer,
    trashCustomers,
    restoreCustomer,
    permanentlyDeleteCustomer,
    emptyTrash,
    importLedgerData,
    hasMoreCustomerTxs,
    customerTxLimit,
    loadMoreCustomerTransactions,
    resetCustomerTxLimit,
    monthlySummaries,
    activeCustomerTxCount,
    exportBackup,
    rebuildMonthlySummaries,
    goals,
    goalsSynced,
    createGoal,
    addGoalContribution,
    deleteGoal,
    updateGoalStatus,
    updateGoalTitle,
    updateGoalNotes,
    editGoalContribution,
    deleteGoalContribution,
    archivedStatements,
    updateStatementAutoMerge,
    exportArchivedStatements
  } = useLedger(user?.uid, selectedDailyDate, selectedCustomerIdForDetail);

  const dateInputRef = React.useRef<HTMLInputElement>(null);

// End-of-Day Cash Summary Notification
  useEffect(() => {
    if (!user || !dailyTransactions || dailyTransactions.length === 0) return;

    if ('Notification' in window && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    const checkAndNotify = () => {
      const now = new Date();
      if (now.getHours() >= 20) { // 8 PM or later
        const todayStr = now.toDateString();
        const lastNotifiedDate = localStorage.getItem('last_cash_summary_date');
        
        if (lastNotifiedDate !== todayStr && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
          let todaysCash = 0;
          dailyTransactions.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate.toDateString() === todayStr && tx.type === 'payment') {
              todaysCash += tx.amount;
            }
          });
          
          if (todaysCash > 0) {
            showNotification(lang === 'bn' ? 'আজকের নগদ আদায়' : 'Daily Cash Summary', {
              body: lang === 'bn' 
                ? `আজকের মোট নগদ আদায়: ৳${formatNumber(todaysCash, 'bn')}` 
                : `Total cash collected today: ৳${formatNumber(todaysCash, 'en')}`,
              icon: '/icon-192.png'
            });
            localStorage.setItem('last_cash_summary_date', todayStr);
          }
        }
      }
    };

    checkAndNotify();
    const interval = setInterval(checkAndNotify, 60000);
    return () => clearInterval(interval);
  }, [user, dailyTransactions, lang]);

  // Automated Reminders & Monthly EMI 7-Day Advance Notification Scheduler
  useEffect(() => {
    if (!user || !reminders || reminders.length === 0) return;

    if ('Notification' in window && window.Notification && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    const checkRemindersAndAlert = () => {
      const now = new Date();
      const todayDateStr = getLocalDateString(now);
      const nowTime = now.getTime();

      reminders.forEach((rem) => {
        if (!rem.active) return;

        // 1. Monthly EMI Reminder (7 days prior daily alert)
        if (rem.type === 'emi') {
          const dueDay = rem.emiDayOfMonth || new Date(rem.dueDate).getDate() || 1;
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth();
          
          let targetDate = new Date(currentYear, currentMonth, dueDay);
          if (now.getDate() > dueDay) {
            targetDate = new Date(currentYear, currentMonth + 1, dueDay);
          }
          
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const startOfTarget = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
          const diffDays = Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));

          // Send reminders frequently (every 2.5 hours) if within 7 days (7, 6, 5, 4, 3, 2, 1, 0 days remaining)
          if (diffDays >= 0 && diffDays <= 7) {
            const lastNotifiedKey = `last_notified_emi_${rem.id}`;
            const lastNotifiedTime = parseInt(localStorage.getItem(lastNotifiedKey) || '0');
            const hoursPassed = (nowTime - lastNotifiedTime) / (1000 * 60 * 60);

            if (hoursPassed >= 2.5) {
              const amountStr = rem.installmentAmount ? ` (৳${formatNumber(rem.installmentAmount, lang)})` : '';
              let bodyText = '';
              if (diffDays === 0) {
                bodyText = lang === 'bn' 
                  ? `আজ ${rem.customerName}-এর মাসিক কিস্তি${amountStr} পরিশোধের শেষ দিন!` 
                  : `Today is the due date for ${rem.customerName} monthly installment${amountStr}!`;
              } else if (diffDays === 1) {
                bodyText = lang === 'bn'
                  ? `আগামীকাল ${rem.customerName}-এর কিস্তি${amountStr} দেওয়ার সময় এসেছে।`
                  : `Tomorrow is the due date for ${rem.customerName} installment${amountStr}.`;
              } else {
                bodyText = lang === 'bn'
                  ? `আর মাত্র ${formatNumber(diffDays, 'bn')} দিন বাকি: ${rem.customerName}-এর মাসিক কিস্তি${amountStr} পরিশোধ করার প্রস্তুতি রাখুন।`
                  : `${diffDays} days remaining: Remember to prepare ${rem.customerName} monthly installment${amountStr}.`;
              }

              showNotification(lang === 'bn' ? 'চালান ট্র্যাক - কিস্তি রিমাইন্ডার' : 'Challan Track - EMI Reminder', {
                body: bodyText,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `emi-${rem.id}`
              });

              triggerHaptic([300, 150, 300]);
              localStorage.setItem(lastNotifiedKey, String(nowTime));
            }
          }
        } else {
          // 2. Standard Customer Follow-up Reminder
          const remDueDate = new Date(rem.dueDate).getTime();
          if (remDueDate <= nowTime) {
            const lastNotifiedKey = `last_notified_rem_${rem.id}`;
            const lastNotifiedTime = parseInt(localStorage.getItem(lastNotifiedKey) || '0');
            const hoursPassed = (nowTime - lastNotifiedTime) / (1000 * 60 * 60);

            if (hoursPassed >= 2.5) {
              showNotification(lang === 'bn' ? 'চালান ট্র্যাক - বকেয়া তাগাদা' : 'Challan Track - Reminder', {
                body: lang === 'bn'
                  ? `${rem.customerName}: ${rem.notes || 'বকেয়া আদায়ের ফলো-আপ করার সময় হয়েছে।'}`
                  : `${rem.customerName}: ${rem.notes || 'Time to follow up on pending dues.'}`,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: `rem-${rem.id}`
              });

              triggerHaptic([200, 100, 200]);
              localStorage.setItem(lastNotifiedKey, String(nowTime));
            }
          }
        }
      });
    };

    checkRemindersAndAlert();
    const interval = setInterval(checkRemindersAndAlert, 60000);
    return () => clearInterval(interval);
  }, [user, reminders, lang]);



 // Virtual Custom Dialogue Popups to bypass sandboxed iframe alert()/confirm() blocks
 const [appDialog, setAppDialog] = useState<{
 isOpen: boolean;
 type: 'alert' | 'confirm';
 title: string;
 message: string;
 onConfirm: () => void;
 onCancel?: () => void;
 } | null>(null);

 useEffect(() => {
    if (appDialog?.isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [appDialog?.isOpen]);

 const triggerAlert = (title: string, message: string) => {
 toast.error(title, { description: message });
 };

 const triggerConfirm = (title: string, message: string, onConfirmCallback: () => void) => {
 window.history.pushState({ ...window.history.state, dialogOpen: true }, '', window.location.href);
 setAppDialog({
 isOpen: true,
 type: 'confirm',
 title,
 message,
 onConfirm: () => {
 if (window.history.state?.dialogOpen) window.history.back();
 onConfirmCallback();
 setAppDialog(null);
 },
 onCancel: () => {
 if (window.history.state?.dialogOpen) window.history.back();
 setAppDialog(null);
 }
 });
 };
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

 // Handle Log In Mechanisms
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Auth Failed: ', err);
      const errCode = err?.code || '';
      const errMsg = err?.message || String(err);

      // If user closed the popup window, do not trigger a disruptive error alert
      if (errCode === 'auth/popup-closed-by-user') {
        setGoogleLoading(false);
        return;
      }

      setAuthError(errMsg);

      let userFriendlyMessage = lang === 'bn' 
        ? 'গুগল লগইন করতে সমস্যা হয়েছে। অনুগ্রহ করে ইন্টারনেট সংযোগটি চেক করুন এবং আবার চেষ্টা করুন।' 
        : 'Google sign-in could not connect. Please check your internet connection and try again.';

      if (errCode === 'auth/operation-not-allowed') {
        userFriendlyMessage = lang === 'bn'
          ? 'ফায়ারবেস কনসোলে গুগল লগইন সক্রিয় (Enable) করা নেই। অনুগ্রহ করে Firebase Console > Authentication > Sign-in method-এ গিয়ে Google সক্রিয় করুন।'
          : 'Google Sign-In is not enabled yet in your Firebase Console. Please go to Firebase Console > Authentication > Sign-in method and enable Google.';
      } else if (errCode === 'auth/unauthorized-domain') {
        userFriendlyMessage = lang === 'bn'
          ? `এই ডোমেনটি (${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}) ফায়ারবেসে অনুমোদিত নয়। অনুগ্রহ করে Firebase Console > Authentication > Settings > Authorized domains-এ এই ডোমেনটি যুক্ত করুন।`
          : `This domain (${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}) is not authorized for OAuth in Firebase. Please add it to Firebase Console > Authentication > Settings > Authorized domains.`;
      } else if (errCode === 'auth/popup-blocked') {
        userFriendlyMessage = lang === 'bn'
          ? 'ব্রাউজার পপআপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে এই সাইটের জন্য পপআপ অনুমতি দিন।'
          : 'The sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (errCode === 'auth/api-key-not-valid' || errMsg.includes('API key not valid')) {
        userFriendlyMessage = lang === 'bn'
          ? 'ফায়ারবেস এপিআই কী লোড হতে সমস্যা হয়েছে। অনুগ্রহ করে টার্মিনালে npm run dev কমান্ডটি রিস্টার্ট (Ctrl+C করে আবার চালু) করুন।'
          : 'Firebase API key could not be verified. Please restart your Vite dev server (Ctrl+C and npm run dev) to load the new .env credentials.';
      }

      triggerAlert(
        lang === 'bn' ? 'লগইন ব্যর্থ' : 'Login Failed',
        `${userFriendlyMessage}${errCode ? `\n[${errCode}]` : ''}`
      );
    } finally {
      setGoogleLoading(false);
    }
  };

 const handleGuestSignIn = () => {
 localStorage.setItem('local_guest_session', 'true');
 setUser({
 uid: 'local-guest-session',
 email: 'guest@challantrack.local',
 displayName: 'Guest Owner'
 } as any);
 };

 const handleSignOut = async () => {
 triggerConfirm(
 lang === 'bn' ? 'লগ আউট নিশ্চিতকরণ' : 'Confirm Sign Out',
 t.signOutConfirm,
 async () => {
 try {
 localStorage.removeItem('local_guest_session');
 setBiometricSessionUnlocked(false);
 setBiometricUnlocked(false);
 setUser(null);
 await signOut(auth);
 navigateTo('home', null, true);
 } catch (err) {
 console.error(err);
 }
 }
 );
 };

   // Nav helper
  const navigateToCustomer = (id: string, replace = false) => {
    setIsQuickEntryOpen(false);
    navigateTo('customers', id, replace);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-6 transition-colors">
        <Toaster 
          theme={theme} 
          position="bottom-center"
          duration={2500}
          toastOptions={{ 
            className: 'sonner-custom-toast border-2 border-slate-200 dark:border-slate-700/90 font-bold text-xs bg-white/95 dark:bg-[#0D121D]/95 backdrop-blur-md text-slate-950 dark:text-white shadow-xl rounded-xl px-3.5 py-2.5'
          }} 
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-10 h-10 border-2 border-black dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin" />
          <div>
            <h3 className="text-base font-bold text-black dark:text-white tracking-tight">{t.openingLedger}</h3>
            <p className="text-xs text-[#757575] mt-1">{t.applyingCloud}</p>
          </div>
        </div>
      </div>
    );
  }

 // --- 1. SIGN IN LANDING SCREEN (WITH TRANSLATIONS) ---
  if (!user) {
    return (
      <div id="auth_view" className="min-h-screen bg-white dark:bg-[#090D14] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 no-select transition-colors">
        <Toaster 
          theme={theme} 
          position="bottom-center"
          duration={2500}
          toastOptions={{ 
            className: 'sonner-custom-toast border-2 border-slate-200 dark:border-slate-700/90 font-bold text-xs bg-white/95 dark:bg-[#0D121D]/95 backdrop-blur-md text-slate-950 dark:text-white shadow-xl rounded-xl px-3.5 py-2.5'
          }} 
        />
        
        {/* Top Controls: Language & Theme Switchers */}
        <div className="w-full max-w-sm flex items-center justify-between mb-8">
          <button
            onClick={() => {
              triggerHaptic('single');
              handleThemeChange(theme === 'dark' ? 'light' : 'dark');
            }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-xs font-semibold transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-white" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            {theme === 'dark' ? (lang === 'bn' ? 'লাইট মোড' : 'Light Mode') : (lang === 'bn' ? 'ডার্ক মোড' : 'Dark Mode')}
          </button>

          <button
            onClick={() => {
              triggerHaptic('single');
              handleLangChange(lang === 'bn' ? 'en' : 'bn');
            }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </div>

        {/* Auth Card Container */}
        <div className="w-full max-w-sm bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 sm:p-8 space-y-6 shadow-xs">
          
          {/* Custom Challan Track Brand Header */}
          <div className="space-y-2">
            <ChallanTrackLogo size="lg" variant="full" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{t.ledgerForTablet}</p>
          </div>
          
          {/* Key Features List */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 rounded-md mt-0.5 shrink-0 border border-slate-200/60 dark:border-slate-800/60">
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.trackAndDeduct}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{t.trackDesc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 rounded-md mt-0.5 shrink-0 border border-slate-200/60 dark:border-slate-800/60">
                <Globe className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.cloudSync}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{t.cloudDesc}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 rounded-md mt-0.5 shrink-0 border border-slate-200/60 dark:border-slate-800/60">
                <Bell className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{t.simpleAlerts}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{t.alertsDesc}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white font-bold rounded-lg flex items-center justify-center gap-2.5 transition-colors cursor-pointer text-sm disabled:opacity-75 disabled:cursor-not-allowed select-none active:scale-[0.98] shadow-xs"
              id="google_signin_btn"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              {googleLoading ? (lang === 'bn' ? 'লগইন হচ্ছে...' : 'Signing in...') : t.googleSignIn}
            </button>
            
            <button
              onClick={handleGuestSignIn}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-lg flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800/80 transition-colors cursor-pointer text-sm select-none active:scale-[0.98]"
              id="guest_signin_btn"
            >
              {t.guestSignIn}
            </button>
          </div>

          {authError && (
            <div className="bg-[#FFF8E6] dark:bg-[#261E0A] border border-[#FFC043]/40 p-3.5 rounded-lg text-xs text-[#7A4B00] dark:text-[#FFD479] font-medium space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#FFC043]"></span>
                {lang === 'bn' ? 'লগইন সাহায্য নির্দেশিকা' : 'Google Login Troubleshooting'}
              </div>
              <p className="opacity-90">
                {lang === 'bn'
                  ? 'গুগল সাইন-ইন সম্পন্ন করতে আপনার ফায়ারবেস প্রজেক্টের "Authorized Domains" তালিকায় এই ডোমেনটি যুক্ত করতে হবে:'
                  : 'To complete Google Sign-In, you need to add this domain to your Firebase Authorized Domains list:'}
              </p>
              <div className="bg-white dark:bg-black p-2 rounded font-mono text-[11px] break-all select-all text-black dark:text-white border border-black/10 dark:border-white/15">
                {typeof window !== 'undefined' ? window.location.hostname : 'localhost'}
              </div>
              <p className="opacity-90 text-[11px]">
                {lang === 'bn'
                  ? 'ধাপ: Firebase Console > Authentication > Settings > Authorized Domains-এ গিয়ে উপরের ডোমেনটি যুক্ত করুন। অথবা গেস্ট মোড চাপুন।'
                  : 'Steps: Firebase Console > Authentication > Settings > Authorized Domains. Or use Guest Mode.'}
              </p>
            </div>
          )}

          {/* Secure Sync Notice */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-lg text-[11px] text-[#545454] dark:text-[#A6A6A6] font-medium leading-normal flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
            <span>
              {lang === 'bn' 
                ? 'ক্লাউড সিঙ্ক: আপনার হিসাব খাতার ডেটা সুরক্ষিত রাখতে গুগল দিয়ে নিরাপদে লগইন করুন।'
                : 'Cloud Sync: Sign in with Google to protect your ledger calculations and sync across devices.'}
            </span>
          </div>

          <div className="text-[10px] text-center text-[#757575] font-medium">
            {t.offlineNotice}
          </div>
        </div>
      </div>
 );
 }

 // --- 1.5 SEPARATE BIOMETRIC AUTHENTICATION LOGIN SCREEN ---
 if (user && isBiometricEnabled(user.uid) && !biometricUnlocked) {
   return (
     <>
       <Toaster 
         theme={theme} 
         position="bottom-center" 
         offset={{ bottom: 24 }}
         mobileOffset={{ bottom: 76, left: 16, right: 16 }}
         duration={2500}
         visibleToasts={2}
         gap={8}
         toastOptions={{ 
           className: 'sonner-custom-toast'
         }}
       />
       <BiometricLockScreen
         userId={user.uid}
         userEmail={user.email || 'ChallanTrack User'}
         userName={user.displayName || undefined}
         theme={theme}
         onToggleTheme={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
         lang={lang}
         onToggleLang={() => handleLangChange(lang === 'bn' ? 'en' : 'bn')}
         onUnlocked={() => setBiometricUnlocked(true)}
         onSignOut={async () => {
           try {
             localStorage.removeItem('local_guest_session');
             setBiometricSessionUnlocked(false);
             setBiometricUnlocked(false);
             setUser(null);
             await signOut(auth);
             navigateTo('home', null, true);
           } catch (err) {
             console.error(err);
           }
         }}
       />
     </>
   );
 }

 // --- 2. MAIN APP CONTAINER (LOGGED IN & TRANSLATED) ---
  return (
    <div className="min-h-screen bg-white dark:bg-[#090D14] text-slate-900 dark:text-slate-100 flex flex-col no-select pb-24 sm:pb-0 transition-colors">
      <Toaster 
        theme={theme} 
        position="bottom-center" 
        offset={{ bottom: 24 }}
        mobileOffset={{ bottom: 76, left: 16, right: 16 }}
        duration={2500}
        visibleToasts={2}
        gap={8}
        toastOptions={{ 
          className: 'sonner-custom-toast'
        }}
      />
      
      {/* 1-Row, 3-Zone Top Bar */}
      <header className="bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 py-3 px-4 sm:px-6 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          
          {/* Zone 1: Pure Typographic Logo */}
          <div 
            onClick={() => { triggerHaptic('single'); navigateTo('home'); }}
            className="flex items-center gap-3 cursor-pointer group select-none active:scale-[0.98] transition-transform"
            role="button"
            tabIndex={0}
            title={lang === 'bn' ? 'ড্যাশবোর্ডে ফিরে যান' : 'Go to Dashboard'}
          >
            <ChallanTrackLogo size="sm" variant="compact" />
          </div>

          {/* Zone 2: Desktop Navigation Bar */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-50 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => navigateTo('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                (currentTab === 'home' || currentTab === 'daily_transactions')
                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.dashboard}
            </button>
            <button
              onClick={() => navigateTo('customers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'customers'
                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.clients}
            </button>
            <button
              onClick={() => navigateTo('goals')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'goals'
                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.goals}
            </button>
            <button
              onClick={() => navigateTo('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.settings}
            </button>
          </nav>

          {/* Zone 3: Quick Action Triggers & Utilities */}
          <div className="flex items-center gap-2">
            <button
              onClick={openQuickEntry}
              className="hidden sm:flex px-3.5 py-2 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs rounded-xl items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-all border-2 border-slate-950 dark:border-white"
              id="top_quick_entry_btn"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{lang === 'bn' ? 'হিসাব লিখুন' : 'New Entry'}</span>
            </button>

            {/* Custom Accent & Theme Color Palette Trigger */}
            <button
              onClick={() => {
                triggerHaptic('single');
                setIsAccentModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white dark:bg-[#0D121D] hover:bg-slate-50 dark:hover:bg-slate-900 border-2 border-slate-300 hover:border-slate-800 dark:border-slate-700 dark:hover:border-slate-200 cursor-pointer transition-all shadow-2xs relative active:scale-95"
              title={lang === 'bn' ? 'থিম ও অ্যাকসেন্ট কালার পরিবর্তন' : 'Theme & Accent Palette'}
              id="header_accent_palette_btn"
            >
              <Palette className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            </button>

            {/* Reminders Header Action Button */}
            <button
              onClick={() => { triggerHaptic('single'); navigateTo('reminders'); }}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                currentTab === 'reminders'
                  ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white'
                  : 'bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 hover:border-slate-800 dark:border-slate-700 dark:hover:border-slate-200'
              }`}
              title={t.reminders}
              id="header_reminders_btn"
            >
              <Bell className="w-3.5 h-3.5 stroke-[2]" />
              <span className="hidden sm:inline">{t.reminders}</span>
              {reminders.filter(r => r.active).length > 0 && (
                <span 
                  className="w-2 h-2 rounded-full inline-block animate-pulse"
                  style={{ backgroundColor: 'var(--accent-color)' }}
                />
              )}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => {
                triggerHaptic('single');
                handleThemeChange(theme === 'dark' ? 'light' : 'dark');
              }}
              className="p-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 hover:border-slate-800 dark:border-slate-700 dark:hover:border-slate-200 cursor-pointer transition-colors shadow-2xs active:scale-95"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            {/* Language Toggle */}
            <button
              onClick={() => {
                triggerHaptic('single');
                handleLangChange(lang === 'bn' ? 'en' : 'bn');
              }}
              className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-300 hover:border-slate-800 dark:border-slate-700 dark:hover:border-slate-200 font-bold text-xs cursor-pointer transition-colors shadow-2xs active:scale-95"
            >
              {lang === 'bn' ? 'EN' : 'বাং'}
            </button>
          </div>

        </div>
      </header>

      {/* Main Core Content Stage */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 mb-16 sm:mb-24">
 
 {/* Loading overlay for operations */}
 {ledgerLoading && (
 <div className="text-center py-10 text-zinc-400 font-bold text-sm">
 {t.updatingBackup}
 </div>
 )}

 {/* Dynamic Route/Component loading */}
 {!ledgerLoading && (
 <div className="space-y-6">
 {currentTab === 'home' && (
 <Dashboard 
  customers={customers}
  transactions={todayTransactions}
  transactionsCount={settings?.transactionsCount || 0}
  monthlySummaries={monthlySummaries}
  onOpenQuickEntry={openQuickEntry}
  onSelectCustomer={navigateToCustomer}
  lang={lang}
  onViewDailyTxs={() => navigateTo('daily_transactions')}
  />
 )}

 {currentTab === 'customers' && (
 <CustomerManager 
 customers={customers}
 transactions={customerTransactions}
 createCustomer={createCustomer}
 addTransaction={addTransaction}
 editTransaction={editTransaction}
 deleteTransaction={deleteTransaction}
 updateCustomerDetails={updateCustomerDetails}
 deleteCustomer={deleteCustomer}
 selectedCustomerId={selectedCustomerIdForDetail}
 setSelectedCustomerId={(id) => navigateTo('customers', id)} hasMoreTxs={hasMoreCustomerTxs} loadMoreTransactions={loadMoreCustomerTransactions} customerTxLimit={customerTxLimit} resetCustomerTxLimit={resetCustomerTxLimit}
 activeCustomerTxCount={activeCustomerTxCount}
 lang={lang}
 triggerConfirm={triggerConfirm}
 swipeGesturesEnabled={swipeGesturesEnabled}
   highlightedTxId={highlightedTxId}
  setHighlightedTxId={setHighlightedTxId}
  />
 )}

 {currentTab === 'reminders' && (
 <RemindersManager 
 reminders={reminders}
 customers={customers}
 goals={goals}
 addReminder={addReminder}
 toggleReminder={toggleReminder}
 deleteReminder={deleteReminder}
 dailyReminderTime={settings?.dailyReminderTime || '09:00'}
updateSettings={updateSettings}
 lang={lang}
 />
 )}

 {currentTab === 'goals' && (
  <GoalsManager 
  goals={goals}
  goalsSynced={goalsSynced}
  customers={customers}
  createGoal={createGoal}
  addGoalContribution={addGoalContribution}
  deleteGoal={deleteGoal}
  updateGoalStatus={updateGoalStatus}
  updateGoalTitle={updateGoalTitle}
  updateGoalNotes={updateGoalNotes}
  editGoalContribution={editGoalContribution}
  deleteGoalContribution={deleteGoalContribution}
  reminders={reminders}
  addReminder={addReminder}
  deleteReminder={deleteReminder}
  lang={lang}
  />
  )}

  {currentTab === 'settings' && (
  <SettingsManager 
          theme={theme}
          settings={settings}
          updateTheme={handleThemeChange}
          customers={customers}
          exportBackup={exportBackup}
          rebuildMonthlySummaries={rebuildMonthlySummaries}
          onSignOut={handleSignOut}
          lang={lang}
          onLangChange={handleLangChange}
          deferredPrompt={deferredPrompt}
          onInstallComplete={() => setDeferredPrompt(null)}
          trashCustomers={trashCustomers}
          restoreCustomer={restoreCustomer}
          permanentlyDeleteCustomer={permanentlyDeleteCustomer}
          emptyTrash={emptyTrash}
          swipeGesturesEnabled={swipeGesturesEnabled}
          onSwipeGesturesToggle={(val) => {
            setSwipeGesturesEnabled(val);
            localStorage.setItem('swipe_gestures_enabled', val ? 'true' : 'false');
          }}
          importLedgerData={importLedgerData}
          userId={user?.uid}
          userEmail={user?.email || user?.displayName || 'ChallanTrack User'}
          archivedStatements={archivedStatements}
          onUpdateStatementAutoMerge={updateStatementAutoMerge}
          onExportArchivedStatements={exportArchivedStatements}
          onLockBiometricSession={() => {
            setBiometricSessionUnlocked(false);
            setBiometricUnlocked(false);
          }}
        />
  )}

      {currentTab === 'daily_transactions' && (
        <div className="space-y-4 no-select animate-reveal pb-24">
          
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 shrink-0">
            {/* Left side: Back Button & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateTo('home')}
                className="p-2.5 bg-slate-50 dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-black dark:text-white" />
              </button>
              <div>
                <p className="text-lg font-black text-black dark:text-white tracking-tight">
                  {selectedDailyDate.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Right side: Calendar Archive Button */}
            <div className="relative shrink-0">
              <input 
                ref={dateInputRef}
                type="date"
                value={getLocalDateString(selectedDailyDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setSelectedDailyDate(new Date(year, month - 1, day));
                  }
                }}
                className="absolute pointer-events-none opacity-0 w-0 h-0"
                style={{ top: 0, right: 0 }}
              />
              <button
                type="button"
                onClick={() => {
                  if (dateInputRef.current) {
                    try {
                      dateInputRef.current.showPicker();
                    } catch (err) {
                      dateInputRef.current.click();
                    }
                  }
                }}
                className="p-2.5 bg-slate-50 dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1F1F1F] transition-colors flex items-center justify-center text-black dark:text-white cursor-pointer"
                title={lang === 'bn' ? 'আর্কাইভ তারিখ নির্বাচন' : 'Select Archive Date'}
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Uber Base Horizontal Totals Summary Grid */}
          <div className="grid grid-cols-3 gap-0 bg-white dark:bg-[#0F1623] rounded-xl border border-slate-200 dark:border-slate-800/80 divide-x divide-slate-100 dark:divide-slate-800/80 overflow-hidden text-center">
            <div className="p-3.5 space-y-1">
              <div className="text-[11px] font-bold uppercase text-[#757575] tracking-wider">
                {lang === 'bn' ? 'মোট বকেয়া' : 'Total Dues'}
              </div>
              <div className="text-base sm:text-lg font-black text-[#DC2626] tabular-nums font-mono">
                +৳ {formatNumber(dailyTransactions.filter(tx => tx.type === 'due').reduce((sum, tx) => sum + tx.amount, 0), lang)}
              </div>
            </div>
            <div className="p-3.5 space-y-1">
              <div className="text-[11px] font-bold uppercase text-[#757575] tracking-wider">
                {lang === 'bn' ? 'মোট আদায়' : 'Total Got'}
              </div>
              <div className="text-base sm:text-lg font-black text-[#059669] tabular-nums font-mono">
                -৳ {formatNumber(dailyTransactions.filter(tx => tx.type === 'payment').reduce((sum, tx) => sum + tx.amount, 0), lang)}
              </div>
            </div>
            <div className="p-3.5 space-y-1">
              <div className="text-[11px] font-bold uppercase text-[#757575] tracking-wider">
                {lang === 'bn' ? 'মোট হিসাব' : 'Total Tx'}
              </div>
              <div className="text-base sm:text-lg font-black text-black dark:text-white tabular-nums font-mono">
                {formatNumber(dailyTransactions.length, lang)}
              </div>
            </div>
          </div>

          {/* Centered Reset to Today Button */}
          {selectedDailyDate.toDateString() !== new Date().toDateString() && (
            <div className="flex justify-center shrink-0">
              <button
                onClick={() => setSelectedDailyDate(new Date())}
                className="py-2 px-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-black dark:text-white border border-slate-200 dark:border-slate-800/80 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{lang === 'bn' ? 'আজকের দিনে ফিরে যান' : 'Back to Today'}</span>
              </button>
            </div>
          )}

          {/* Ledger Entries List */}
          <div className="bg-white dark:bg-[#0F1623] border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {dailyTransactions.length === 0 ? (
                <div className="py-16 text-center text-[#757575]">
                  <div className="flex flex-col items-center gap-3">
                    <ClipboardList className="w-10 h-10 stroke-[1.5]" />
                    <p className="font-semibold text-sm">
                      {selectedDailyDate.toDateString() === new Date().toDateString()
                        ? (lang === 'bn' ? 'আজ কোন লেনদেন হয়নি' : 'No transactions recorded today')
                        : (lang === 'bn' ? 'এই তারিখে কোন লেনদেন নেই' : 'No transactions recorded for this date')}
                    </p>
                  </div>
                </div>
              ) : (
                dailyTransactions.map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => navigateTo('customers', tx.customerId)}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-[#1F1F1F] transition-colors cursor-pointer flex items-center justify-between gap-4 animate-reveal"
                  >
                    {/* Left side details */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        tx.type === 'due' 
                          ? 'bg-[rgba(220, 38, 38, 0.08)] text-[#DC2626] dark:bg-[#DC2626]/20' 
                          : 'bg-[rgba(5, 150, 105, 0.08)] text-[#059669] dark:bg-[#059669]/20'
                      }`}>
                        {tx.type === 'due' 
                          ? <ArrowUpRight className="w-4 h-4 stroke-[2.5]" /> 
                          : <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-base font-bold text-black dark:text-white truncate">
                          {tx.customerName}
                        </div>
                        <div className="text-xs text-[#757575] truncate mt-0.5" title={tx.description}>
                          {tx.description || (tx.type === 'due' ? t.dueTrigger : t.paymentTrigger)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right side details */}
                    <div className="text-right shrink-0">
                      <div className={`font-black text-base sm:text-lg tabular-nums font-mono ${
                        tx.type === 'due' ? 'text-[#DC2626]' : 'text-[#059669]'
                      }`}>
                        {tx.type === 'due' ? '+' : '-'} ৳ {formatNumber(tx.amount, lang)}
                      </div>
                      <div className="text-xs text-[#757575] mt-0.5 font-medium tabular-nums flex items-center justify-end gap-1.5">
                        {tx.isEdited && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-500/10 dark:bg-slate-400/10 text-slate-500 dark:text-slate-400 leading-none">
                            {lang === 'bn' ? 'সম্পাদিত' : 'Edited'}
                          </span>
                        )}
                        <span>{new Date(parseFirestoreDate(tx.date)).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )}
  </main>

  {/* FLOATING QUICK ENTRY TRIGGER */}
  {(currentTab === 'home' || (currentTab === 'customers' && !selectedCustomerIdForDetail)) && (
    <button
      onClick={openQuickEntry}
      className="fixed w-13 h-13 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 rounded-2xl border-2 border-slate-900 dark:border-slate-100 flex items-center justify-center shadow-xl transition-all cursor-pointer z-40 bottom-20 right-5 sm:bottom-24 active:scale-95"
      title={t.recordEntry}
      id="fab_entry_btn"
    >
      <Plus className="w-6 h-6 stroke-[3]" />
    </button>
  )}

  {/* BOTTOM NAVIGATION TABS (Mobile Fintech Dock) */}
  <nav className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#07090E]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/80 py-2.5 px-4 z-40 md:hidden transition-colors">
    <div className="max-w-md mx-auto flex items-center justify-between">
      
      <button
        onClick={() => navigateTo('home')}
        className={`relative flex flex-col items-center justify-center gap-1 w-18 py-1 mx-auto cursor-pointer transition-colors ${
          (currentTab === 'home' || currentTab === 'daily_transactions')
            ? 'text-slate-950 dark:text-white font-black'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold'
        }`}
      >
        <LayoutDashboard className="w-4.5 h-4.5 stroke-[2.2]" />
        <span className="text-[10px]">{t.dashboard}</span>
        {(currentTab === 'home' || currentTab === 'daily_transactions') && (
          <span 
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        )}
      </button>

      <button
        onClick={() => navigateTo('customers')}
        className={`relative flex flex-col items-center justify-center gap-1 w-18 py-1 mx-auto cursor-pointer transition-colors ${
          currentTab === 'customers'
            ? 'text-slate-950 dark:text-white font-black'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold'
        }`}
        id="nav_customers_tab"
      >
        <Users className="w-4.5 h-4.5 stroke-[2.2]" />
        <span className="text-[10px]">{t.clients}</span>
        {currentTab === 'customers' && (
          <span 
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        )}
      </button>

      <button
        onClick={() => navigateTo('goals')}
        className={`relative flex flex-col items-center justify-center gap-1 w-18 py-1 mx-auto cursor-pointer transition-colors ${
          currentTab === 'goals'
            ? 'text-slate-950 dark:text-white font-black'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold'
        }`}
        id="nav_goals_tab"
      >
        <Goal className="w-4.5 h-4.5 stroke-[2.2]" />
        <span className="text-[10px]">{t.goals}</span>
        {currentTab === 'goals' && (
          <span 
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        )}
      </button>

      <button
        onClick={() => navigateTo('settings')}
        className={`relative flex flex-col items-center justify-center gap-1 w-18 py-1 mx-auto cursor-pointer transition-colors ${
          currentTab === 'settings'
            ? 'text-slate-950 dark:text-white font-black'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 font-semibold'
        }`}
        id="nav_settings_tab"
      >
        <Settings className="w-4.5 h-4.5 stroke-[2.2]" />
        <span className="text-[10px]">{t.settings}</span>
        {currentTab === 'settings' && (
          <span 
            className="absolute -bottom-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        )}
      </button>

    </div>
  </nav>

  {/* RENDER MASTER QUICK_ADD FORM MODAL */}
  <QuickEntryModal 
    isOpen={isQuickEntryOpen}
    onClose={closeQuickEntry}
    customers={customers}
    createCustomer={createCustomer}
    addTransaction={addTransaction}
    preselectedCustomerId={selectedCustomerIdForDetail || undefined}
    lang={lang}
    transactions={customerTransactions}
    onViewCustomer={navigateToCustomer}
    highlightedTxId={highlightedTxId}
    setHighlightedTxId={setHighlightedTxId}
  />

  {/* CUSTOM ACCENT COLOR PICKER MODAL */}
  <AccentColorPickerModal
    isOpen={isAccentModalOpen}
    onClose={() => setIsAccentModalOpen(false)}
    lang={lang}
  />

  {/* MOBILE / TABLET CALCULATOR NUMERIC KEYPAD (7-8-9 Top Row) */}
  <CalculatorKeypad lang={lang} />

  {/* UBER BASE DIALOG & CONFIRMATION MODALS */}
  {appDialog && appDialog.isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => { if (appDialog.type === 'alert') setAppDialog(null); }}
        className="absolute inset-0 bg-black/70 backdrop-blur-xs"
      />
      
      {/* Modal Dialog Body */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative z-10 text-center space-y-5"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">
            {appDialog.title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {appDialog.message}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {appDialog.type === 'confirm' && (
            <button
              type="button"
              onClick={() => {
                if (appDialog.onCancel) appDialog.onCancel();
                setAppDialog(null);
              }}
              className="flex-1 py-3 bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white shadow-2xs"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          )}
          <button
            type="button"
            onClick={appDialog.onConfirm}
            className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer border-2 border-slate-950 dark:border-white shadow-xs"
          >
            {lang === 'bn' ? 'ঠিক আছে' : 'OK'}
          </button>
        </div>
      </motion.div>
    </div>
  )}

  </div>
  );
}
