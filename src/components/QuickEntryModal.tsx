import React, { useState, useMemo } from 'react';
import { Customer, Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, UserPlus, Check, ArrowDownLeft, ArrowUpRight, ChevronLeft, AlertTriangle, Delete, BookUser } from 'lucide-react';
import { translations, formatNumber, formatIndianNumberString, Language } from '../lib/translations';
import { triggerHaptic } from '../lib/haptics';
import { toast } from 'sonner';
import { getPhoneticKey, matchesPhonetic } from '../lib/phonetics';
import ContactNumberPickerModal from './ContactNumberPickerModal';
import { cleanBangladeshiPhone } from '../lib/phoneUtils';

interface QuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  transactions: Transaction[];
  createCustomer: (name: string, phone: string) => Promise<string | null | undefined>;
  addTransaction: (
    customerId: string, 
    type: 'due' | 'payment', 
    amount: number, 
    description: string,
    date?: Date,
    fallbackCustomerInfo?: { name: string; phone: string }
  ) => Promise<void>;
  preselectedCustomerId?: string;
  onViewCustomer?: (id: string, replace?: boolean) => void;
  lang: Language;
  highlightedTxId?: string | null;
  setHighlightedTxId?: (id: string | null) => void;
}

export default function QuickEntryModal({
  isOpen,
  onClose,
  customers,
  transactions,
  createCustomer,
  addTransaction,
  preselectedCustomerId,
  onViewCustomer,
  lang,
  highlightedTxId = null,
  setHighlightedTxId = () => {}
}: QuickEntryModalProps) {
 const t = translations[lang];

  const submitBtnRef = React.useRef<HTMLButtonElement>(null);
  const formScrollRef = React.useRef<HTMLDivElement>(null);
  const [type, setType] = useState<'due' | 'payment'>('due');
  const [duplicateTxWarning, setDuplicateTxWarning] = useState<Transaction | null>(null);
  const [hasShownDuplicateWarning, setHasShownDuplicateWarning] = useState(false);


 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
 const [customerNameInput, setCustomerNameInput] = useState('');
 const [customerPhoneInput, setCustomerPhoneInput] = useState('');
 const [pendingContactChoice, setPendingContactChoice] = useState<{
   contactName: string;
   numbers: string[];
   onSelect: (number: string) => void;
 } | null>(null);
 const [showAddNewCustomer, setShowAddNewCustomer] = useState(false);
 const [showAllCustomers, setShowAllCustomers] = useState(false);
 
 const [amountInput, setAmountInput] = useState('');
 const [description, setDescription] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [errorMsg, setErrorMsg] = useState('');

 // Frozen snapshot of customer IDs sorted by recency, captured when the modal opens.
 // Using a frozen order means live updatedAt changes (e.g. from a just-confirmed
 // transaction) don't rearrange the grid while the modal is still visible.
 const [frozenCustomerOrder, setFrozenCustomerOrder] = useState<string[]>([]);

 // Keep state in sync when preselectedCustomerId or open state changes
 React.useEffect(() => {
 if (isOpen) {
   setSelectedCustomerId(preselectedCustomerId || '');
   setErrorMsg('');
   setAmountInput('');
   setDescription('');
   setSearchQuery('');
   setShowAddNewCustomer(false);
   setShowAllCustomers(false);
   // Snapshot the current recency-sorted order so it stays stable for this session
   const sorted = [...customers].sort((a, b) => {
     const getRecency = (c: Customer) => {
       const d = c.updatedAt ?? c.createdAt;
       return d ? new Date(d).getTime() : 0;
     };
     return getRecency(b) - getRecency(a);
   });
   setFrozenCustomerOrder(sorted.map(c => c.id));
 }
 }, [isOpen, preselectedCustomerId]);

 React.useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = '';
 }
 return () => { document.body.style.overflow = ''; };
 }, [isOpen]);

 const handlePickContact = async () => {
   if (typeof navigator !== 'undefined' && 'contacts' in navigator && (navigator as any).contacts?.select) {
     try {
       const props = ['name', 'tel'];
       const options = { multiple: false };
       const contacts = await (navigator as any).contacts.select(props, options);
       if (contacts && contacts.length > 0) {
         const contact = contacts[0];
         const rawName = (contact.name && contact.name[0]) ? contact.name[0] : '';
         const rawTels: string[] = contact.tel || [];

         // Clean all numbers (stripping +88 / +880) and deduplicate
         const cleanedNumbers = Array.from(new Set(
           rawTels
             .map(t => cleanBangladeshiPhone(t))
             .filter(t => t.length > 0)
         ));

         if (cleanedNumbers.length === 0) {
           toast.error(lang === 'bn' ? 'কোনো ফোন নম্বর পাওয়া যায়নি।' : 'No phone number found in this contact.');
           return;
         }

         // If contact has multiple numbers, open modern choice modal!
         if (cleanedNumbers.length > 1) {
           triggerHaptic('single');
           setPendingContactChoice({
             contactName: rawName,
             numbers: cleanedNumbers,
             onSelect: (chosen: string) => {
               setCustomerPhoneInput(chosen);
               if (rawName && !customerNameInput.trim()) setCustomerNameInput(rawName);
               toast.success(lang === 'bn' ? 'নম্বর সফলভাবে নেওয়া হয়েছে' : 'Contact number selected');
             }
           });
           return;
         }

         // Exactly one number: set directly
         const singleNumber = cleanedNumbers[0];
         setCustomerPhoneInput(singleNumber);
         if (rawName && !customerNameInput.trim()) {
           setCustomerNameInput(rawName);
         }
         triggerHaptic('single');
         toast.success(lang === 'bn' ? 'নম্বর সফলভাবে নেওয়া হয়েছে' : 'Contact number selected');
       }
     } catch (err: any) {
       if (err?.name !== 'AbortError') {
         console.warn("Contact picker failed or was cancelled:", err);
       }
     }
   } else {
     triggerHaptic('double');
     toast.info(lang === 'bn' 
       ? 'কন্টাক্ট পিকারটি শুধুমাত্র সমর্থিত মোবাইল ব্রাউজারে উপলব্ধ।' 
       : 'Contact picker is only supported on mobile browsers (like Chrome on Android).');
   }
 };

 // Handle customer selection list — order is frozen to the snapshot taken at modal open.
 // This prevents a just-confirmed customer from visibly jumping to the top mid-session.
 const filteredCustomers = useMemo(() => {
    const list = searchQuery.trim() === ''
      ? customers
      : customers.filter(c => {
          return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (c.phone && c.phone.includes(searchQuery)) ||
                 matchesPhonetic(c.name, searchQuery);
        });
   return [...list].sort((a, b) => {
     const idxA = frozenCustomerOrder.indexOf(a.id);
     const idxB = frozenCustomerOrder.indexOf(b.id);
     // Known IDs sort by frozen position; any new ID (added mid-session) goes to the end
     const posA = idxA === -1 ? Infinity : idxA;
     const posB = idxB === -1 ? Infinity : idxB;
     return posA - posB;
   });
 }, [customers, searchQuery, frozenCustomerOrder]);

 const currentCustomer = customers.find(c => c.id === selectedCustomerId);

 const handleQuickAddAmount = (add: number) => {
 const cleaned = amountInput.replace(/,/g, '');
 const current = parseFloat(cleaned) || 0;
 const newVal = (current + add).toString();
 setAmountInput(formatIndianNumberString(newVal));
 };

   const getDuplicate = () => {
    if (!selectedCustomerId || !amountInput) return null;
    const cleaned = amountInput.replace(/,/g, '');
    const amountVal = parseFloat(cleaned);
    if (isNaN(amountVal) || amountVal <= 0) return null;

    const parseDate = (d: any): Date => {
      if (!d) return new Date();
      if (d instanceof Date) return d;
      if (typeof d.toDate === 'function') return d.toDate();
      if (d.seconds !== undefined) return new Date(d.seconds * 1000);
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    let customerTxs = transactions.filter(t => t.customerId === selectedCustomerId);
    if (customerTxs.length === 0 && typeof localStorage !== 'undefined') {
      try {
        const customer = customers.find(c => c.id === selectedCustomerId);
        const userId = customer?.userId;
        if (userId) {
          const cached = localStorage.getItem(`easy_due_txs_${userId}_${selectedCustomerId}`);
          if (cached) {
            customerTxs = JSON.parse(cached);
          } else {
            const allStored = localStorage.getItem(`easy_due_transactions_${userId}`);
            if (allStored) {
              customerTxs = JSON.parse(allStored).filter((t: any) => t.customerId === selectedCustomerId);
            }
          }
        }
      } catch (e) {}
    }

    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    return customerTxs.find(t => {
      const tDate = parseDate(t.createdAt || t.date);
      return t.type === type && 
             Math.abs(t.amount - amountVal) < 0.01 && 
             (now - tDate.getTime()) < twentyFourHoursMs;
    }) || null;
  };

  const executeSave = async (bypassDuplicateCheck = false) => {
    setErrorMsg('');

    let custId = selectedCustomerId;
    const cleanedAmount = amountInput.replace(/,/g, '');
    const amountVal = parseFloat(cleanedAmount);

    if (!amountVal || amountVal <= 0) {
      setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে সঠিক পরিমাণ দিন (০ টাকার বেশি)' : 'Please enter a valid amount (greater than 0)');
      return;
    }

    if (!bypassDuplicateCheck && !hasShownDuplicateWarning) {
      const duplicate = getDuplicate();
      if (duplicate) {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        setDuplicateTxWarning(duplicate);
        return;
      }
    }

    setIsSubmitting(true);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    try {
      if (showAddNewCustomer) {
        if (!customerNameInput.trim()) {
          setErrorMsg(lang === 'bn' ? 'গ্রাহকের নাম খালি থাকতে পারবে না' : 'Customer name cannot be empty');
          setIsSubmitting(false);
          return;
        }
        
        try {
          // Create customer first
          const newId = await createCustomer(customerNameInput, customerPhoneInput);
          if (newId) {
            custId = newId;
          } else {
            throw new Error('Failed to create customer');
          }
        } catch (err: any) {
          if (err.message === 'DUPLICATE_NAME') {
            setErrorMsg(lang === 'bn' ? 'এই নামের গ্রাহক ইতিমধ্যে খতিয়ানে সংরক্ষিত আছে।' : 'A customer with this name already exists.');
          } else {
            setErrorMsg(lang === 'bn' ? 'গ্রাহক তৈরি করতে সমস্যা হয়েছে।' : 'Failed to create customer.');
          }
          setIsSubmitting(false);
          return;
        }
      }

      if (!custId) {
        setErrorMsg(lang === 'bn' ? 'অনুগ্রহ করে একজন গ্রাহক নির্বাচন করুন বা নতুনভাবে যুক্ত করুন' : 'Please select or add a customer first');
        setIsSubmitting(false);
        return;
      }

      // Pass fallbackCustomerInfo to bypass React state re-render delay
      const fallbackCustomer = showAddNewCustomer 
        ? { name: customerNameInput, phone: customerPhoneInput } 
        : undefined;

      await Promise.all([
        addTransaction(custId, type, amountVal, description, new Date(), fallbackCustomer),
        new Promise(resolve => setTimeout(resolve, 600))
      ]);
      
      // Reset & Close
      setType('due');
      setSearchQuery('');
      setSelectedCustomerId('');
      setCustomerNameInput('');
      setCustomerPhoneInput('');
      setShowAddNewCustomer(false);
      setAmountInput('');
      setDescription('');
      setDuplicateTxWarning(null);
      setHasShownDuplicateWarning(false);
      onClose();
      toast.success(lang === 'bn' ? 'হিসাব সফলভাবে যোগ হয়েছে' : 'Transaction saved successfully');
    } catch (err) {
      console.error(err);
      setErrorMsg(lang === 'bn' ? 'হিসাব সংরক্ষণে ত্রুটি ঘটেছে। পুনরায় চেষ্টা করুন।' : 'Error saving. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeSave(false);
  };

 if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-select overflow-y-auto hide-scrollbar">
      <div 
        className="bg-white dark:bg-[#0D121D] w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-reveal"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
            {t.quickEntryTitle}
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white rounded-lg text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Close"
            id="close_modal_btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
          
          {/* Scrollable Form Fields */}
          <div ref={formScrollRef} className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-5">
            {/* 1. ENTRY TYPE SELECTION (CLICKABLE PANELS WITH BOLD BORDERS) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
                {t.chooseType}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('due')}
                  className={`py-4 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer shadow-2xs ${
                    type === 'due'
                      ? 'bg-[#FFECEB] border-[#DC2626] text-[#DC2626] dark:bg-[#DC2626]/20 dark:text-[#FF6B5B] dark:border-[#DC2626] font-bold ring-2 ring-[#DC2626]/20'
                      : 'bg-white dark:bg-[#0D121D] border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-800 dark:hover:border-slate-200'
                  }`}
                  id="tab_give_due"
                >
                  <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-base font-bold">{t.giveDue}</span>
                  <span className="text-[11px] opacity-80">{lang === 'bn' ? 'গ্রাহক পরে পেমেন্ট দেবে' : 'Customer owes you'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setType('payment')}
                  className={`py-4 px-3 rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer shadow-2xs ${
                    type === 'payment'
                      ? 'bg-[#E6F7EF] border-[#059669] text-[#059669] dark:bg-[#059669]/20 dark:text-[#38D388] dark:border-[#059669] font-bold ring-2 ring-[#059669]/20'
                      : 'bg-white dark:bg-[#0D121D] border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-800 dark:hover:border-slate-200'
                  }`}
                  id="tab_get_payment"
                >
                  <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                  <span className="text-base font-bold">{t.getPayment}</span>
                  <span className="text-[11px] opacity-80">{lang === 'bn' ? 'গ্রাহক নগদ পরিশোধ করল' : 'Customer paid you'}</span>
                </button>
              </div>
            </div>

          {/* 2. CUSTOMER CHIP SELECTION OR INLINE ADD */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#757575] uppercase tracking-wider block">
                {lang === 'bn' ? 'গ্রাহক নির্বাচন' : 'Customer Account'}
              </span>
              <button
                type="button"
                onClick={() => setShowAddNewCustomer(!showAddNewCustomer)}
                className="text-black dark:text-white font-bold text-xs flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                id="toggle_new_cust_btn"
              >
                {showAddNewCustomer ? (
                  <span className="flex items-center gap-1">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>{lang === 'bn' ? 'তালিকায় ফিরুন' : 'Back to List'}</span>
                  </span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    {lang === 'bn' ? 'নতুন গ্রাহক যোগ' : 'Add New Customer'}
                  </>
                )}
              </button>
            </div>

            {!showAddNewCustomer ? (
              <div className="space-y-2.5">
                {/* Select Customer search with bold input border */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'bn' ? 'গ্রাহক পছন্দ করতে খুঁজুন...' : 'Search customer...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white text-sm focus:border-slate-950 dark:focus:border-white focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('tick');
                        setSearchQuery('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                      title={lang === 'bn' ? 'খালি করুন' : 'Clear search'}
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Customer Names Grid (Clickable Panels with Bold Borders) */}
                <div className="relative pt-0.5">
                  <div className="grid grid-cols-2 gap-2">
                    {(showAllCustomers ? filteredCustomers : filteredCustomers.slice(0, 6)).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(selectedCustomerId === c.id ? '' : c.id)}
                        className={`p-2.5 text-left rounded-xl border-2 transition-all text-xs truncate flex items-center justify-between cursor-pointer ${
                          selectedCustomerId === c.id
                            ? 'bg-slate-950 text-white border-slate-950 font-bold dark:bg-white dark:text-slate-950 dark:border-white shadow-xs'
                            : 'bg-white dark:bg-[#0D121D] hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200 text-slate-900 dark:text-white font-medium'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {selectedCustomerId === c.id && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                      </button>
                    ))}

                    {filteredCustomers.length === 0 && (
                      <div className="col-span-2 w-full text-center py-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                        {lang === 'bn' ? 'কোনো গ্রাহক মেলেনি। উপরে "+ নতুন গ্রাহক যোগ" চাপুন।' : 'No customer matches. Click "+ Add New Customer" above.'}
                      </div>
                    )}
                  </div>

                  {filteredCustomers.length > 6 && (
                    <div className="flex justify-end mt-2 pr-1">
                      <button
                        type="button"
                        onClick={() => setShowAllCustomers(!showAllCustomers)}
                        className="text-xs font-bold text-slate-950 dark:text-white hover:underline transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {showAllCustomers 
                          ? (lang === 'bn' ? 'কম দেখুন' : 'Show less') 
                          : (lang === 'bn' ? 'আরও দেখুন' : 'Show more')}
                        <svg className={`w-3.5 h-3.5 transition-transform ${showAllCustomers ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* INLINE NEW CUSTOMER FORM (WITH BOLD INPUT BORDERS) */
              <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.customerName}</label>
                  <input
                    type="text"
                    placeholder="e.g. Wahid Zaman"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white text-sm focus:border-slate-950 dark:focus:border-white outline-none font-medium transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.phoneNumber}</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="e.g. 01712345678"
                      value={customerPhoneInput}
                      onChange={(e) => setCustomerPhoneInput(cleanBangladeshiPhone(e.target.value))}
                      className="flex-1 px-3.5 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white text-sm focus:border-slate-950 dark:focus:border-white outline-none font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handlePickContact}
                      className="px-3 bg-white hover:bg-slate-100 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors shrink-0 font-bold text-xs"
                      title={lang === 'bn' ? 'কন্টাক্ট নির্বাচন করুন' : 'Pick Contact'}
                    >
                      <BookUser className="w-4 h-4" />
                      <span className="hidden sm:inline">{lang === 'bn' ? 'কন্টাক্ট' : 'Contacts'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. DUES OR TRANSACTION AMOUNT WITH BOLD BORDER */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t.amountLabel}
            </span>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">৳</span>
              <input
                type="text"
                inputMode="decimal"
                data-numpad="true"
                placeholder="0"
                value={amountInput}
                onChange={(e) => {
                  const val = e.target.value;
                  const clean = val.replace(/[^0-9.]/g, '');
                  const dots = clean.split('.');
                  let sanitized = clean;
                  if (dots.length > 2) {
                    sanitized = dots[0] + '.' + dots.slice(1).join('');
                  }
                  setAmountInput(formatIndianNumberString(sanitized));
                }}
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white font-black text-2xl tabular-nums font-mono focus:border-slate-950 dark:focus:border-white focus:outline-none transition-colors shadow-2xs"
                required
              />
            </div>

            {!isSubmitting && getDuplicate() && (
              <p className="text-xs font-bold text-[#FFC043] dark:text-[#FFD479] mt-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {t.duplicateRealtimeWarning}
              </p>
            )}

            {type === 'payment' && currentCustomer && (currentCustomer as any).outstandingDue > 0 && (
              <button 
                type="button"
                onClick={() => {
                  triggerHaptic('single');
                  const targetDue = (currentCustomer as any).outstandingDue;
                  const isChecked = amountInput.replace(/,/g, '') === targetDue.toString();
                  if (!isChecked) {
                    setAmountInput(formatIndianNumberString(targetDue.toString()));
                  } else {
                    setAmountInput('');
                  }
                }}
                className="w-full flex items-center text-left gap-2.5 mt-2 p-3 bg-white dark:bg-[#0D121D] rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200 cursor-pointer transition-colors select-none shadow-2xs"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-slate-950 dark:accent-white rounded cursor-pointer pointer-events-none"
                  checked={amountInput.replace(/,/g, '') === (currentCustomer as any).outstandingDue.toString()}
                  readOnly
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white select-none">
                  {lang === 'bn' ? 'সম্পূর্ণ বকেয়া পরিশোধ করুন' : 'Settle complete due'} (৳{formatNumber((currentCustomer as any).outstandingDue, lang)})
                </span>
              </button>
            )}

            {/* Speedy Pad helpers (Clickable panels with bold borders) */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[50, 100, 500, 1000, 5000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-200 transition-colors text-xs cursor-pointer tabular-nums font-mono shadow-2xs active:scale-95"
                >
                  +{formatNumber(val, lang)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountInput('')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-lg border-2 border-rose-300 dark:border-rose-900 transition-colors text-xs cursor-pointer active:scale-95"
              >
                {lang === 'bn' ? 'মুছুন' : 'Clear'}
              </button>
            </div>
          </div>

          {/* 4. OPTIONAL DESCRIPTION WITH BOLD BORDER */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t.notes}
            </span>
            <input
              type="text"
              placeholder={t.notesPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D121D] text-slate-950 dark:text-white text-sm focus:border-slate-950 dark:focus:border-white focus:outline-none transition-colors"
            />
          </div>

          </div>

          {/* Error Message & Actions Submit sticky bottom navbar */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D121D] shrink-0">
            {errorMsg && (
              <div className="p-3 mb-3 bg-[#FFECEB] dark:bg-[#DC2626]/20 rounded-xl text-[#DC2626] dark:text-[#FF6B5B] font-semibold text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              ref={submitBtnRef}
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-colors cursor-pointer select-none active:scale-[0.99] border-2 shadow-xs ${
                type === 'due' 
                  ? 'bg-[#DC2626] hover:bg-[#B81400] border-[#DC2626] text-white' 
                  : 'bg-[#059669] hover:bg-[#03723C] border-[#059669] text-white'
              } ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              id="save_transaction_btn"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {typeof navigator !== 'undefined' && navigator.onLine ? t.saving : t.speedyNotice}
                </span>
              ) : (
                type === 'due' ? t.confirmGive : t.confirmReceive
              )}
            </button>
          </div>

        </form>
 </div>
  {/* Duplicate Entry Warning Modal */}
  {duplicateTxWarning && (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white dark:bg-[#0D121D] w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-2xl p-6 relative"
      >
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-[#FFF8E6] dark:bg-amber-950/30 border border-[#FFC043]/40 rounded-xl flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6 text-[#7A4B00] dark:text-[#FFD479]" />
          </div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white mb-1.5">
            {t.duplicateWarningTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t.duplicateWarningDesc}
          </p>
          
          {/* Details Card */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 text-left space-y-2 mt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.type}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                duplicateTxWarning.type === 'due' 
                  ? 'bg-[#FFECEB] text-[#DC2626] dark:bg-[#DC2626]/20 dark:text-[#FF6B5B]' 
                  : 'bg-[#E6F7EF] text-[#059669] dark:bg-[#059669]/20 dark:text-[#38D388]'
              }`}>
                {duplicateTxWarning.type === 'due' ? t.duePlus : t.paymentMinus}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">{t.amount}</span>
              <span className={`text-sm font-black tabular-nums font-mono ${
                duplicateTxWarning.type === 'due' ? 'text-[#DC2626]' : 'text-[#059669]'
              }`}>
                ৳ {formatNumber(duplicateTxWarning.amount, lang)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (setHighlightedTxId) {
                setHighlightedTxId(duplicateTxWarning.id);
              }
              setDuplicateTxWarning(null);
              if (onViewCustomer) {
                onViewCustomer(selectedCustomerId, true);
              } else {
                onClose();
              }
            }}
            className="w-full py-3 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 border-2 border-slate-950 dark:border-white font-bold rounded-xl cursor-pointer text-xs transition-colors shadow-xs"
          >
            {t.viewExistingEntry}
          </button>
          <button
            type="button"
            onClick={async () => {
              setHasShownDuplicateWarning(true);
              setDuplicateTxWarning(null);
              await executeSave(true);
            }}
            className="w-full py-3 bg-white hover:bg-slate-50 dark:bg-[#0D121D] dark:hover:bg-slate-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white font-bold rounded-xl cursor-pointer text-xs transition-colors shadow-2xs"
          >
            {t.addAnyway}
          </button>
          <button
            type="button"
            onClick={() => {
              setDuplicateTxWarning(null);
            }}
            className="w-full py-2.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white font-bold cursor-pointer transition-colors"
          >
            {t.cancel}
          </button>
        </div>
      </motion.div>
    </div>
  )}

  {/* Modern Contact Phone Selector Modal */}
  {pendingContactChoice && (
    <ContactNumberPickerModal
      isOpen={true}
      contactName={pendingContactChoice.contactName}
      numbers={pendingContactChoice.numbers}
      onSelectNumber={(chosen) => {
        pendingContactChoice.onSelect(chosen);
        setPendingContactChoice(null);
      }}
      onClose={() => setPendingContactChoice(null)}
      lang={lang}
    />
  )}
 </div>
 );
}
