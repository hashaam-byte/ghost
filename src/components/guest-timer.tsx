"use client";

import { useAuth } from '@/src/lib/auth-context';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export function GuestTimer() {
  const { user, guestTimeRemaining } = useAuth();
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (guestTimeRemaining && guestTimeRemaining <= 120) {
      setIsWarning(true);
    }
  }, [guestTimeRemaining]);

  if (!user?.isGuest || guestTimeRemaining === null) {
    return null;
  }

  const minutes = Math.floor(guestTimeRemaining / 60);
  const seconds = guestTimeRemaining % 60;

  return (
    <div 
      className={`fixed top-4 right-4 z-50 ${
        isWarning 
          ? 'bg-gradient-to-r from-red-500/20 to-orange-500/20 border-red-500/50 animate-pulse' 
          : 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30'
      } backdrop-blur-xl rounded-xl border px-4 py-3 shadow-2xl transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">⏰</div>
        <div>
          <div className="text-xs text-slate-400 mb-0.5">Guest Mode</div>
          <div className="font-mono text-lg font-bold">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
        </div>
        <Link 
          href="/auth/signup"
          className="ml-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-sm font-semibold hover:shadow-lg transition text-white"
        >
          Sign Up
        </Link>
      </div>
      {isWarning && (
        <div className="text-xs text-red-400 mt-2">
          ⚠️ Time is running out! Sign up to save your progress
        </div>
      )}
    </div>
  );
}