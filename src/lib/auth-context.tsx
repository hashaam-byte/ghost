"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatar?: string;
  isGuest: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  guestTimeRemaining: number | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInAsGuest: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [guestTimeRemaining, setGuestTimeRemaining] = useState<number | null>(null);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const guestMode = localStorage.getItem('guest_mode');
        const guestExpiry = localStorage.getItem('guest_expiry');

        if (guestMode === 'true' && guestExpiry) {
          const expiryTime = parseInt(guestExpiry);
          const timeLeft = Math.floor((expiryTime - Date.now()) / 1000);
          
          if (timeLeft > 0) {
            setUser({
              id: 'guest',
              email: 'guest@ghost.app',
              username: 'Guest User',
              isGuest: true,
            });
            setGuestTimeRemaining(timeLeft);
          } else {
            // Guest session expired
            localStorage.removeItem('guest_mode');
            localStorage.removeItem('guest_expiry');
            router.push('/auth/signin');
          }
        } else if (token) {
          // Validate real user token
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser({ ...userData, isGuest: false });
          } else {
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Guest mode countdown timer
  useEffect(() => {
    if (guestTimeRemaining === null || guestTimeRemaining <= 0) return;

    const interval = setInterval(() => {
      setGuestTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          signOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [guestTimeRemaining]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign in failed');
      }

      const { user: userData, token } = await response.json();
      localStorage.setItem('auth_token', token);
      setUser({ ...userData, isGuest: false });
      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Sign up failed');
      }

      const { user: userData, token } = await response.json();
      localStorage.setItem('auth_token', token);
      setUser({ ...userData, isGuest: false });
      router.push('/onboarding');
    } catch (error) {
      throw error;
    }
  };

  const signInAsGuest = () => {
    const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes
    localStorage.setItem('guest_mode', 'true');
    localStorage.setItem('guest_expiry', expiryTime.toString());
    
    setUser({
      id: 'guest',
      email: 'guest@ghost.app',
      username: 'Guest User',
      isGuest: true,
    });
    setGuestTimeRemaining(600); // 600 seconds = 10 minutes
    router.push('/dashboard');
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('guest_mode');
    localStorage.removeItem('guest_expiry');
    setUser(null);
    setGuestTimeRemaining(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        guestTimeRemaining,
        signIn,
        signUp,
        signInAsGuest,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}