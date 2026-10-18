import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, LogOut, Sun, Moon, Globe, Loader2, Lock } from 'lucide-react';
import ChallanTrackLogo from './ChallanTrackLogo';
import { verifyBiometricCredential } from '../lib/biometrics';
import { triggerHaptic } from '../lib/haptics';
import { Language } from '../lib/translations';
import { toast } from 'sonner';

interface BiometricLockScreenProps {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  lang: Language;
  onLangChange: (lang: Language) => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onUnlocked: () => void;
  onSignOut: () => void;
}

export default function BiometricLockScreen({
  userId,
  userEmail,
  userName,
  lang,
  onLangChange,
  theme,
  onThemeChange,
  onUnlocked,
  onSignOut,
}: BiometricLockScreenProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuthenticate = async () => {
    if (verifying || verifiedSuccess) return;
    triggerHaptic('single');
    setVerifying(true);
    setErrorMsg(null);

    const res = await verifyBiometricCredential(userId);
    if (res.success) {
      setVerifiedSuccess(true);
      setVerifying(false);
      triggerHaptic('double');
      setTimeout(() => {
        onUnlocked();
      }, 320);
    } else {
      setVerifying(false);
      triggerHaptic([120, 80, 120]);
      setErrorMsg(
        lang === 'bn'
          ? 'বায়োমেট্রিক যাচাইকরণ সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Biometric verification was cancelled or failed. Please try again.'
      );
    }
  };

  // Automatically trigger biometric prompt once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAuthenticate();
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      id="biometric_auth_view"
      className="min-h-screen bg-white dark:bg-[#090D14] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 no-select transition-colors"
    >
      {/* Top Bar: Theme & Language Controls */}
      <div className="w-full max-w-sm flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('single');
            onThemeChange(theme === 'dark' ? 'light' : 'dark');
          }}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-white" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-700" />
          )}
          {theme === 'dark'
            ? lang === 'bn'
              ? 'লাইট মোড'
              : 'Light Mode'
            : lang === 'bn'
              ? 'ডার্ক মোড'
              : 'Dark Mode'}
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('single');
            onLangChange(lang === 'bn' ? 'en' : 'bn');
          }}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-lg font-bold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'bn' ? 'English' : 'বাংলা'}
        </button>
      </div>

      {/* Main Biometric Security Card */}
      <div className="w-full max-w-sm bg-white dark:bg-[#0D121D] border-2 border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl text-center">
        {/* Brand Header */}
        <div className="flex flex-col items-center space-y-2">
          <ChallanTrackLogo size="md" variant="compact" />
          <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold pt-1">
            <Lock className="w-3 h-3" />
            <span>{lang === 'bn' ? 'বায়োমেট্রিক নিরাপত্তা লক' : 'Biometric Security Lock'}</span>
          </div>
        </div>

        {/* Interactive Biometric Sensor Emblem */}
        <div className="py-4 flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={handleAuthenticate}
            disabled={verifying || verifiedSuccess}
            aria-label="Authenticate with Biometrics"
            className={`relative w-24 h-24 rounded-3xl border-2 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
              verifiedSuccess
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/15'
                : verifying
                  ? 'bg-slate-100 dark:bg-slate-900 border-slate-900 dark:border-white text-slate-900 dark:text-white animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800/80 border-slate-300 dark:border-slate-700 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white shadow-sm'
            }`}
          >
            {verifiedSuccess ? (
              <ShieldCheck className="w-11 h-11 stroke-[2]" />
            ) : (
              <Fingerprint className="w-11 h-11 stroke-[1.8]" />
            )}
          </button>

          <h2 className="text-lg font-extrabold text-slate-950 dark:text-white mt-4">
            {verifiedSuccess
              ? lang === 'bn'
                ? 'যাচাই সফল হয়েছে!'
                : 'Identity Verified!'
              : verifying
                ? lang === 'bn'
                  ? 'বায়োমেট্রিক যাচাই করা হচ্ছে...'
                  : 'Scanning Biometrics...'
                : lang === 'bn'
                  ? 'খতিয়ান আনলক করুন'
                  : 'Unlock Your Ledger'}
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[260px] leading-relaxed">
            {lang === 'bn'
              ? 'আপনার হিসাব খাতায় প্রবেশ করতে ফিঙ্গারপ্রিন্ট বা ফেস আইডি দিয়ে পরিচয় নিশ্চিত করুন।'
              : 'Verify with Fingerprint, Face ID, or device passkey to access your financial ledger.'}
          </p>
        </div>

        {/* Logged-in Account Identity Box */}
        <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-left flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
              {lang === 'bn' ? 'সক্রিয় অ্যাকাউন্ট' : 'Active Account'}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {userName || (lang === 'bn' ? 'সম্মানিত লেজার মালিক' : 'Business Owner')}
            </div>
            {userEmail && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {userEmail}
              </div>
            )}
          </div>
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--accent-color)' }}
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {/* Primary Unlock Button */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleAuthenticate}
            disabled={verifying || verifiedSuccess}
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 border-2 border-slate-950 dark:border-white cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'bn' ? 'যাচাই হচ্ছে...' : 'Verifying...'}</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4 stroke-[2.2]" />
                <span>
                  {lang === 'bn' ? 'বায়োমেট্রিক দিয়ে আনলক করুন' : 'Authenticate with Biometrics'}
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('single');
              onSignOut();
            }}
            className="w-full py-2.5 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'অন্য অ্যাকাউন্টে লগইন / লগআউট' : 'Switch Account / Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
