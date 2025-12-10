export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: '₦',
    interval: null,
    features: {
      ghostChat: { enabled: true, limit: 50, label: '50 Ghost chats/day' },
      ghostScan: { enabled: true, limit: 5, label: '5 scans/day' },
      ghostTasks: { enabled: true, limit: 10, label: '10 active tasks' },
      ghostInsights: { enabled: true, limit: 'basic', label: 'Basic insights' },
      ghostSchool: { enabled: true, limit: 5, label: '5 homework scans/day' },
      ghostBusiness: { enabled: false, limit: 0, label: 'Business Mode ❌' },
      ghostCrypto: { enabled: false, limit: 0, label: 'Crypto Scan ❌' },
      voiceMode: { enabled: false, limit: 0, label: 'Voice Mode ❌' },
      deepPersonality: { enabled: false, limit: 0, label: 'Deep Personality ❌' },
      predictions: { enabled: false, limit: 0, label: 'AI Predictions ❌' },
      unlimitedMemory: { enabled: false, limit: 0, label: 'Limited Memory' },
      prioritySupport: { enabled: false, limit: 0, label: 'Community Support' },
      ghostCustomization: { enabled: false, limit: 0, label: 'Basic Avatar' },
      exportData: { enabled: false, limit: 0, label: 'No Export' },
    }
  },
  pro: {
    id: 'pro',
    name: 'Ghost Pro',
    price: 2000,
    priceYearly: 20000,
    currency: '₦',
    interval: 'month',
    popular: true,
    discount: {
      yearly: '17% OFF',
      student: '50% OFF'
    },
    features: {
      ghostChat: { enabled: true, limit: 'unlimited', label: 'Unlimited Ghost chats' },
      ghostScan: { enabled: true, limit: 'unlimited', label: 'Unlimited scans' },
      ghostTasks: { enabled: true, limit: 'unlimited', label: 'Unlimited tasks' },
      ghostInsights: { enabled: true, limit: 'advanced', label: 'Advanced AI insights' },
      ghostSchool: { enabled: true, limit: 'unlimited', label: 'Unlimited homework help' },
      ghostBusiness: { enabled: true, limit: 'unlimited', label: 'Business Mode ✅' },
      ghostCrypto: { enabled: true, limit: 'unlimited', label: 'Crypto Scan AI ✅' },
      voiceMode: { enabled: true, limit: 'unlimited', label: 'Voice Mode ✅' },
      deepPersonality: { enabled: true, limit: 'unlimited', label: 'Deep Personality Analysis ✅' },
      predictions: { enabled: true, limit: 'unlimited', label: 'AI Predictions ✅' },
      unlimitedMemory: { enabled: true, limit: 'unlimited', label: 'Unlimited Memory' },
      prioritySupport: { enabled: true, limit: 'unlimited', label: '24/7 Priority Support' },
      ghostCustomization: { enabled: true, limit: 'unlimited', label: 'Premium Avatars & Skins' },
      exportData: { enabled: true, limit: 'unlimited', label: 'Full Data Export' },
      weeklyReports: { enabled: true, limit: 'unlimited', label: 'Weekly AI Reports' },
      advancedAnalytics: { enabled: true, limit: 'unlimited', label: 'Advanced Analytics' },
    }
  }
};

export const PRO_ONLY_FEATURES = [
  'ghostBusiness',
  'ghostCrypto',
  'voiceMode',
  'deepPersonality',
  'predictions',
  'unlimitedMemory',
  'prioritySupport',
  'ghostCustomization',
  'exportData',
  'weeklyReports',
  'advancedAnalytics'
];

export const FEATURE_DESCRIPTIONS = {
  ghostBusiness: {
    title: 'Ghost Business Mode',
    description: 'AI-powered business analyzer, competitor research, pitch deck creator, and market insights',
    icon: '💼',
    preview: 'Analyze any business idea, get competitor insights, and create professional pitch decks instantly'
  },
  ghostCrypto: {
    title: 'Ghost Crypto Scanner',
    description: 'Scam detection, wallet risk analysis, token screening, and beginner-friendly tutorials',
    icon: '💰',
    preview: 'Scan any crypto screenshot or contract address to detect scams and rug pulls'
  },
  voiceMode: {
    title: 'Voice Mode',
    description: 'Talk to Ghost naturally. Get instant voice responses and hands-free assistance',
    icon: '🎤',
    preview: 'Have natural conversations with Ghost using your voice'
  },
  deepPersonality: {
    title: 'Deep Personality Analysis',
    description: 'Advanced psychological profiling based on your behavior, chats, and patterns',
    icon: '🧠',
    preview: 'Get deep insights into your personality, strengths, weaknesses, and growth areas'
  },
  predictions: {
    title: 'AI Predictions',
    description: 'Ghost predicts outcomes, relationship patterns, and life decisions based on your data',
    icon: '🔮',
    preview: 'Get AI-powered predictions about relationships, career moves, and important decisions'
  },
  unlimitedMemory: {
    title: 'Unlimited Ghost Memory',
    description: 'Ghost remembers everything forever. Perfect recall of all conversations and data',
    icon: '💾',
    preview: 'Ghost never forgets anything about you'
  }
};

export function checkFeatureAccess(
  feature: string, 
  userPlan: 'free' | 'pro',
  usage?: { current: number; limit: number | 'unlimited' }
): { allowed: boolean; reason?: string } {
  const plan = SUBSCRIPTION_PLANS[userPlan];
  const featureConfig = plan.features[feature as keyof typeof plan.features];

  if (!featureConfig || !featureConfig.enabled) {
    return { 
      allowed: false, 
      reason: `${feature} is only available for Ghost Pro members` 
    };
  }

  if (usage && featureConfig.limit !== 'unlimited') {
    if (typeof featureConfig.limit === 'number' && usage.current >= featureConfig.limit) {
      return {
        allowed: false,
        reason: `You've reached your daily limit of ${featureConfig.limit}. Upgrade to Pro for unlimited access.`
      };
    }
  }

  return { allowed: true };
}