import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Triggers subtle physical haptic feedback on supporting mobile devices
 */
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'error' = 'light') {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(10);
          break;
        case 'medium':
          navigator.vibrate(25);
          break;
        case 'success':
          navigator.vibrate([12, 25, 15]);
          break;
        case 'error':
          navigator.vibrate([50, 40, 50]);
          break;
      }
    } catch (e) {
      // Browser permissions or context blocking
      console.warn('Haptic vibration not allowed or failed:', e);
    }
  }
}

