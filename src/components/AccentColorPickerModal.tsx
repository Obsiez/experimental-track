import React, { useState, useEffect } from 'react';
import { X, Check, Palette, Pipette, RefreshCcw } from 'lucide-react';
import { 
  PRESET_ACCENTS, 
  getSavedAccentColor, 
  applyAccentColor,
  THEME_PALETTES,
  getSavedThemePalette,
  applyThemePalette
} from '../lib/accentTheme';
import { triggerHaptic } from '../lib/haptics';
import { Language } from '../lib/translations';

interface AccentColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export default function AccentColorPickerModal({
  isOpen,
  onClose,
  lang,
}: AccentColorPickerModalProps) {
  const [currentColor, setCurrentColor] = useState(getSavedAccentColor);
  const [customHex, setCustomHex] = useState(getSavedAccentColor);
  const [currentThemePalette, setCurrentThemePalette] = useState(getSavedThemePalette);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedAccentColor();
      setCurrentColor(saved);
      setCustomHex(saved);
      setCurrentThemePalette(getSavedThemePalette());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectColor = (hex: string) => {
    triggerHaptic('single');
    setCurrentColor(hex);
    setCustomHex(hex);
    applyAccentColor(hex);
  };

  const handleSelectThemePalette = (paletteId: string) => {
    triggerHaptic('single');
    setCurrentThemePalette(paletteId);
    applyThemePalette(paletteId);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setCurrentColor(val);
      applyAccentColor(val);
    }
  };

  const resetToDefault = () => {
    handleSelectColor('#059669');
    handleSelectThemePalette('obsidian');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-reveal">
      <div 
        onClick={onClose}
        className="fixed inset-0"
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-[#0D121D] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 z-10 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto hide-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3.5">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-slate-950 dark:text-white shrink-0" />
            <div>
              <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white">
                {lang === 'bn' ? 'থিম ও অ্যাকসেন্ট প্যালেট' : 'Theme & Accent Palette'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'অ্যাপের থিম এবং হাইলাইট রঙ পছন্দমতো সাজান' : 'Personalize surface aesthetic and highlight colors'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer text-slate-500 dark:text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Surface Palettes */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block">
            {lang === 'bn' ? 'থিম কালার প্যালেট (ব্যাকগ্রাউন্ড ও সারফেস)' : 'Theme Surface Palette'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEME_PALETTES.map((palette) => {
              const isSelected = currentThemePalette === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => handleSelectThemePalette(palette.id)}
                  className={`p-2.5 rounded-xl border-2 flex flex-col gap-1.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900 shadow-2xs font-bold'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-950 dark:hover:border-white bg-white dark:bg-[#0D121D]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center -space-x-1">
                      {palette.previewSwatches.map((hex, idx) => (
                        <span
                          key={idx}
                          className="w-4 h-4 rounded-full border border-white/40 dark:border-black/40"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 dark:text-white stroke-[3]" />}
                  </div>
                  <span className="text-xs font-bold truncate text-slate-900 dark:text-white">
                    {lang === 'bn' ? palette.nameBn : palette.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Preset Accent Color Swatches */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block">
            {lang === 'bn' ? 'অ্যাকসেন্ট কালার প্যালেট' : 'Accent Color Swatches'}
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRESET_ACCENTS.map((preset) => {
              const isSelected = currentColor.toLowerCase() === preset.lightHex.toLowerCase() || 
                                 currentColor.toLowerCase() === preset.previewHex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectColor(preset.lightHex)}
                  className={`p-2.5 rounded-xl border-2 flex items-center gap-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-950 dark:border-white bg-slate-50 dark:bg-slate-900 shadow-2xs font-bold'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-950 dark:hover:border-white bg-white dark:bg-[#0D121D]'
                  }`}
                >
                  <span 
                    className="w-5 h-5 rounded-full border border-slate-900/40 dark:border-white/40 shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: preset.previewHex }}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                  </span>
                  <span className="text-xs truncate">
                    {lang === 'bn' ? preset.nameBn : preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hex Color Picker */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold block">
            {lang === 'bn' ? 'কাস্টম হেক্স কোড বা কালার পিকার' : 'Custom Hex or Spectrum'}
          </label>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={customHex}
                onChange={handleCustomHexChange}
                placeholder="#059669"
                maxLength={7}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-mono text-sm focus:outline-none focus:border-slate-900 dark:focus:border-white font-bold"
              />
              <span 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-slate-400/50"
                style={{ backgroundColor: currentColor }}
              />
            </div>

            <label className="relative p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-300 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white rounded-xl cursor-pointer flex items-center justify-center shrink-0">
              <input 
                type="color"
                value={currentColor}
                onChange={(e) => handleSelectColor(e.target.value)}
                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              />
              <Pipette className="w-4 h-4 text-slate-900 dark:text-white" />
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'ডিফল্ট রিসেট' : 'Reset Default'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold text-xs rounded-xl border-2 border-slate-950 dark:border-white cursor-pointer shadow-xs active:scale-[0.98] transition-all"
          >
            {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
          </button>
        </div>

      </div>
    </div>
  );
}
