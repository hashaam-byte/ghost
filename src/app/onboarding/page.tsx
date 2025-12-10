"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    personality: '',
    focusAreas: [] as string[],
    isMorningPerson: null as boolean | null,
    procrastinates: null as boolean | null,
    motivationStyle: '',
    ghostName: '',
    goalThisMonth: '',
  });

  const personalities = [
    { id: 'chill', emoji: '😎', title: 'Chill & Friendly', desc: 'Relaxed vibes, casual advice' },
    { id: 'productive', emoji: '⚡', title: 'Productive & Focused', desc: 'Get things done, no distractions' },
    { id: 'funny', emoji: '😂', title: 'Funny & Gen-Z', desc: 'Memes, jokes, but still helpful' },
    { id: 'silent', emoji: '🤫', title: 'Silent but Smart', desc: 'Minimal talk, maximum results' },
    { id: 'coach', emoji: '💪', title: 'Strict Coach', desc: 'Tough love, accountability' },
  ];

  const focusOptions = [
    { id: 'school', emoji: '📚', label: 'School' },
    { id: 'productivity', emoji: '⚡', label: 'Productivity' },
    { id: 'fitness', emoji: '💪', label: 'Fitness' },
    { id: 'crypto', emoji: '💰', label: 'Crypto' },
    { id: 'business', emoji: '💼', label: 'Business' },
    { id: 'gaming', emoji: '🎮', label: 'Gaming' },
    { id: 'wellness', emoji: '🧘', label: 'Wellness' },
    { id: 'social', emoji: '💬', label: 'Social Life' },
  ];

  const toggleFocus = (id: string) => {
    setFormData(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(id)
        ? prev.focusAreas.filter(f => f !== id)
        : [...prev.focusAreas, id]
    }));
  };

  const handleComplete = async () => {
    // Save to backend
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(formData),
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl bottom-0 -right-48 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm text-slate-400">
            <span>Step {step} of 5</span>
            <span>{Math.round((step / 5) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center">
            <div className="text-8xl mb-6 animate-bounce">👻</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to Ghost!
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              I'm your AI Life Twin. I'll grow with you, learn from you, and help you level up every part of your life.
            </p>
            <div className="space-y-4 text-left mb-8">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✨</div>
                <div>
                  <div className="font-semibold text-white">100% Anonymous</div>
                  <div className="text-sm text-slate-400">Your data stays private and secure</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🧠</div>
                <div>
                  <div className="font-semibold text-white">AI That Learns You</div>
                  <div className="text-sm text-slate-400">I adapt to your personality and goals</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🎯</div>
                <div>
                  <div className="font-semibold text-white">Level Up Real Life</div>
                  <div className="text-sm text-slate-400">Earn XP for everything you do</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition"
            >
              Let's Create Your Ghost →
            </button>
          </div>
        )}

        {/* Step 2: Choose Personality */}
        {step === 2 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Choose Your Ghost's Vibe
            </h2>
            <p className="text-slate-400 mb-6">
              This sets how Ghost talks to you. You can change it later!
            </p>
            <div className="space-y-3 mb-8">
              {personalities.map(p => (
                <button
                  key={p.id}
                  onClick={() => setFormData(prev => ({ ...prev, personality: p.id }))}
                  className={`w-full p-4 rounded-xl border-2 transition text-left ${
                    formData.personality === p.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{p.emoji}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{p.title}</div>
                      <div className="text-sm text-slate-400">{p.desc}</div>
                    </div>
                    {formData.personality === p.id && (
                      <div className="text-purple-400">✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-slate-700 rounded-lg hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.personality}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Focus Areas */}
        {step === 3 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              What Do You Want to Level Up?
            </h2>
            <p className="text-slate-400 mb-6">
              Select all that apply. Ghost will prioritize these areas.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {focusOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => toggleFocus(option.id)}
                  className={`p-4 rounded-xl border-2 transition ${
                    formData.focusAreas.includes(option.id)
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                  }`}
                >
                  <div className="text-3xl mb-2">{option.emoji}</div>
                  <div className="font-semibold text-white text-sm">{option.label}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-slate-700 rounded-lg hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={formData.focusAreas.length === 0}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Quick Questions */}
        {step === 4 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Help Ghost Know You Better
            </h2>
            <p className="text-slate-400 mb-6">
              Quick questions to personalize your experience
            </p>
            <div className="space-y-6 mb-8">
              {/* Morning/Night */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Are you a morning or night person?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, isMorningPerson: true }))}
                    className={`p-4 rounded-xl border-2 transition ${
                      formData.isMorningPerson === true
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">🌅</div>
                    <div className="font-semibold text-white">Morning</div>
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, isMorningPerson: false }))}
                    className={`p-4 rounded-xl border-2 transition ${
                      formData.isMorningPerson === false
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">🌙</div>
                    <div className="font-semibold text-white">Night</div>
                  </button>
                </div>
              </div>

              {/* Procrastination */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Do you procrastinate often?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, procrastinates: true }))}
                    className={`p-4 rounded-xl border-2 transition ${
                      formData.procrastinates === true
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-white">Yes 😅</div>
                  </button>
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, procrastinates: false }))}
                    className={`p-4 rounded-xl border-2 transition ${
                      formData.procrastinates === false
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-semibold text-white">Not really ✅</div>
                  </button>
                </div>
              </div>

              {/* Goal */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  What's your main goal this month?
                </label>
                <input
                  type="text"
                  value={formData.goalThisMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, goalThisMonth: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="E.g., Ace my exams, Launch my business..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 border border-slate-700 rounded-lg hover:bg-slate-800 transition"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={formData.isMorningPerson === null || formData.procrastinates === null}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Meet Your Ghost */}
        {step === 5 && (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-8 text-center">
            <div className="text-8xl mb-6 animate-bounce">👻</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Your Ghost is Ready!
            </h2>
            <div className="bg-slate-800/50 rounded-xl p-6 mb-8 text-left">
              <div className="text-purple-400 font-semibold mb-2">Ghost says:</div>
              <p className="text-white text-lg">
                "Hey! I'm your AI Life Twin. I've learned that you're{' '}
                {formData.isMorningPerson ? 'a morning person' : 'a night owl'},{' '}
                {formData.procrastinates ? 'someone who procrastinates sometimes (no judgment!)' : 'pretty disciplined'}, 
                and you want to focus on{' '}
                {formData.focusAreas.slice(0, 2).join(' and ')}. 
                {formData.goalThisMonth && ` Your goal this month is: ${formData.goalThisMonth}.`}
                <br /><br />
                Let's level up your life together. I'm here 24/7. 💜"
              </p>
            </div>
            <button
              onClick={handleComplete}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition"
            >
              Enter Ghost Dashboard 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}