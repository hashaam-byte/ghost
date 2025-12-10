"use client";

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [checks, setChecks] = useState({
    hasToken: false,
    tokenValue: '',
    groqKey: false,
    dbConnection: false,
    aiTest: false,
  });

  useEffect(() => {
    const runChecks = async () => {
      // Check if token exists
      const token = localStorage.getItem('auth_token');
      setChecks(prev => ({
        ...prev,
        hasToken: !!token,
        tokenValue: token ? `${token.substring(0, 20)}...` : 'No token',
      }));

      // Check if Groq key is configured
      try {
        const response = await fetch('/api/debug/check-env');
        const data = await response.json();
        setChecks(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error('Debug check failed:', error);
      }
    };

    runChecks();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">🔍 Ghost Debug Panel</h1>

        <div className="space-y-4">
          {/* Auth Token */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Auth Token</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                checks.hasToken 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {checks.hasToken ? '✓ Found' : '✗ Missing'}
              </span>
            </div>
            <p className="text-slate-400 text-sm">{checks.tokenValue}</p>
            {!checks.hasToken && (
              <p className="text-yellow-400 text-sm mt-2">
                ⚠️ Please sign in first to get a valid token
              </p>
            )}
          </div>

          {/* Groq API Key */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Groq API Key</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                checks.groqKey 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {checks.groqKey ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            {!checks.groqKey && (
              <div className="text-yellow-400 text-sm mt-2">
                <p>⚠️ Add your Groq API key to .env:</p>
                <code className="block mt-2 bg-slate-800 p-2 rounded">
                  GROQ_API_KEY=gsk_...
                </code>
                <p className="mt-2">Get one at: <a href="https://console.groq.com" className="text-purple-400 hover:underline">console.groq.com</a></p>
              </div>
            )}
          </div>

          {/* Database Connection */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">Database Connection</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                checks.dbConnection 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {checks.dbConnection ? '✓ Connected' : '✗ Failed'}
              </span>
            </div>
            {!checks.dbConnection && (
              <p className="text-yellow-400 text-sm mt-2">
                ⚠️ Check your DATABASE_URL in .env
              </p>
            )}
          </div>

          {/* AI Test */}
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-white">AI Test</h2>
              <span className={`px-3 py-1 rounded-full text-sm ${
                checks.aiTest 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              }`}>
                {checks.aiTest ? '✓ Working' : '⏳ Not Tested'}
              </span>
            </div>
            <p className="text-slate-400 text-sm">
              {checks.aiTest 
                ? 'AI is ready to respond!' 
                : 'Test by chatting in Ghost Chat'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 space-y-3">
          <a 
            href="/auth/signin"
            className="block w-full py-3 bg-purple-500 rounded-xl text-center font-semibold hover:bg-purple-600 transition"
          >
            Sign In to Get Token
          </a>
          <a 
            href="/dashboard/chat"
            className="block w-full py-3 bg-blue-500 rounded-xl text-center font-semibold hover:bg-blue-600 transition"
          >
            Test Ghost Chat
          </a>
          <a 
            href="/dashboard"
            className="block w-full py-3 bg-slate-700 rounded-xl text-center font-semibold hover:bg-slate-600 transition"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}