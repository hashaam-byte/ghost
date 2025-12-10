"use client";

import { useState } from 'react';
import { useAuth } from '@/src/lib/auth-context';

interface Solution {
  problem: string;
  subject: string;
  solution: string;
  steps: string[];
  explanation: string;
}

export default function GhostSchoolPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'scan' | 'type'>('scan');
  const [subject, setSubject] = useState('math');
  const [problem, setProblem] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const isPro = (user as any)?.plan === 'pro';

  const subjects = [
    { id: 'math', icon: '🔢', label: 'Mathematics' },
    { id: 'physics', icon: '⚛️', label: 'Physics' },
    { id: 'chemistry', icon: '🧪', label: 'Chemistry' },
    { id: 'biology', icon: '🧬', label: 'Biology' },
    { id: 'english', icon: '📖', label: 'English' },
    { id: 'economics', icon: '💰', label: 'Economics' },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSolve = async () => {
    if (mode === 'scan' && !selectedImage) return;
    if (mode === 'type' && !problem.trim()) return;

    setIsSolving(true);
    setSolution(null);

    try {
      const formData = new FormData();
      if (mode === 'scan' && selectedImage) {
        formData.append('file', selectedImage);
      } else {
        formData.append('problem', problem);
      }
      formData.append('subject', subject);

      const response = await fetch('/api/school/solve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to solve');
      }

      const data = await response.json();
      setSolution(data.solution);
    } catch (error) {
      console.error('Solve error:', error);
      alert('Failed to solve. Try again!');
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">📚</span>
            Ghost School
          </h1>
          <p className="text-slate-400">Homework help, past questions, study plans - Ghost got you! 💯</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">How do you want to submit?</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMode('scan')}
                  className={`p-4 rounded-xl border-2 transition ${
                    mode === 'scan'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 hover:border-purple-500/30 bg-slate-800/30'
                  }`}
                >
                  <div className="text-4xl mb-2">📸</div>
                  <div className="font-semibold text-white">Scan Photo</div>
                  <div className="text-xs text-slate-400">Take a pic of homework</div>
                </button>
                <button
                  onClick={() => setMode('type')}
                  className={`p-4 rounded-xl border-2 transition ${
                    mode === 'type'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-slate-700 hover:border-purple-500/30 bg-slate-800/30'
                  }`}
                >
                  <div className="text-4xl mb-2">⌨️</div>
                  <div className="font-semibold text-white">Type It Out</div>
                  <div className="text-xs text-slate-400">Write the question</div>
                </button>
              </div>
            </div>

            {/* Subject Selection */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Subject</h2>
              <div className="grid grid-cols-3 gap-2">
                {subjects.map((subj) => (
                  <button
                    key={subj.id}
                    onClick={() => setSubject(subj.id)}
                    className={`p-3 rounded-xl border-2 transition text-center ${
                      subject === subj.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-slate-700 hover:border-purple-500/30 bg-slate-800/30'
                    }`}
                  >
                    <div className="text-2xl mb-1">{subj.icon}</div>
                    <div className="text-xs text-white font-semibold">{subj.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {mode === 'scan' ? 'Upload Homework' : 'Type Question'}
              </h2>

              {mode === 'scan' ? (
                !preview ? (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-purple-500/50 transition cursor-pointer">
                      <div className="text-6xl mb-4">📸</div>
                      <div className="text-white font-semibold mb-2">Click to upload</div>
                      <div className="text-sm text-slate-400">Or drag and drop</div>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <img src={preview} alt="Preview" className="w-full rounded-xl" />
                    <button
                      onClick={() => {
                        setSelectedImage(null);
                        setPreview('');
                      }}
                      className="w-full py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition"
                    >
                      Remove
                    </button>
                  </div>
                )
              ) : (
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="E.g., Solve: 2x + 5 = 13"
                  className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition resize-none"
                />
              )}
            </div>

            {/* Solve Button */}
            <button
              onClick={handleSolve}
              disabled={isSolving || (mode === 'scan' ? !selectedImage : !problem.trim())}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSolving ? '⏳ Solving...' : '🧠 Solve It For Me!'}
            </button>

            {!isPro && (
              <div className="text-center text-sm text-slate-400">
                Free users: 5 homework scans/day
              </div>
            )}
          </div>

          {/* Right: Solution */}
          <div>
            {!solution && !isSolving && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="text-8xl mb-4 animate-pulse">📚</div>
                <div className="text-2xl font-bold text-white mb-2">Ready to Help!</div>
                <div className="text-slate-400">Upload or type a question to get started</div>
              </div>
            )}

            {isSolving && (
              <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-12 text-center">
                <div className="text-8xl mb-4 animate-spin">🧠</div>
                <div className="text-2xl font-bold text-white mb-2">Solving...</div>
                <div className="text-slate-400">Ghost is working on it</div>
              </div>
            )}

            {solution && (
              <div className="space-y-6">
                {/* Problem */}
                <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-purple-500/20 p-6">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span>📝</span> Problem
                  </h3>
                  <p className="text-slate-300">{solution.problem}</p>
                  <div className="mt-2 inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-400 text-sm">
                    {solution.subject}
                  </div>
                </div>

                {/* Steps */}
                <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl border border-green-500/30 p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <span>✅</span> Step-by-Step Solution
                  </h3>
                  <div className="space-y-4">
                    {solution.steps.map((step, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">
                          {i + 1}
                        </div>
                        <p className="text-green-300 flex-1 pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-blue-500/10 backdrop-blur-xl rounded-2xl border border-blue-500/30 p-6">
                  <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <span>💡</span> Explanation
                  </h3>
                  <p className="text-blue-300 whitespace-pre-wrap">{solution.explanation}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white hover:bg-slate-800 transition">
                    💾 Save
                  </button>
                  <button className="py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white hover:bg-slate-800 transition">
                    📤 Share
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Study Tools */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">More Study Tools</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <button className="p-6 bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-left">
              <div className="text-4xl mb-3">🗂️</div>
              <div className="font-bold text-white mb-2">Flashcards</div>
              <div className="text-sm text-slate-400">Auto-generate from notes</div>
            </button>
            <button className="p-6 bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-left">
              <div className="text-4xl mb-3">📅</div>
              <div className="font-bold text-white mb-2">Study Plan</div>
              <div className="text-sm text-slate-400">AI-powered schedule</div>
            </button>
            <button className="p-6 bg-slate-900/50 backdrop-blur-xl rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition text-left">
              <div className="text-4xl mb-3">📖</div>
              <div className="font-bold text-white mb-2">Past Questions</div>
              <div className="text-sm text-slate-400">WAEC, JAMB, NECO</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}