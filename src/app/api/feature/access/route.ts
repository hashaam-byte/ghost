// src/app/api/feature/access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// Define all features and their unlock requirements
const FEATURES: Record<string, any> = {
  ghost_popup: {
    name: 'Ghost Popup',
    description: 'Access Ghost from anywhere on your phone',
    unlockRequirement: 'tutorial_complete',
    minLevel: 1,
  },
  crypto_scan: {
    name: 'Crypto Scanner',
    description: 'Detect crypto scams and threats',
    unlockRequirement: 'level_5',
    minLevel: 5,
    isPro: true,
  },
  social_scan: {
    name: 'Social Scanner',
    description: 'Analyze profiles and messages',
    unlockRequirement: 'level_5',
    minLevel: 5,
    isPro: true,
  },
  room_public: {
    name: 'Public Ghost Room',
    description: 'Share your 3D room with the community',
    unlockRequirement: 'level_3',
    minLevel: 3,
  },
  voice_commands: {
    name: 'Advanced Voice Commands',
    description: 'Control your phone with voice',
    unlockRequirement: 'quest_complete',
    minLevel: 2,
  },
  app_blocking: {
    name: 'App Blocker',
    description: 'Ghost can block distracting apps',
    unlockRequirement: 'tutorial_complete',
    minLevel: 1,
  },
  study_mode: {
    name: 'Study Mode',
    description: 'Advanced focus and study tools',
    unlockRequirement: 'tutorial_complete',
    minLevel: 1,
  },
  ghost_evolution: {
    name: 'Ghost Evolution',
    description: 'Evolve your ghost to new forms',
    unlockRequirement: 'level_2',
    minLevel: 2,
  },
  community_map: {
    name: 'Ghost World',
    description: 'Find and interact with nearby ghosts',
    unlockRequirement: 'level_4',
    minLevel: 4,
  },
  seasonal_events: {
    name: 'Seasonal Events',
    description: 'Access special seasonal content',
    unlockRequirement: 'level_3',
    minLevel: 3,
  },
};

// GET - Check Feature Access
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const featureKey = searchParams.get('feature');

    // Get user's ghost profile
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
      select: { level: true },
    });

    const userLevel = ghostProfile?.level || 1;

    // Get user's subscription
    const subscription = await db.subscription.findUnique({
      where: { userId: decoded.userId },
    });

    const isPro = subscription?.plan === 'ghost_pro' || subscription?.plan === 'ghost_plus';

    // Get all feature access records
    const featureAccess = await db.featureAccess.findMany({
      where: { userId: decoded.userId },
    });

    // Check specific feature
    if (featureKey) {
      const feature = FEATURES[featureKey];
      if (!feature) {
        return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
      }

      const access = featureAccess.find((f) => f.feature === featureKey);
      const isUnlocked = access?.unlocked || false;
      const canUnlock = userLevel >= feature.minLevel && (!feature.isPro || isPro);

      return NextResponse.json({
        feature: featureKey,
        unlocked: isUnlocked,
        canUnlock,
        requirement: feature.unlockRequirement,
        minLevel: feature.minLevel,
        isPro: feature.isPro || false,
        userLevel,
        userIsPro: isPro,
      });
    }

    // Return all features
    const allFeatures = Object.entries(FEATURES).map(([key, feature]) => {
      const access = featureAccess.find((f) => f.feature === key);
      const isUnlocked = access?.unlocked || false;
      const canUnlock = userLevel >= feature.minLevel && (!feature.isPro || isPro);

      return {
        key,
        name: feature.name,
        description: feature.description,
        unlocked: isUnlocked,
        canUnlock,
        requirement: feature.unlockRequirement,
        minLevel: feature.minLevel,
        isPro: feature.isPro || false,
        unlockedAt: access?.unlockedAt || null,
      };
    });

    return NextResponse.json({
      features: allFeatures,
      userLevel,
      isPro,
      totalUnlocked: allFeatures.filter((f) => f.unlocked).length,
      totalFeatures: allFeatures.length,
    });
  } catch (error) {
    console.error('Get feature access error:', error);
    return NextResponse.json(
      { message: 'Failed to get feature access' },
      { status: 500 }
    );
  }
}

// POST - Unlock Feature
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { feature, reason } = await request.json();

    if (!feature) {
      return NextResponse.json({ message: 'feature is required' }, { status: 400 });
    }

    const featureConfig = FEATURES[feature];
    if (!featureConfig) {
      return NextResponse.json({ message: 'Feature not found' }, { status: 404 });
    }

    // Check if already unlocked
    const existingAccess = await db.featureAccess.findUnique({
      where: {
        userId_feature: {
          userId: decoded.userId,
          feature,
        },
      },
    });

    if (existingAccess?.unlocked) {
      return NextResponse.json({
        success: true,
        message: 'Feature already unlocked',
        feature: existingAccess,
      });
    }

    // Check requirements
    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
      select: { level: true },
    });

    if (!ghostProfile || ghostProfile.level < featureConfig.minLevel) {
      return NextResponse.json(
        {
          message: 'Level requirement not met',
          required: featureConfig.minLevel,
          current: ghostProfile?.level || 1,
        },
        { status: 400 }
      );
    }

    // Check pro requirement
    if (featureConfig.isPro) {
      const subscription = await db.subscription.findUnique({
        where: { userId: decoded.userId },
      });

      const isPro = subscription?.plan === 'ghost_pro' || subscription?.plan === 'ghost_plus';
      if (!isPro) {
        return NextResponse.json(
          { message: 'Pro subscription required' },
          { status: 403 }
        );
      }
    }

    // Unlock feature
    const featureAccess = await db.featureAccess.upsert({
      where: {
        userId_feature: {
          userId: decoded.userId,
          feature,
        },
      },
      update: {
        unlocked: true,
        unlockedAt: new Date(),
        reason: reason || featureConfig.unlockRequirement,
      },
      create: {
        userId: decoded.userId,
        feature,
        unlocked: true,
        unlockedAt: new Date(),
        reason: reason || featureConfig.unlockRequirement,
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: decoded.userId,
        type: 'feature_unlock',
        title: '🔓 New Feature Unlocked!',
        message: `You unlocked: ${featureConfig.name}`,
        data: {
          feature,
          name: featureConfig.name,
        },
      },
    });

    // Award XP
    await db.xPHistory.create({
      data: {
        userId: decoded.userId,
        amount: 20,
        reason: `Unlocked ${featureConfig.name}`,
        category: 'feature_unlock',
      },
    });

    await db.ghostProfile.update({
      where: { userId: decoded.userId },
      data: {
        totalXP: { increment: 20 },
      },
    });

    return NextResponse.json({
      success: true,
      feature: featureAccess,
      xpAwarded: 20,
    });
  } catch (error) {
    console.error('Unlock feature error:', error);
    return NextResponse.json(
      { message: 'Failed to unlock feature' },
      { status: 500 }
    );
  }
}