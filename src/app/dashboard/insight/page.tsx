"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/lib/auth-context';

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  category: string;
  importance: number;
  createdAt: string;
}

export default function GhostInsightsPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const isPro = (user as { plan?: string } | undefined)?.plan === 'pro';

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/insights', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
        setWeeklyReport(data.weeklyReport);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchInsights();
      }
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getInsightIcon = (type: string) => {
    const icons: Record<string, string> = {
      behavioral: '🧠',
      productivity: '⚡',
      social: '💬',
      achievement: '🏆',
      warning: '⚠️',
      recommendation: '💡',
    };
    return icons[type] || '📊';
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return 'bg-red-500/20 border-red-500/30 text-red-400';
    if (importance >= 5) return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400';
    return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-3xl">🧠</span>
                Ghost Insights
              </h1>
              <p className="text-slate-400">AI-powered analysis of your life patterns</p>
            </div>
            <button
              onClick={generateInsights}
              disabled={isGenerating}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition disabled:opacity-50"
            >
              {isGenerating ? '⏳ Analyzing...' : '✨ Generate New Insights'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Weekly Report */}
        {weeklyReport && (
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-2xl border border-purple-500/30 p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📊</span>
              Your Week in Review
            </h2>

            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/20">
                <div className="text-3xl mb-2">⚡</div>
                <div className="text-sm text-slate-400">XP Earned</div>
                <div className="text-2xl font-bold text-white">
                  {weeklyReport.xpEarned || 0}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/20">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm text-slate-400">Tasks Done</div>
                <div className="text-2xl font-bold text-white">
                  {weeklyReport.tasksCompleted || 0}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/20">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-sm text-slate-400">Chats</div>
                <div className="text-2xl font-bold text-white">
                  {weeklyReport.chats || 0}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-purple-500/20">
                <div className="text-3xl mb-2">🔥</div>
                <div className="text-sm text-slate-400">Best Streak</div>
                <div className="text-2xl font-bold text-white">
                  {weeklyReport.bestStreak || 0} days
                </div>
              </div>
            </div>

            {weeklyReport.summary && (
              <div className="bg-slate-900/50 rounded-xl p-6 border border-purple-500/20">
                <h3 className="font-bold text-white mb-3">Ghost's Analysis:</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{weeklyReport.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Insights Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-spin">🧠</div>
            <div className="text-white text-xl">Analyzing your patterns...</div>
          </div>
        ) : insights.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center">
            <div className="text-8xl mb-4">🧠</div>
            <div className="text-2xl font-bold text-white mb-2">No Insights Yet</div>
            <div className="text-slate-400 mb-6">
              Use Ghost for a few days and AI will start analyzing your patterns
            </div>
            <button
              onClick={generateInsights}
              disabled={isGenerating}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Insights Now'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6 hover:border-purple-500/40 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-xl font-bold text-white">{insight.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getImportanceColor(insight.importance)}`}>
                        {insight.importance >= 8 ? 'CRITICAL' : insight.importance >= 5 ? 'IMPORTANT' : 'INFO'}
                      </span>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap mb-3">{insight.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>📂</span>
                        {insight.category}
                      </span>
                      <span className="flex items-center gap-1">
                        <span>📅</span>
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pro Features Teaser */}
        {!isPro && insights.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Unlock Deep Insights with Pro
            </h3>
            <div className="text-slate-300 mb-6 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400">✓</span>
                <span>AI Predictions (relationships, career, decisions)</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Weekly detailed reports</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Deep personality analysis</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Advanced behavioral patterns</span>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/subscription'}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition"
            >
              Upgrade to Ghost Pro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}