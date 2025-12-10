"use client";

import { useRouter } from 'next/navigation';
import { FEATURE_DESCRIPTIONS } from '@/src/lib/subscription-config';

interface FeatureLockModalProps {
  feature: keyof typeof FEATURE_DESCRIPTIONS;
  isOpen: boolean;
  onClose: () => void;
}

export function FeatureLockModal({ feature, isOpen, onClose }: FeatureLockModalProps) {
  const router = useRouter();
  const featureInfo = FEATURE_DESCRIPTIONS[feature];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-900 to-purple-900/50 rounded-2xl border-2 border-purple-500/50 max-w-lg w-full p-8 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl"
        >
          ×
        </button>

        {/* Icon */}
        <div className="text-center mb-6">
          <div className="text-7xl mb-4">{featureInfo.icon}</div>
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-full px-4 py-1 mb-4">
            <span className="text-yellow-400">⭐</span>
            <span className="text-sm font-semibold text-purple-300">PRO FEATURE</span>
          </div>
        </div>

        {/* Content */}
        <h2 className="text-3xl font-bold text-white text-center mb-3">
          {featureInfo.title}
        </h2>
        <p className="text-slate-300 text-center mb-6">
          {featureInfo.description}
        </p>

        {/* Preview Box */}
        <div className="bg-slate-800/50 rounded-xl p-4 mb-6 border border-purple-500/30">
          <div className="text-sm text-slate-400 mb-2">Preview:</div>
          <div className="text-white">{featureInfo.preview}</div>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="text-green-400">✓</div>
            <div className="text-slate-300">Unlimited access 24/7</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-green-400">✓</div>
            <div className="text-slate-300">Advanced AI algorithms</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-green-400">✓</div>
            <div className="text-slate-300">Priority processing speed</div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/subscription')}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl font-semibold text-white hover:shadow-2xl hover:shadow-purple-500/50 transition"
          >
            Upgrade to Ghost Pro
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 border border-slate-700 rounded-xl font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Maybe Later
          </button>
        </div>

        {/* Price */}
        <div className="text-center mt-6">
          <div className="text-slate-400 text-sm">Starting at</div>
          <div className="text-2xl font-bold text-white">₦2,000/month</div>
          <div className="text-slate-400 text-xs">7-day free trial • Cancel anytime</div>
        </div>
      </div>
    </div>
  );
}