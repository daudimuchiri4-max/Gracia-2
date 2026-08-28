import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Clock, AlertTriangle, ShieldCheck, LogOut, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface InactivityManagerProps {
  isActive: boolean; // true when inside ERP or protected portals, false on public website
  onLogoutToPublic: () => void;
}

export const InactivityManager: React.FC<InactivityManagerProps> = ({
  isActive,
  onLogoutToPublic,
}) => {
  const { school, logout, user } = useAuth();
  const { showToast } = useToast();

  // Enforce minimum 5 minutes timeout as requested by user
  const configuredMinutes = school?.systemPreferences?.inactivityTimeoutMinutes ?? 5;
  const timeoutMinutes = Math.max(5, Number(configuredMinutes) || 5);
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningThresholdSeconds = 30; // Show warning 30 seconds before logout

  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutMinutes * 60);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(timeoutMinutes * 60);
    setShowWarning(false);
  }, [timeoutMinutes]);

  const handlePerformLogout = useCallback(async (isAuto = true) => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout cleanup notice:', e);
    }
    setShowWarning(false);
    onLogoutToPublic();
    if (isAuto) {
      showToast(
        `You have been safely logged out after ${timeoutMinutes} minutes of inactivity. Returned to Public Website.`,
        'info'
      );
    } else {
      showToast('You have been signed out. Returned to Public Website.', 'info');
    }
  }, [logout, onLogoutToPublic, showToast, timeoutMinutes]);

  // Set up activity event listeners
  useEffect(() => {
    if (!isActive) {
      setShowWarning(false);
      return;
    }

    resetActivity();

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'wheel',
    ];

    // Throttle activity event resets
    let throttleTimeout: any = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          // Only reset if not currently in warning state to avoid subtle accidental mouse movement dismissals,
          // or allow normal activity to refresh the timer
          lastActivityRef.current = Date.now();
        }, 1000);
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check interval every second
    timerIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remainingMs = timeoutMs - elapsed;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(timerIntervalRef.current);
        handlePerformLogout(true);
      } else if (remainingSec <= warningThresholdSeconds) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      if (throttleTimeout) clearTimeout(throttleTimeout);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isActive, timeoutMs, timeoutMinutes, resetActivity, handlePerformLogout]);

  if (!isActive || !showWarning) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900 text-white border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <span>Inactivity Session Warning</span>
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono">
                {secondsRemaining}s
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              No activity detected. You will be automatically logged out and returned to the{' '}
              <strong className="text-amber-400">Public Website</strong> in {secondsRemaining} seconds for institutional security.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
          <button
            onClick={() => handlePerformLogout(false)}
            className="px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out Now</span>
          </button>
          <button
            onClick={resetActivity}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Stay Signed In</span>
          </button>
        </div>
      </div>
    </div>
  );
};
