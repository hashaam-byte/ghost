'use client'
import { useState, useEffect } from 'react';

export default function GhostLanding() {
  const [scrollY, setScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    { icon: "🎯", title: "Ghost XP", desc: "Level up your real life with gamified habits" },
    { icon: "📚", title: "Ghost School", desc: "AI homework solver, note scanner, flashcards" },
    { icon: "⚡", title: "Ghost Productivity", desc: "Smart timetable that adapts to your energy" },
    { icon: "💰", title: "Ghost Crypto", desc: "Portfolio tracking with AI market insights" },
    { icon: "🎮", title: "Ghost Gaming", desc: "Sensitivity analyzer & performance tracking" },
    { icon: "💼", title: "Ghost Business", desc: "AI business analyzer & marketing assistant" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        />
        <div 
          className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl top-1/3 -right-48"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-2xl font-bold">
          <span className="text-4xl">👻</span>
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Ghost
          </span>
        </div>
        <div className="flex gap-4">
          <button className="px-4 py-2 rounded-lg hover:bg-white/10 transition">
            Sign In
          </button>
          <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div 
          className={`text-center transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          {/* Ghost Animation */}
          <div className="relative inline-block mb-8">
            <div className="text-9xl animate-bounce">👻</div>
            <div className="absolute inset-0 blur-2xl bg-purple-500/30 animate-pulse" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Your AI
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Live Twin
            </span>
          </h1>

          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Ghost learns from you, grows with you, and levels up your life.
            Gamify everything — school, productivity, crypto, gaming, and more.
          </p>

          <div className="flex gap-4 justify-center mb-12">
            <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition transform hover:scale-105">
              Start Free ✨
            </button>
            <button className="px-8 py-4 border border-purple-500/50 rounded-xl text-lg font-semibold hover:bg-purple-500/10 transition">
              Watch Demo 🎬
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 justify-center text-sm text-slate-400">
            <div>
              <div className="text-2xl font-bold text-white">52+</div>
              Features
            </div>
            <div>
              <div className="text-2xl font-bold text-white">100%</div>
              Free to Start
            </div>
            <div>
              <div className="text-2xl font-bold text-white">24/7</div>
              AI Assistant
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          Everything You Need,
          <span className="block text-purple-400">In One AI Companion</span>
        </h2>
        <p className="text-center text-slate-400 mb-12">
          Ghost is not just another app — it's your life OS
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-gradient-to-br from-slate-900/50 to-purple-900/20 border border-purple-500/20 hover:border-purple-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2 text-white">
                {feature.title}
              </h3>
              <p className="text-slate-400">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Ghost XP Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-3xl p-12 border border-purple-500/30">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                Earn XP For
                <span className="block text-purple-400">Everything You Do</span>
              </h2>
              <p className="text-slate-300 mb-6">
                Study, work out, complete tasks, manage crypto, game better — every action earns XP.
                Watch your Ghost evolve as you level up your real life.
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Level up from 1 to 100+
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Ghost avatar evolves with you
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Unlock exclusive Ghost Room themes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Compete with friends on leaderboards
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="bg-slate-900/50 rounded-2xl p-8 border border-purple-500/30">
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-6xl">👻</div>
                  <div>
                    <div className="text-sm text-slate-400">Your Ghost</div>
                    <div className="text-2xl font-bold">Level 23</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">XP Progress</span>
                      <span className="text-purple-400">2,340 / 3,000</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500" style={{width: '78%'}} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Study Streak</div>
                      <div className="text-xl font-bold">🔥 12 days</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3">
                      <div className="text-xs text-slate-400">Tasks Done</div>
                      <div className="text-xl font-bold">✅ 47</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl font-bold mb-6">
          Ready to Level Up
          <span className="block text-purple-400">Your Life?</span>
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          Join thousands of Gen-Z users who are already winning with Ghost
        </p>
        <button className="px-12 py-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-xl font-bold hover:shadow-2xl hover:shadow-purple-500/50 transition transform hover:scale-105">
          Get Started Free 👻
        </button>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-2xl font-bold mb-4">
                <span className="text-3xl">👻</span>
                <span>Ghost</span>
              </div>
              <p className="text-slate-400 text-sm">
                Your AI Life Twin that grows with you
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Roadmap</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400 text-sm">
            © 2025 Ghost. All rights reserved. Built with 💜 for Gen-Z
          </div>
        </div>
      </footer>
    </div>
  );
}