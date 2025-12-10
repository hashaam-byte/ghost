"use client";

import { useState } from 'react';
import { useAuth } from '@/src/lib/auth-context';

interface ScanResult {
  analysis: string;
  redFlags: string[];
  tone: string;
  recommendation: string;
  threatLevel: 'low' | 'medium' | 'high';
}

export default function GhostScanPage() {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [context, setContext] = useState('');
  const [scanType, setScanType] = useState<'dm' | 'general' | 'crypto' | 'social'>('general');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const isPro = (user as any)?.plan === 'pro';

  const scanTypes = [
    { id: 'dm', icon: '💬', label: 'DM Analysis', desc: 'Decode texts & relationships' },
    { id: 'general', icon: '🔍', label: 'General Scan', desc: 'Analyze any screenshot' },
    { id: 'crypto', icon: '💰', label: 'Crypto Scan', desc: 'Scam detection', pro: true },
    { id: 'social', icon: '📱', label: 'Social Analysis', desc: 'Profile insights', pro: true },
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('context', context);
      formData.append('scanType', scanType);

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Scan failed');
      }

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Scan error:', error);
      alert('Failed to scan. Try again!');
    } finally {
      setIsScanning(false);
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🔍</span>
            Ghost Scan
          </h1>
          <p className="text-slate-400">Upload anything - screenshots, DMs, images. Ghost analyzes it all.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Upload & Options */}
          <div className="space-y-6">
            {/* Scan Type Selection */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Choose Scan Type</h2>
              <div className="grid grid-cols-2 gap-3">
                {scanTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (type.pro && !isPro) {
                        alert('This is a Ghost Pro feature!');
                        return;
                      }
                      setScanType(type.id as any);
                    }}
                    disabled={type.pro && !isPro}
                    className={`p-4 rounded-xl border-2 transition text-left relative ${
                      scanType === type.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : type.pro && !isPro
                          ? 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
                          : 'border-slate-700 hover:border-purple-500/30 bg-slate-800/30'
                    }`}
                  >
                    {type.pro && !isPro && (
                      <div className="absolute top-2 right-2 text-yellow-400">⭐</div>
                    )}
                    <div className="text-3xl mb-2">{type.icon}</div>
                    <div className="font-semibold text-white text-sm">{type.label}</div>
                    <div className="text-xs text-slate-400">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Upload Image</h2>
              
              {!preview ? (
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-purple-500/50 transition cursor-pointer">
                    <div className="text-6xl mb-4">📸</div>
                    <div className="text-white font-semibold mb-2">Click to upload</div>
                    <div className="text-sm text-slate-400">PNG, JPG, or WebP</div>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <img src={preview} alt="Preview" className="w-full rounded-xl" />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreview('');
                      setResult(null);
                    }}
                    className="w-full py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition"
                  >
                    Remove Image
                  </button>
                </div>
              )}
            </div>

            {/* Context Input */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Add Context (Optional)</h2>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="E.g., 'This is from a dating app' or 'Crypto project screenshot'"
                className="w-full h-24 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
              />
            </div>

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={!selectedFile || isScanning}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isScanning ? '⏳ Scanning...' : '🚀 Scan Now'}
            </button>

            {!isPro && (
              <div className="text-center text-sm text-slate-400">
                Free users: 5 scans/day
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div>
            {!result && !isScanning && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="text-8xl mb-4 animate-pulse">👻</div>
                <div className="text-2xl font-bold text-white mb-2">Ready to Scan</div>
                <div className="text-slate-400">Upload an image to get started</div>
              </div>
            )}

            {isScanning && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center">
                <div className="text-8xl mb-4 animate-bounce">🔍</div>
                <div className="text-2xl font-bold text-white mb-2">Analyzing...</div>
                <div className="text-slate-400">Ghost is reading between the lines</div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Threat Level */}
                <div className={`rounded-2xl border-2 p-6 ${getThreatColor(result.threatLevel)}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-3xl">
                      {result.threatLevel === 'low' ? '✅' : result.threatLevel === 'medium' ? '⚠️' : '🚨'}
                    </div>
                    <div>
                      <div className="font-bold text-lg capitalize">{result.threatLevel} Threat Level</div>
                      <div className="text-sm opacity-80">{result.tone}</div>
                    </div>
                  </div>
                </div>

                {/* Analysis */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span>🧠</span> Ghost's Analysis
                  </h3>
                  <p className="text-slate-300 whitespace-pre-wrap">{result.analysis}</p>
                </div>

                {/* Red Flags */}
                {result.redFlags.length > 0 && (
                  <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl border border-red-500/30 p-6">
                    <h3 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
                      <span>🚩</span> Red Flags Detected
                    </h3>
                    <ul className="space-y-2">
                      {result.redFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2 text-red-300">
                          <span className="mt-1">•</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendation */}
                <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                    <span>💡</span> Recommendation
                  </h3>
                  <p className="text-green-300">{result.recommendation}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white hover:bg-slate-800 transition">
                    💾 Save Result
                  </button>
                  <button className="flex-1 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white hover:bg-slate-800 transition">
                    📤 Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}