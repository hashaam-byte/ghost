'use client'
import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

const API_ROUTES = {
  "Authentication": [
    { method: "POST", path: "/api/auth/signup", desc: "Create new user account" },
    { method: "POST", path: "/api/auth/signin", desc: "User login" },
    { method: "POST", path: "/api/auth/signout", desc: "User logout" },
    { method: "POST", path: "/api/auth/guest", desc: "Create guest session" },
    { method: "POST", path: "/api/auth/upgrade-guest", desc: "Convert guest to full account" },
    { method: "POST", path: "/api/auth/refresh", desc: "Refresh JWT token" },
    { method: "GET", path: "/api/auth/me", desc: "Get current user data" },
  ],
  "Ghost Profile": [
    { method: "GET", path: "/api/ghost/state", desc: "Get ghost current state (mood, animation)" },
    { method: "POST", path: "/api/ghost/state", desc: "Update ghost state" },
    { method: "PUT", path: "/api/ghost/state", desc: "Toggle sleep state" },
    { method: "GET", path: "/api/ghost/evolution", desc: "Get evolution status" },
    { method: "POST", path: "/api/ghost/evolution", desc: "Trigger ghost evolution" },
    { method: "PATCH", path: "/api/ghost/evolution", desc: "Get evolution history" },
    { method: "POST", path: "/api/ghost/suggest", desc: "Generate AI suggestion" },
    { method: "GET", path: "/api/ghost/suggest", desc: "Get recent suggestions" },
  ],
  "Ghost Memory": [
    { method: "POST", path: "/api/ghost/memory", desc: "Store ghost memory" },
    { method: "GET", path: "/api/ghost/memory", desc: "Retrieve memories" },
    { method: "PUT", path: "/api/ghost/memory", desc: "Update memory confidence" },
    { method: "DELETE", path: "/api/ghost/memory", desc: "Delete memory" },
  ],
  "Ghost Overlay": [
    { method: "POST", path: "/api/ghost/overlay", desc: "Save overlay settings" },
    { method: "GET", path: "/api/ghost/overlay", desc: "Get overlay settings" },
    { method: "PUT", path: "/api/ghost/overlay", desc: "Log overlay usage" },
    { method: "DELETE", path: "/api/ghost/overlay", desc: "Get overlay stats" },
  ],
  "Tasks": [
    { method: "GET", path: "/api/task", desc: "Get all user tasks" },
    { method: "POST", path: "/api/task/create", desc: "Create new task" },
    { method: "POST", path: "/api/task/[id]/complete", desc: "Complete a task" },
    { method: "DELETE", path: "/api/task/[id]", desc: "Delete a task" },
  ],
  "Quests": [
    { method: "GET", path: "/api/quest", desc: "Get user quests" },
    { method: "POST", path: "/api/quest", desc: "Update quest progress or create daily quests" },
  ],
  "Chat": [
    { method: "POST", path: "/api/chat", desc: "Send message to Ghost AI" },
  ],
  "Scanning": [
    { method: "POST", path: "/api/scan", desc: "Scan image (DM/crypto/social)" },
    { method: "POST", path: "/api/school/solve", desc: "AI homework solver" },
  ],
  "Shop & Inventory": [
    { method: "GET", path: "/api/shop", desc: "Get shop items" },
    { method: "POST", path: "/api/shop", desc: "Purchase item" },
    { method: "PUT", path: "/api/shop", desc: "Equip/unequip item" },
  ],
  "Leaderboard": [
    { method: "GET", path: "/api/leaderboard", desc: "Get leaderboard (xp/aesthetic/streak/quest)" },
    { method: "POST", path: "/api/leaderboard", desc: "Update leaderboard ranks" },
  ],
  "Community": [
    { method: "GET", path: "/api/community/nearby", desc: "Find nearby ghosts" },
    { method: "POST", path: "/api/community/nearby", desc: "Update user location" },
    { method: "PUT", path: "/api/community/nearby", desc: "Update online status" },
  ],
  "Device Tracking": [
    { method: "POST", path: "/api/device/activity", desc: "Log device activity" },
    { method: "GET", path: "/api/device/activity", desc: "Get activity history" },
    { method: "POST", path: "/api/device/apps", desc: "Log app usage" },
    { method: "GET", path: "/api/device/apps", desc: "Get app usage stats" },
    { method: "POST", path: "/api/device/block", desc: "Block/unblock app" },
    { method: "GET", path: "/api/device/block", desc: "Get blocked apps" },
    { method: "POST", path: "/api/device/session", desc: "Start/end phone session" },
  ],
  "Insights": [
    { method: "GET", path: "/api/insight", desc: "Get weekly insights & report" },
    { method: "POST", path: "/api/insight/generate", desc: "Generate AI insights" },
  ],
  "Dashboard": [
    { method: "GET", path: "/api/dashboard/stats", desc: "Get dashboard statistics" },
  ],
  "Appearance": [
    { method: "POST", path: "/api/appearance", desc: "Save wallpaper/theme preferences" },
    { method: "GET", path: "/api/appearance", desc: "Get appearance settings" },
    { method: "PUT", path: "/api/appearance", desc: "Update extracted palette (auto mode)" },
  ],
  "Features": [
    { method: "GET", path: "/api/feature/access", desc: "Check feature access" },
    { method: "POST", path: "/api/feature/access", desc: "Unlock feature" },
  ],
  "Onboarding": [
    { method: "POST", path: "/api/onboarding/complete", desc: "Complete onboarding" },
    { method: "POST", path: "/api/user/wake-questions", desc: "Submit wake questions" },
    { method: "GET", path: "/api/user/wake-questions", desc: "Get wake question answers" },
  ],
  "Tutorial": [
    { method: "POST", path: "/api/tutorial/progress", desc: "Update tutorial progress" },
    { method: "GET", path: "/api/tutorial/progress", desc: "Get tutorial state" },
  ],
  "Voice": [
    { method: "POST", path: "/api/voice/record", desc: "Save voice note" },
    { method: "GET", path: "/api/voice/record", desc: "Get user voice notes" },
    { method: "POST", path: "/api/voice/transcribe", desc: "Transcribe audio with Groq Whisper" },
    { method: "GET", path: "/api/voice/badges", desc: "Get all badges" },
    { method: "POST", path: "/api/voice/badges", desc: "Check and unlock badge" },
    { method: "GET", path: "/api/voice/notifications", desc: "Get user notifications" },
    { method: "POST", path: "/api/voice/notifications", desc: "Create notification" },
    { method: "PATCH", path: "/api/voice/notifications", desc: "Mark notification as read" },
  ],
  "Debug": [
    { method: "GET", path: "/api/debug/check-env", desc: "Check environment variables" },
  ],
};

const APIDocsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(Object.keys(API_ROUTES)));
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  type Route = { method: string; path: string; desc: string };
  const filteredRoutes = Object.entries(API_ROUTES).reduce((acc, [category, routes]) => {
    const filtered = (routes as Route[]).filter(route =>
      route.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.method.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as Record<string, Route[]>);

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      PATCH: 'bg-purple-500',
      DELETE: 'bg-red-500',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-500';
  };

  const totalEndpoints = Object.values(API_ROUTES).reduce((sum, routes) => sum + routes.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-5xl">👻</div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                GhostX API
              </h1>
              <p className="text-gray-300 text-sm">Complete Backend Documentation</p>
            </div>
          </div>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
              <span className="text-gray-300">Total Endpoints:</span>
              <span className="ml-2 font-bold text-purple-300">{totalEndpoints}</span>
            </div>
            <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
              <span className="text-gray-300">Categories:</span>
              <span className="ml-2 font-bold text-purple-300">{Object.keys(API_ROUTES).length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg">
              <span className="text-gray-300">Base URL:</span>
              <span className="ml-2 font-mono text-xs text-purple-300">https://ghost-z.vercel.app</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* API Routes */}
        <div className="space-y-4">
          {Object.entries(filteredRoutes).map(([category, routes]) => (
            <div key={category} className="bg-white/10 backdrop-blur rounded-xl border border-white/20 overflow-hidden">
              <button
                onClick={() => toggleSection(category)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
              >
                <div className="flex items-center gap-3">
                  {expandedSections.has(category) ? (
                    <ChevronDown className="w-5 h-5 text-purple-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-purple-400" />
                  )}
                  <h2 className="text-xl font-bold text-purple-300">{category}</h2>
                  <span className="text-sm text-gray-400">({routes.length})</span>
                </div>
              </button>

              {expandedSections.has(category) && (
                <div className="px-4 pb-4 space-y-2">
                  {routes.map((route, idx) => (
                    <div
                      key={idx}
                      className="bg-black/20 border border-white/10 rounded-lg p-3 hover:border-purple-400/50 transition group"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`${getMethodColor(route.method)} text-white text-xs font-bold px-2 py-1 rounded`}>
                          {route.method}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-purple-300 font-mono text-sm">{route.path}</code>
                            <button
                              onClick={() => copyToClipboard(route.path)}
                              className="opacity-0 group-hover:opacity-100 transition"
                            >
                              {copiedPath === route.path ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
                              )}
                            </button>
                          </div>
                          <p className="text-sm text-gray-300">{route.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {Object.keys(filteredRoutes).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-2">No routes found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🔐 All endpoints require JWT authentication via Bearer token</p>
          <p className="mt-1">📝 Base URL: <code className="text-purple-300">Authorization: Bearer &lt;token&gt;</code></p>
        </div>
      </div>
    </div>
  );
};

export default APIDocsPage;