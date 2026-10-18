import { useState, useEffect, useRef, useCallback } from 'react';
import { browserAPI } from '../../../core/browser';

const EYE_REST_INTERVAL = 20 * 60 * 1000;   // 20 minutes (20-20-20 rule)
const HYDRATION_INTERVAL = 45 * 60 * 1000;  // 45 minutes
const MAX_INACTIVE_GAP = 90 * 60 * 1000;    // 90 minutes (user was away / computer asleep)
const CHECK_INTERVAL = 15 * 1000;           // Periodic check every 15s in active tab
const DISPLAY_DURATION = 6000;              // 6 seconds display duration

const STORAGE_KEYS = {
  EYE_REST: 'nick_last_eye_rest',
  HYDRATION: 'nick_last_hydration',
  SESSION_ACTIVE: 'nick_session_active_at'
};

export function useCompanionship() {
  const [companionMessage, setCompanionMessage] = useState(null);
  const [companionMood, setCompanionMood] = useState(null); // 'happy', 'love', etc.
  const clearTimerRef = useRef(null);
  const isCheckingRef = useRef(false);

  const showReminder = useCallback((message, mood = null) => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
    }
    setCompanionMessage(message);
    setCompanionMood(mood);

    clearTimerRef.current = setTimeout(() => {
      setCompanionMessage(null);
      setCompanionMood(null);
      clearTimerRef.current = null;
    }, DISPLAY_DURATION);
  }, []);

  const checkReminders = useCallback(async () => {
    // Only active, visible tabs should process or show reminders
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const now = Date.now();
      let lastEyeRest = 0;
      let lastHydration = 0;
      let lastActive = 0;

      // 1. Fetch from browser storage (with localStorage fallback)
      try {
        const stored = await browserAPI.storage.local.get([
          STORAGE_KEYS.EYE_REST,
          STORAGE_KEYS.HYDRATION,
          STORAGE_KEYS.SESSION_ACTIVE
        ]);
        lastEyeRest = Number(stored[STORAGE_KEYS.EYE_REST]) || 0;
        lastHydration = Number(stored[STORAGE_KEYS.HYDRATION]) || 0;
        lastActive = Number(stored[STORAGE_KEYS.SESSION_ACTIVE]) || 0;
      } catch {
        try {
          lastEyeRest = Number(localStorage.getItem(STORAGE_KEYS.EYE_REST)) || 0;
          lastHydration = Number(localStorage.getItem(STORAGE_KEYS.HYDRATION)) || 0;
          lastActive = Number(localStorage.getItem(STORAGE_KEYS.SESSION_ACTIVE)) || 0;
        } catch {}
      }

      // Helper to update storage across tabs
      const updateStorage = async (updates) => {
        try {
          await browserAPI.storage.local.set(updates);
        } catch {}
        try {
          Object.entries(updates).forEach(([k, v]) => localStorage.setItem(k, String(v)));
        } catch {}
      };

      // 2. Initialize if first run or user was away for a long time (> 90 mins)
      if (!lastEyeRest || !lastHydration || (lastActive && (now - lastActive > MAX_INACTIVE_GAP))) {
        await updateStorage({
          [STORAGE_KEYS.EYE_REST]: now,
          [STORAGE_KEYS.HYDRATION]: now,
          [STORAGE_KEYS.SESSION_ACTIVE]: now
        });
        isCheckingRef.current = false;
        return;
      }

      // Keep heartbeat of active browser session updated
      await updateStorage({
        [STORAGE_KEYS.SESSION_ACTIVE]: now
      });

      // 3. Check Eye Rest (20 minutes)
      if (now - lastEyeRest >= EYE_REST_INTERVAL) {
        // Claim the timestamp first so other tabs don't double fire
        await updateStorage({ [STORAGE_KEYS.EYE_REST]: now });
        showReminder("Look at something 20 feet away for 20 seconds! 👀");
        isCheckingRef.current = false;
        return;
      }

      // 4. Check Hydration (45 minutes)
      if (now - lastHydration >= HYDRATION_INTERVAL) {
        // Claim the timestamp first
        await updateStorage({ [STORAGE_KEYS.HYDRATION]: now });
        showReminder("Time for a hydration break! Drink some water 💧", 'happy');
        isCheckingRef.current = false;
        return;
      }
    } catch (err) {
      console.warn('[Nick Companionship] Check error:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, [showReminder]);

  useEffect(() => {
    // Initial check when tab mounts and is visible
    checkReminders();

    // Periodic check every 15 seconds while tab is open
    const intervalId = setInterval(checkReminders, CHECK_INTERVAL);

    // Check immediately when user switches back to this tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkReminders();
      }
    };
    const handleFocus = () => {
      checkReminders();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Manual/testing event listener: window.dispatchEvent(new CustomEvent('nick-test-reminder', { detail: 'eye' | 'water' }))
    const handleTestReminder = (e) => {
      const type = e.detail;
      if (type === 'eye' || type === 'lookaway') {
        showReminder("Look at something 20 feet away for 20 seconds! 👀");
      } else if (type === 'water' || type === 'drink' || type === 'hydration') {
        showReminder("Time for a hydration break! Drink some water 💧", 'happy');
      }
    };
    window.addEventListener('nick-test-reminder', handleTestReminder);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('nick-test-reminder', handleTestReminder);
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
    };
  }, [checkReminders, showReminder]);

  return { companionMessage, companionMood };
}
