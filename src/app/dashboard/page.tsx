"use client";

import { useAuth } from '@/src/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FeatureLockModal } from '@/src/components/feature-lock-modal';

export default function DashboardPage() {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();
  const [lockedFeature, setLockedFeature] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  const handleFeatureClick = (feature: string, isPro: boolean) => {
    if (isPro && (user as any)?.plan === 'free') {
      setLockedFeature(feature);
    } else {
      // Map feature IDs to actual routes
      const routeMap: Record<string, string> = {
        'chat': '/dashboard/chat',
        'scan': '/dashboard/scan',
        'school': '/dashboard/school',
        'tasks': '/dashboard/tasks',
        'insights': '/dashboard/insights',
        'ghostBusiness': '/dashboard/business',
        'ghostCrypto': '/dashboard/crypto',
        'voice': '/dashboard/chat', // Voice mode is in chat
      };
      
      const route = routeMap[feature] || '/dashboard';
      router.push(route);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">👻</div>
          <div className="text-white text-xl">Loading Ghost...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // 'plan' may not be present on the User type; use a safe access to avoid TypeScript errors.
  const isPro = (user as any)?.plan === 'pro';

  const modules = [
    { id: 'chat', icon: '💬', title: 'Ghost Chat', desc: 'Talk to your AI twin', isPro: false, badge: null },
    { id: 'scan', icon: '🔍', title: 'Ghost Scan', desc: 'Upload & analyze anything', isPro: false, badge: null },
    { id: 'school', icon: '📚', title: 'Ghost School', desc: 'Homework & study help', isPro: false, badge: null },
    { id: 'tasks', icon: '🎯', title: 'Ghost Tasks', desc: 'Smart task manager', isPro: false, badge: null },
    { id: 'insights', icon: '🧠', title: 'Ghost Insights', desc: 'AI life analyzer', isPro: false, badge: null },
    { id: 'ghostBusiness', icon: '💼', title: 'Ghost Business', desc: 'Business analyzer', isPro: true, badge: '⭐' },
    { id: 'ghostCrypto', icon: '💰', title: 'Ghost Crypto', desc: 'Scam detector', isPro: true, badge: '⭐' },
    { id: 'voice', icon: '🎤', title: 'Voice Mode', desc: 'Talk naturally', isPro: true, badge: '⭐' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span className="text-4xl">👻</span>
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Ghost
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white transition">
              Home
            </button>
            <button onClick={() => router.push('/dashboard/profile')} className="text-slate-400 hover:text-white transition">
              Profile
            </button>
            {!isPro && (
              <button 
                onClick={() => router.push('/subscription')}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:shadow-lg transition"
              >
                Upgrade to Pro ⭐
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white text-sm">
              {user.isGuest ? '👻 Guest' : `👋 ${user.username || user.email}`}
              {isPro && <span className="ml-2 text-yellow-400">⭐ Pro</span>}
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-2xl p-8 border border-purple-500/30 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Welcome back, {user.isGuest ? 'Guest' : user.username || 'Friend'}! 👋
              </h1>
              <p className="text-slate-300">
                {user.isGuest 
                  ? "You're in guest mode. Sign up to save your progress!"
                  : isPro 
                    ? "You're a Ghost Pro member. All features unlocked! 🚀"
                    : "Ready to level up your life today?"
                }
              </p>
            </div>
            <div className="text-7xl animate-bounce">👻</div>
          </div>
        </div>

        {/* Ghost Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
            <div className="flex items-center gap-4 mb-3">
              <div className="text-4xl">👻</div>
              <div>
                <div className="text-sm text-slate-400">Your Ghost</div>
                <div className="text-2xl font-bold text-white">Level 1</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">XP</span>
                <span className="text-purple-400">0 / 100</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{width: '0%'}} />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-sm text-slate-400 mb-1">Study Streak</div>
            <div className="text-3xl font-bold text-white">0 days</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm text-slate-400 mb-1">Tasks Done</div>
            <div className="text-3xl font-bold text-white">0</div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl p-6 border border-purple-500/20">
            <div className="text-3xl mb-2">⚡</div>
            <div className="text-sm text-slate-400 mb-1">Total XP</div>
            <div className="text-3xl font-bold text-white">0</div>
          </div>
        </div>

        {/* All Modules */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Your Ghost Tools</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => handleFeatureClick(module.id, module.isPro)}
                className={`p-6 rounded-xl border-2 transition text-left relative ${
                  module.isPro && !isPro
                    ? 'bg-slate-900/30 border-slate-700 hover:border-purple-500/50'
                    : 'bg-slate-900/50 border-purple-500/20 hover:border-purple-500/50 hover:scale-105'
                }`}
              >
                {module.badge && !isPro && (
                  <div className="absolute top-2 right-2 text-xl">{module.badge}</div>
                )}
                <div className="text-5xl mb-3">{module.icon}</div>
                <div className="font-bold text-white mb-1">{module.title}</div>
                <div className="text-sm text-slate-400">{module.desc}</div>
                {module.isPro && !isPro && (
                  <div className="mt-3 text-xs text-purple-400 font-semibold">
                    PRO ONLY
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button 
              onClick={() => handleFeatureClick('school', false)}
              className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition text-left"
            >
              <div className="text-3xl mb-2">📚</div>
              <div className="font-semibold text-white">Scan Homework</div>
              <div className="text-sm text-slate-400">Get instant solutions</div>
            </button>
            <button 
              onClick={() => handleFeatureClick('tasks', false)}
              className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20 transition text-left"
            >
              <div className="text-3xl mb-2">🎯</div>
              <div className="font-semibold text-white">Create Task</div>
              <div className="text-sm text-slate-400">Add a new goal</div>
            </button>
            <button 
              onClick={() => handleFeatureClick('chat', false)}
              className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20 transition text-left"
            >
              <div className="text-3xl mb-2">💬</div>
              <div className="font-semibold text-white">Chat with Ghost</div>
              <div className="text-sm text-slate-400">Ask anything</div>
            </button>
          </div>
        </div>

        {/* Upgrade CTA (Free Users) */}
        {!isPro && !user.isGuest && (
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-3xl font-bold text-white mb-2">
              Unlock Ghost Pro
            </h3>
            <p className="text-slate-300 mb-6">
              Get unlimited AI power, premium features, and level up faster
            </p>
            <button
              onClick={() => router.push('/subscription')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition text-white"
            >
              View Pro Features →
            </button>
          </div>
        )}

        {/* Guest CTA */}
        {user.isGuest && (
          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-8 text-center">
            <h3 className="text-3xl font-bold text-white mb-2">
              Loving Ghost? 💜
            </h3>
            <p className="text-slate-300 mb-6">
              Sign up now to save your progress and unlock all features!
            </p>
            <button
              onClick={() => router.push('/auth/signup')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition text-white"
            >
              Create Free Account
            </button>
          </div>
        )}
      </div>

      {/* Feature Lock Modal */}
      {lockedFeature && (
        <FeatureLockModal
          feature={lockedFeature as any}
          isOpen={!!lockedFeature}
          onClose={() => setLockedFeature(null)}
        />
      )}
    </div>
  );
}