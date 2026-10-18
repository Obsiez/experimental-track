export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
};

export const isHapticsEnabled = (): boolean => {
  if (typeof localStorage === 'undefined') return true;
  const stored = localStorage.getItem('haptics');
  // Default to true unless explicitly disabled
  return stored === null ? true : stored === 'true';
};

let lastIosHapticTimestamp = 0;

/**
 * Fires a single native iOS Taptic Engine switch tick using WebKit's
 * <label><input type="checkbox" switch></label> activation exploit.
 * Must be invoked within an active user gesture on iOS Safari / Standalone PWA.
 */
function fireSingleIosSwitchClick() {
  if (typeof document === 'undefined') return;
  try {
    const label = document.createElement('label');
    label.ariaHidden = 'true';
    // Keep out of visual layout without using pointer-events:none (which blocks WebKit switch activation)
    label.style.position = 'fixed';
    label.style.bottom = '0px';
    label.style.left = '0px';
    label.style.width = '1px';
    label.style.height = '1px';
    label.style.opacity = '0.01';
    label.style.zIndex = '-1';
    label.style.overflow = 'hidden';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    label.appendChild(input);

    const container = document.body || document.head;
    if (!container) return;

    container.appendChild(label);
    label.click();
    container.removeChild(label);
  } catch (e) {
    // Ignore DOM errors on unsupported environments
  }
}

function triggerIosHaptic( deduplicateWindowMs = 80 ) {
  const now = Date.now();
  if (now - lastIosHapticTimestamp < deduplicateWindowMs) return;
  lastIosHapticTimestamp = now;
  fireSingleIosSwitchClick();
}

// Install a lightweight global touch/pointer listener on iOS so buttons that call
// triggerHaptic() after an async await still fire during the synchronous WebKit user gesture.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const handleIosInteractiveGesture = (e: Event) => {
    if (!isIOSDevice() || !isHapticsEnabled()) return;
    const target = e.target as HTMLElement | null;
    if (!target || typeof target.closest !== 'function') return;

    const interactive = target.closest(
      'button:not(:disabled), [role="button"], a[href], input[type="checkbox"], input[type="radio"], select, summary'
    );
    if (interactive) {
      triggerIosHaptic(120);
    }
  };

  // On iOS WebKit, click/touchend carries user activation; pointerup/click is safest without interfering with scrolling
  document.addEventListener('click', handleIosInteractiveGesture, { capture: true, passive: true });
}

export const triggerHaptic = (type: 'single' | 'double' | 'tick' | number | number[] = 'single') => {
  if (!isHapticsEnabled()) return;

  // 1. iOS Safari / Standalone PWA Taptic Engine workaround
  if (isIOSDevice()) {
    triggerIosHaptic(80);
    return;
  }

  // 2. Standard Web Vibration API (Android Chrome, etc.)
  const intensity = parseInt(localStorage.getItem('haptic_intensity') || '3');

  // Calculate base duration for single vibration
  // intensity mapping:
  // 1: Very light tick
  // 2: Soft tap
  // 3: Medium buzz
  // 4: Firm buzz
  // 5: Strong buzz
  const baseDuration = intensity === 1 ? 2
                     : intensity === 2 ? 5
                     : intensity === 3 ? 28
                     : intensity === 4 ? 55
                     : 110;

  let pattern: number | number[];

  if (typeof type === 'number') {
    const ratio = baseDuration / 28;
    pattern = Math.max(baseDuration, Math.round(type * ratio));
  } else if (Array.isArray(type)) {
    const ratio = baseDuration / 28;
    pattern = type.map((val, idx) => {
      if (idx % 2 === 0) {
        return Math.max(baseDuration, Math.round(val * ratio));
      }
      return val;
    });
  } else if (type === 'tick') {
    pattern = Math.max(Math.round(baseDuration * 0.5), 1);
  } else if (type === 'double') {
    pattern = [baseDuration, 40, baseDuration];
  } else {
    pattern = baseDuration;
  }

  try {
    if (window.navigator?.vibrate) {
      window.navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn("Haptics vibration failed:", e);
  }
};
