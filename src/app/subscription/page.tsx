"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SUBSCRIPTION_PLANS } from '@/src/lib/subscription-config';

export default function SubscriptionPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isStudent, setIsStudent] = useState(false);

  const calculatePrice = () => {
    const base = billingCycle === 'monthly' 
      ? SUBSCRIPTION_PLANS.pro.price 
      : SUBSCRIPTION_PLANS.pro.priceYearly;
    
    return isStudent ? base * 0.5 : base;
  };

  const features = [
    { free: '50 chats/day', pro: 'Unlimited chats', icon: '💬' },
    { free: '5 scans/day', pro: 'Unlimited scans', icon: '🔍' },
    { free: '5 homework/day', pro: 'Unlimited homework', icon: '📚' },
    { free: 'Basic insights', pro: 'Advanced AI insights', icon: '🧠' },
    { free: '❌', pro: 'Business Mode', icon: '💼' },
    { free: '❌', pro: 'Crypto Scanner', icon: '💰' },
    { free: '❌', pro: 'Voice Mode', icon: '🎤' },
    { free: '❌', pro: 'Deep Personality', icon: '🔮' },
    { free: '❌', pro: 'AI Predictions', icon: '🎯' },
    { free: 'Limited memory', pro: 'Unlimited memory', icon: '💾' },
    { free: 'Basic avatar', pro: 'Premium avatars', icon: '👻' },
    { free: 'Community support', pro: '24/7 priority support', icon: '💜' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-0 -right-48 animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-3xl font-bold mb-4">
            <span className="text-4xl">👻</span>
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Ghost Pro
            </span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">
            Level Up Your Life
            <span className="block text-purple-400">With Ghost Pro</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Unlock unlimited AI power, premium features, and become the best version of yourself
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-2 border border-purple-500/20 inline-flex gap-2">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-3 rounded-xl font-semibold transition ${
                billingCycle === 'monthly'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-3 rounded-xl font-semibold transition relative ${
                billingCycle === 'yearly'
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Student Discount Toggle */}
        <div className="flex justify-center mb-12">
          <label className="flex items-center gap-3 bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20 cursor-pointer hover:border-purple-500/40 transition">
            <input
              type="checkbox"
              checked={isStudent}
              onChange={(e) => setIsStudent(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <div>
              <div className="font-semibold text-white">🎓 I'm a student</div>
              <div className="text-sm text-slate-400">Get 50% off with student verification</div>
            </div>
          </label>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700 p-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👻</div>
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-4xl font-bold text-white mb-1">₦0</div>
              <div className="text-slate-400">Forever free</div>
            </div>
            <ul className="space-y-3 mb-6">
              {features.slice(0, 6).map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-slate-300">
                  <span>{f.icon}</span>
                  <span>{f.free}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/auth/signup')}
              className="w-full py-3 border border-slate-600 rounded-xl font-semibold text-white hover:bg-slate-800 transition"
            >
              Current Plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-xl rounded-2xl border-2 border-purple-500 p-8 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
              Most Popular
            </div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">👻✨</div>
              <h3 className="text-2xl font-bold text-white mb-2">Ghost Pro</h3>
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <span className="text-4xl font-bold text-white">
                  ₦{calculatePrice().toLocaleString()}
                </span>
                {isStudent && (
                  <span className="text-green-400 text-sm font-semibold">(50% OFF)</span>
                )}
              </div>
              <div className="text-slate-400">
                per {billingCycle === 'monthly' ? 'month' : 'year'}
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-white">
                  <span className="text-green-400">✓</span>
                  <span>{f.icon}</span>
                  <span>{f.pro}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/subscription/checkout')}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold text-white hover:shadow-2xl hover:shadow-purple-500/50 transition transform hover:scale-[1.02]"
            >
              Upgrade to Pro →
            </button>
          </div>
        </div>

        {/* What Makes Ghost Unique */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            What Makes Ghost Unique?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-xl font-bold text-white mb-2">AI That Learns You</h3>
              <p className="text-slate-400">
                Ghost remembers everything about you and adapts to your personality
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-2">Gamified Life</h3>
              <p className="text-slate-400">
                Earn XP for real-life actions. Level up your Ghost and yourself
              </p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h3 className="text-xl font-bold text-white mb-2">100% Private</h3>
              <p className="text-slate-400">
                Your data is encrypted and never shared. Complete anonymity
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! Cancel anytime with no penalties. Your Pro features remain active until the end of your billing period.'
              },
              {
                q: 'What happens to my data if I cancel?',
                a: 'All your data is preserved. You can resubscribe anytime and pick up where you left off.'
              },
              {
                q: 'How do I verify student status?',
                a: 'Upload your student ID or school email during checkout. Verification takes 24 hours.'
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! New users get a 7-day free trial of Ghost Pro. No credit card required.'
              }
            ].map((faq, i) => (
              <div key={i} className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
                <h3 className="font-bold text-white mb-2">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}