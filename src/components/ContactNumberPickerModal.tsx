import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Check, X, User, UserPlus, Smartphone, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { Language, formatNumber } from '../lib/translations';
import { cleanBangladeshiPhone, formatPhoneDisplay, getBdOperator } from '../lib/phoneUtils';

interface ContactNumberPickerModalProps {
  isOpen: boolean;
  contactName: string;
  numbers: string[];
  onSelectNumber: (number: string, finalName?: string) => void;
  onClose: () => void;
  lang: Language;
  isNewAccount?: boolean;
}

export default function ContactNumberPickerModal({
  isOpen,
  contactName,
  numbers,
  onSelectNumber,
  onClose,
  lang,
  isNewAccount = false
}: ContactNumberPickerModalProps) {
  // Deduplicate and clean all numbers (stripping +88/+880)
  const cleanedNumbers = Array.from(new Set(
    numbers.map(num => cleanBangladeshiPhone(num)).filter(num => num.length > 0)
  ));

  const [selectedNumber, setSelectedNumber] = useState<string>(cleanedNumbers[0] || '');
  const [editableName, setEditableName] = useState<string>(contactName || '');

  // Keep selected number and name updated when props change
  useEffect(() => {
    if (cleanedNumbers.length > 0) {
      setSelectedNumber(cleanedNumbers[0]);
    }
    setEditableName(contactName || '');
  }, [numbers, contactName]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedNumber) return;
    triggerHaptic('single');
    const finalName = editableName.trim() || contactName.trim() || selectedNumber;
    onSelectNumber(selectedNumber, finalName);
    onClose();
  };

  const handleSelectCard = (num: string) => {
    triggerHaptic('single');
    setSelectedNumber(num);
  };

  const firstLetter = (editableName || contactName || '?').trim().charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-select overflow-hidden">
        <div className="absolute inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="bg-white dark:bg-[#0D121D] w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative z-10"
        >
          {/* Mobile Top Indicator Bar */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-black text-base flex items-center justify-center shrink-0">
                {firstLetter}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-950 dark:text-white truncate">
                    {editableName || contactName || (lang === 'bn' ? 'নির্বাচিত কন্টাক্ট' : 'Selected Contact')}
                  </h3>
                  {isNewAccount && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6F7EF] text-[#059669] dark:bg-[#059669]/20 dark:text-[#38D388] shrink-0">
                      {lang === 'bn' ? 'নতুন হিসাব' : 'New Account'}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  {cleanedNumbers.length > 1
                    ? (lang === 'bn'
                        ? `${formatNumber(cleanedNumbers.length, 'bn')}টি নম্বর পাওয়া গেছে • ১টি নির্বাচন করুন`
                        : `${cleanedNumbers.length} numbers found • Select one`)
                    : (lang === 'bn' ? '১টি নম্বর পাওয়া গেছে' : '1 phone number found')}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-white hover:bg-slate-100 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto hide-scrollbar">
            {/* Optional Customer Name Edit Field when creating new account */}
            {isNewAccount && (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {lang === 'bn' ? 'গ্রাহকের নাম (প্রয়োজনে পরিবর্তন করতে পারেন)' : 'Customer Name (Edit if needed)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editableName}
                    onChange={(e) => setEditableName(e.target.value)}
                    placeholder="e.g. Kashem Ali"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0D121D] border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-medium text-sm focus:border-slate-950 dark:focus:border-white outline-none transition-colors"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Instruction description */}
            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {cleanedNumbers.length > 1
                ? (lang === 'bn'
                    ? 'এই কন্টাক্টটিতে একাধিক নম্বর রয়েছে। আপনি যে নম্বরটি ব্যবহার করতে চান সেটি বেছে নিন:'
                    : 'This contact has multiple phone numbers. Choose the number to link:')
                : (lang === 'bn'
                    ? 'নিচের নম্বরটি যাচাই করে নিশ্চিত করুন:'
                    : 'Verify the phone number below and confirm:')}
            </div>

            {/* Phone Number Cards */}
            <div className="space-y-2.5">
              {cleanedNumbers.map((num) => {
                const isSelected = selectedNumber === num;
                const operator = getBdOperator(num);
                const displayFormatted = formatPhoneDisplay(num);

                return (
                  <div
                    key={num}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectCard(num)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectCard(num);
                      }
                    }}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 touch-manipulation select-none active:scale-[0.99] shadow-2xs ${
                      isSelected
                        ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white'
                        : 'bg-white border-slate-300 dark:bg-[#0D121D] dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Left: Radio Indicator & Formatted Number */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Radio Circle */}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected 
                          ? 'border-white bg-white dark:border-slate-950 dark:bg-slate-950' 
                          : 'border-slate-400 dark:border-slate-500 bg-transparent'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950 dark:bg-white" />}
                      </div>

                      <div className="min-w-0">
                        <div className={`font-mono text-base font-black tracking-wide truncate ${isSelected ? 'text-white dark:text-slate-950' : 'text-slate-950 dark:text-white'}`}>
                          {displayFormatted}
                        </div>
                        <div className={`text-[11px] font-medium mt-0.5 flex items-center gap-1 ${isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'}`}>
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{num}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Operator Badge */}
                    <div className="shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border tracking-wide inline-block ${
                        isSelected 
                          ? 'bg-slate-800 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:border-slate-300' 
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700'
                      }`}>
                        {operator.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D121D] space-y-2 shrink-0">
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 border-2 border-slate-950 dark:border-white font-bold rounded-xl text-sm cursor-pointer transition-colors flex items-center justify-center gap-2 touch-manipulation active:scale-[0.99] shadow-xs"
            >
              {isNewAccount ? (
                <>
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'bn' ? 'অ্যাকাউন্ট তৈরি ও নিশ্চিত করুন' : 'Confirm & Open Account'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{lang === 'bn' ? 'এই নম্বরটি নির্বাচন করুন' : 'Confirm & Use Number'}</span>
                </>
              )}
            </button>

            {isNewAccount && (
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'bn'
                  ? 'গ্রাহকটি সংরক্ষিত হবে এবং খতিয়ান প্রোফাইলটি সরাসরি ওপেন হবে'
                  : 'Customer account will be saved and opened immediately'}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white font-bold rounded-xl text-xs cursor-pointer transition-colors shadow-2xs"
            >
              {lang === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
