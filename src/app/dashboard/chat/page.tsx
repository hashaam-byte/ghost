"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/src/lib/auth-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function GhostChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Yo! 👻 I'm Ghost, your AI life twin. What's on your mind? Ask me anything - homework help, life advice, or just vibing. Let's chat! 💜",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isPro = user && 'plan' in user && user.plan === 'pro';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Get token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-5), // Last 5 messages for context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message === 'Not authenticated' 
          ? "Oops! You need to sign in first 🔐" 
          : "Oops! Something went wrong. Try again? 😅",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Help me with my homework 📚",
    "Give me life advice 💭",
    "Analyze this screenshot 📸",
    "Create a study plan 📝",
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="text-4xl animate-bounce">👻</div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Ghost Chat</h1>
              <p className="text-xs text-green-400">● Online</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => isPro ? null : setShowVoiceModal(true)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                isPro 
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30'
                  : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              🎤 Voice {!isPro && '⭐'}
            </button>
            <button className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 transition">
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-2xl ${
                msg.role === 'assistant' 
                  ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                  : 'bg-slate-800'
              }`}>
                {msg.role === 'assistant' ? '👻' : '😎'}
              </div>

              {/* Message Bubble */}
              <div className={`flex-1 max-w-2xl ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`rounded-2xl p-4 ${
                  msg.role === 'assistant'
                    ? 'bg-slate-900/50 backdrop-blur-xl border border-purple-500/20'
                    : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30'
                }`}>
                  <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                  <div className="text-xs text-slate-500 mt-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                👻
              </div>
              <div className="bg-slate-900/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="max-w-5xl mx-auto px-6 pb-4">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full text-sm text-slate-300 hover:bg-slate-800 hover:border-purple-500/30 transition"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <button className="flex-shrink-0 w-12 h-12 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-800 transition flex items-center justify-center text-2xl">
              📎
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type something... or just vibe 💭"
                className="w-full px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-2xl"
            >
              {isLoading ? '⏳' : '🚀'}
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-2 text-center">
            Ghost can make mistakes. Double-check important info. 
            {!isPro && (
              <span className="text-purple-400"> • {50 - messages.filter(m => m.role === 'user').length} chats left today</span>
            )}
          </div>
        </div>
      </div>

      {/* Voice Mode Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900/50 rounded-2xl border-2 border-purple-500/50 max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎤</div>
              <h2 className="text-2xl font-bold text-white mb-2">Voice Mode</h2>
              <p className="text-slate-300">Talk to Ghost naturally with your voice</p>
            </div>
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4 mb-6">
              <div className="text-sm text-purple-300">⭐ This is a Ghost Pro feature</div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/subscription'}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="w-full py-3 border border-slate-700 rounded-xl font-semibold text-slate-400 hover:bg-slate-800"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}