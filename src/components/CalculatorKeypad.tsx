import React, { useState, useEffect, useRef } from 'react';
import { Delete, Check, Calculator, X } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';
import { Language } from '../lib/translations';

interface CalculatorKeypadProps {
  lang: Language;
}

function setReactInputValue(input: HTMLInputElement, newValue: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, newValue);
  } else {
    input.value = newValue;
  }
  const event = new Event('input', { bubbles: true });
  input.dispatchEvent(event);
}

function isTouchMobileOrTablet(): boolean {
  if (typeof window === 'undefined') return false;
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isFineDesktop =
    window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches &&
    !isCoarse &&
    window.innerWidth > 1024;
  if (isFineDesktop) return false;
  return isCoarse || (hasTouch && window.innerWidth <= 1024);
}

function isTargetNumericInput(el: Element | null): el is HTMLInputElement {
  if (!el || el.tagName !== 'INPUT') return false;
  const input = el as HTMLInputElement;
  if (input.readOnly || input.disabled) return false;
  if (input.dataset.numpad === 'false') return false;
  if (input.dataset.numpad === 'true') return true;
  const origMode = input.dataset.origInputmode || input.getAttribute('inputmode') || '';
  if (origMode === 'decimal' || origMode === 'numeric') return true;
  if (input.type === 'number') return true;
  return false;
}

