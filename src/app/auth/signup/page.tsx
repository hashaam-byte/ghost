"use client";

import { useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

// Mock auth functions for demo
const mockAuth = {
  signUp: async (email: string, password: string, username: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Signed up:', { email, username });
  },
  signInAsGuest: () => {
    console.log('Guest sign in');
  }
};

// Username generator
const adjectives = ['Cool', 'Ghost', 'Cyber', 'Swift', 'Cosmic', 'Epic', 'Mystic', 'Neon', 'Shadow', 'Digital', 'Ultra', 'Quantum', 'Stellar', 'Turbo', 'Phantom'];
const nouns = ['Ninja', 'Wizard', 'Master', 'Hunter', 'Gamer', 'Coder', 'Racer', 'Legend', 'Hero', 'Pro', 'King', 'Ace', 'Star', 'Wolf', 'Dragon'];

const generateUsername = () => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${adj}${noun}${num}`;
};

export default function SignUpPage() {
  const { signUp, signInAsGuest } = mockAuth;
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleGenerateUsername = () => {
    const newUsername = generateUsername();
    setFormData(prev => ({
      ...prev,
      username: newUsername,
    }));
  };

  const handleSubmit = async () => {
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(formData.email, formData.password, formData.username);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-0 -right-48 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 text-3xl font-bold hover:scale-105 transition">
            <span className="text-5xl">👻</span>
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Ghost
            </span>
          </a>
          <p className="text-slate-400 mt-2">Create your AI Life Twin</p>
        </div>

        {/* Sign Up Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-6">Create Account</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="ghostmaster"
                />
                <button
                  type="button"
                  onClick={handleGenerateUsername}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition"
                  title="Generate username"
                >
                  <Sparkles className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Click the ✨ to generate a random username</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-start text-sm">
              <input type="checkbox" className="mr-2 mt-1 rounded" />
              <label className="text-slate-400">
                I agree to the{' '}
                <a href="/terms" className="text-purple-400 hover:text-purple-300">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-purple-400 hover:text-purple-300">
                  Privacy Policy
                </a>
              </label>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900 text-slate-400">Or</span>
            </div>
          </div>

          {/* Guest Mode */}
          <button
            onClick={() => signInAsGuest()}
            className="w-full py-3 bg-slate-800/50 border border-slate-700 rounded-lg font-semibold text-white hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <span className="text-xl">👻</span>
            Try as Guest
            <span className="text-xs text-slate-400">(10 min trial)</span>
          </button>

          {/* Sign In Link */}
          <p className="text-center text-slate-400 mt-6">
            Already have an account?{' '}
            <a href="/auth/signin" className="text-purple-400 hover:text-purple-300 font-semibold">
              Sign In
            </a>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 space-y-2">
          {['🎯 Earn XP for everything you do', '📚 AI-powered homework solver', '⚡ Smart productivity assistant'].map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-1 h-1 bg-purple-400 rounded-full" />
              {benefit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}