export default function CalculatorKeypad({ lang }: CalculatorKeypadProps) {
  const [activeInput, setActiveInput] = useState<HTMLInputElement | null>(null);
  const [expressionLeft, setExpressionLeft] = useState<number | null>(null);
  const [operator, setOperator] = useState<'+' | '-' | null>(null);
  const [rightBuffer, setRightBuffer] = useState<string>('');
  const keypadRef = useRef<HTMLDivElement>(null);
  const hardwareKeyDetectedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If user types on a physical keyboard, dismiss the virtual keypad
      if (
        e.isTrusted &&
        (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Enter' || e.key === 'Tab')
      ) {
        hardwareKeyDetectedRef.current = true;
        if (activeInput) {
          const orig = activeInput.dataset.origInputmode;
          if (orig) activeInput.setAttribute('inputmode', orig);
          setActiveInput(null);
        }
      }
    };

    const handleTouchStartGlobal = () => {
      hardwareKeyDetectedRef.current = false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('touchstart', handleTouchStartGlobal, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('touchstart', handleTouchStartGlobal);
    };
  }, [activeInput]);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (!isTouchMobileOrTablet() || hardwareKeyDetectedRef.current) return;
      const target = e.target as Element | null;
      if (isTargetNumericInput(target)) {
        // Save original inputmode and suppress native OS keyboard on touch devices
        if (!target.dataset.origInputmode) {
          target.dataset.origInputmode = target.getAttribute('inputmode') || 'decimal';
        }
        target.setAttribute('inputmode', 'none');
        setActiveInput(target);
        setExpressionLeft(null);
        setOperator(null);
        setRightBuffer('');

        setTimeout(() => {
          try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch {
            // ignore scroll errors
          }
        }, 120);
      } else if (
        target &&
        keypadRef.current &&
        !keypadRef.current.contains(target) &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        setActiveInput(null);
      }
    };

    const handlePointerDownOutside = (e: MouseEvent | TouchEvent) => {
      if (!activeInput) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (keypadRef.current && keypadRef.current.contains(target)) return;
      if (activeInput.contains(target)) return;
      if (target instanceof Element && isTargetNumericInput(target)) return;
      setActiveInput(null);
    };

    // Pre-mark numeric inputs on touch devices so the first tap doesn't flash the OS keyboard
    const prepareNumericInputs = () => {
      if (!isTouchMobileOrTablet() || hardwareKeyDetectedRef.current) return;
      const inputs = document.querySelectorAll('input');
      inputs.forEach((inp) => {
        if (isTargetNumericInput(inp)) {
          if (!inp.dataset.origInputmode) {
            inp.dataset.origInputmode = inp.getAttribute('inputmode') || 'decimal';
          }
          if (inp.getAttribute('inputmode') !== 'none') {
            inp.setAttribute('inputmode', 'none');
          }
        }
      });
    };

    prepareNumericInputs();
    const observer = new MutationObserver(() => {
      prepareNumericInputs();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('mousedown', handlePointerDownOutside, true);
    document.addEventListener('touchstart', handlePointerDownOutside, { capture: true, passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('mousedown', handlePointerDownOutside, true);
      document.removeEventListener('touchstart', handlePointerDownOutside, true);
    };
  }, [activeInput]);

  // Close keypad if the activeInput is unmounted from DOM (e.g. modal closed)
  useEffect(() => {
    if (!activeInput) return;
    const interval = setInterval(() => {
      if (!document.body.contains(activeInput)) {
        setActiveInput(null);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [activeInput]);

  if (!activeInput || !isTouchMobileOrTablet()) return null;

  const allowDecimals =
    (activeInput.dataset.origInputmode || 'decimal') === 'decimal' &&
    activeInput.dataset.integerOnly !== 'true';

  const getRawString = () => {
    return (activeInput.value || '').replace(/,/g, '').replace(/[^0-9.]/g, '');
  };

  const applyNewRawString = (raw: string) => {
    setReactInputValue(activeInput, raw);
  };

  const handleDigit = (digitStr: string) => {
    triggerHaptic('tick');

    if (operator !== null && expressionLeft !== null) {
      let nextRight = rightBuffer;
      if (digitStr === '.') {
        if (!allowDecimals || nextRight.includes('.')) return;
        nextRight = nextRight === '' ? '0.' : nextRight + '.';
      } else {
        if (nextRight === '0' && digitStr !== '.') {
          nextRight = digitStr === '00' ? '0' : digitStr;
        } else {
          nextRight = nextRight + digitStr;
        }
      }
      setRightBuffer(nextRight);
      const rightNum = parseFloat(nextRight) || 0;
      const computed =
        operator === '+'
          ? Math.round((expressionLeft + rightNum) * 100) / 100
          : Math.max(0, Math.round((expressionLeft - rightNum) * 100) / 100);
      applyNewRawString(String(computed));
      return;
    }

    const current = getRawString();
    if (digitStr === '.') {
      if (!allowDecimals || current.includes('.')) return;
      const next = current === '' ? '0.' : current + '.';
      applyNewRawString(next);
      return;
    }

    let next = current;
    if (current === '0') {
      next = digitStr === '00' ? '0' : digitStr;
    } else {
      next = current + digitStr;
    }
    applyNewRawString(next);
  };

  const handleBackspace = () => {
    triggerHaptic('tick');
    if (operator !== null && expressionLeft !== null) {
      if (rightBuffer.length > 0) {
        const nextRight = rightBuffer.slice(0, -1);
        setRightBuffer(nextRight);
        const rightNum = parseFloat(nextRight) || 0;
        const computed =
          nextRight === ''
            ? expressionLeft
            : operator === '+'
              ? Math.round((expressionLeft + rightNum) * 100) / 100
              : Math.max(0, Math.round((expressionLeft - rightNum) * 100) / 100);
        applyNewRawString(String(computed));
      } else {
        setOperator(null);
        setExpressionLeft(null);
      }
      return;
    }

    const current = getRawString();
    const next = current.slice(0, -1);
    applyNewRawString(next);
  };

  const handleClear = () => {
    triggerHaptic('single');
    setExpressionLeft(null);
    setOperator(null);
    setRightBuffer('');
    applyNewRawString('');
  };

  const handleOperator = (op: '+' | '-') => {
    triggerHaptic('single');
    const currentNum = parseFloat(getRawString()) || 0;
    setExpressionLeft(currentNum);
    setOperator(op);
    setRightBuffer('');
  };

  const handleDone = () => {
    triggerHaptic('single');
    setExpressionLeft(null);
    setOperator(null);
    setRightBuffer('');
    activeInput.blur();
    setActiveInput(null);
  };

  return (
    <div
      ref={keypadRef}
      onMouseDown={(e) => e.preventDefault()} // Keep input focused while tapping keys
      className="fixed inset-x-0 bottom-0 z-[70] bg-white/98 dark:bg-[#0B0F19]/98 backdrop-blur-md border-t-2 border-slate-300 dark:border-slate-700 shadow-2xl p-3 pb-4 sm:max-w-md sm:mx-auto sm:rounded-t-2xl sm:border-x-2 no-select animate-reveal"
    >
      {/* Top Bar: Calculator Display / Active Input Preview & Close */}
      <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Calculator className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
            {operator !== null && expressionLeft !== null ? (
              <span>
                {expressionLeft} {operator} {rightBuffer || '0'} ={' '}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {activeInput.value || '0'}
                </strong>
              </span>
            ) : (
              <span>
                {lang === 'bn' ? 'সংখ্যা কিবোর্ড:' : 'Calculator Pad:'}{' '}
                <strong className="text-slate-950 dark:text-white">
                  {activeInput.value || '0'}
                </strong>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDone}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 cursor-pointer"
          aria-label="Close Keypad"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Calculator Grid: 7 8 9 on Top Row */}
      <div className="grid grid-cols-4 gap-2">
        {/* ROW 1: 7 8 9 Backspace */}
        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-lg font-extrabold flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={handleBackspace}
          className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
          aria-label="Backspace"
        >
          <Delete className="w-5 h-5" />
        </button>

        {/* ROW 2: 4 5 6 Clear (C) */}
        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-lg font-extrabold flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="h-12 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border-2 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-mono text-sm font-black flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
        >
          C
        </button>

        {/* ROW 3: 1 2 3 Plus (+) */}
        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 dark:active:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-lg font-extrabold flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            {d}
          </button>
        ))}
        <div className="grid grid-cols-2 gap-1.5 h-12">
          <button
            type="button"
            onClick={() => handleOperator('+')}
            className={`rounded-xl border-2 font-mono text-base font-black flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
              operator === '+'
                ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => handleOperator('-')}
            className={`rounded-xl border-2 font-mono text-base font-black flex items-center justify-center cursor-pointer active:scale-95 transition-transform ${
              operator === '-'
                ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            −
          </button>
        </div>

        {/* ROW 4: . 0 00 Done */}
        <button
          type="button"
          onClick={() => handleDigit('.')}
          disabled={!allowDecimals}
          className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-xl font-black flex items-center justify-center cursor-pointer active:scale-95 transition-transform disabled:opacity-35 shadow-2xs"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-lg font-extrabold flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => handleDigit('00')}
          className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white font-mono text-base font-extrabold flex items-center justify-center cursor-pointer active:scale-95 transition-transform shadow-2xs"
        >
          00
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-slate-950 dark:border-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-xs"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{lang === 'bn' ? 'সম্পন্ন' : 'Done'}</span>
        </button>
      </div>
    </div>
  );
}
