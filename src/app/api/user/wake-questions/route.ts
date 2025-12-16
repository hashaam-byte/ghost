// src/app/api/user/wake-questions/route.ts - FIXED VERSION
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

// POST - Submit wake questions (onboarding preferences)
export async function POST(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      primaryGoal,
      strictnessLevel,
      productiveTime,
      feedbackStyle,
      mainStruggle,
      talkFrequency,
    } = await request.json();

    // Validate required fields
    if (!primaryGoal || !strictnessLevel || !productiveTime || 
        !feedbackStyle || !mainStruggle || !talkFrequency) {
      return NextResponse.json(
        { message: 'All wake questions must be answered' },
        { status: 400 }
      );
    }

    // Get user with ghost profile
    const user = await db.user.findUnique({
      where: { id: decoded.userId },
      include: { ghostProfile: true },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Map wake questions to ghost profile settings
    const personality = mapFeedbackStyleToPersonality(feedbackStyle);
    const focusAreas = mapPrimaryGoalToFocusAreas(primaryGoal);
    const isMorningPerson = productiveTime === 'morning';
    const procrastinates = mainStruggle === 'consistency' || mainStruggle === 'motivation';
    const motivationStyle = mapStrictnessToMotivation(strictnessLevel);
    const tone = mapFeedbackStyleToTone(feedbackStyle);

    const isFirstTimeOnboarding = !user.ghostProfile;

    // Update ghost profile in a transaction
    await db.$transaction(async (tx) => {
      // Update or create ghost profile
      await tx.ghostProfile.upsert({
        where: { userId: decoded.userId },
        create: {
          userId: decoded.userId,
          personality,
          tone,
          mainFocusAreas: focusAreas,
          isMorningPerson,
          procrastinates,
          motivationStyle,
          totalXP: 50, // Welcome bonus
          level: 1,
          xpToNextLevel: 100,
          coins: 100,
          evolutionStage: 1,
          ghostForm: 'baby',
          avatarStyle: 'basic',
          skinColor: '#A020F0',
          glowColor: '#A020F0',
          auraColor: 'pink',
          currentAnimation: 'float',
          personalityEmoji: '👻',
          roomTheme: 'default',
          roomItems: [],
          roomRating: 0,
          isRoomPublic: true,
          timezone: 'Africa/Lagos',
          language: 'en',
          currentMood: 'happy',
          isSleeping: false,
          isFloating: true,
          lastInteraction: new Date(),
          // Store raw wake answers for future reference
          userPreferences: {
            primaryGoal,
            strictnessLevel,
            productiveTime,
            feedbackStyle,
            mainStruggle,
            talkFrequency,
          },
        },
        update: {
          personality,
          tone,
          mainFocusAreas: focusAreas,
          isMorningPerson,
          procrastinates,
          motivationStyle,
          lastInteraction: new Date(),
          userPreferences: {
            primaryGoal,
            strictnessLevel,
            productiveTime,
            feedbackStyle,
            mainStruggle,
            talkFrequency,
          },
        },
      });

      // Award welcome XP only for first-time onboarding
      if (isFirstTimeOnboarding) {
        await tx.xPHistory.create({
          data: {
            userId: decoded.userId,
            amount: 50,
            reason: 'Completed onboarding! Welcome to GhostX 👻',
            category: 'system',
            syncedToServer: true,
          },
        });
      }

      // Ensure usage stats exist
      await tx.usageStats.upsert({
        where: { userId: decoded.userId },
        create: {
          userId: decoded.userId,
          chatCount: 0,
          chatLimit: 50,
          scanCount: 0,
          scanLimit: 10,
          schoolScanCount: 0,
          schoolScanLimit: 5,
          voiceNoteCount: 0,
          voiceNoteLimit: 20,
          apiCallCount: 0,
          apiCallLimit: 1000,
          lastResetDate: new Date(),
        },
        update: {}, // Don't reset limits if already exists
      });

      // Ensure subscription exists
      await tx.subscription.upsert({
        where: { userId: decoded.userId },
        create: {
          userId: decoded.userId,
          plan: user.plan || 'free',
          status: 'active',
          currency: 'NGN',
          startDate: new Date(),
        },
        update: {},
      });

      // Create or update daily login streak
      const existingStreak = await tx.streak.findUnique({
        where: {
          userId_type: {
            userId: decoded.userId,
            type: 'daily_login',
          },
        },
      });

      if (!existingStreak) {
        await tx.streak.create({
          data: {
            userId: decoded.userId,
            type: 'daily_login',
            count: 1,
            bestStreak: 1,
            isActive: true,
            lastUpdated: new Date(),
          },
        });
      }

      // Create or update leaderboard entry
      await tx.leaderboard.upsert({
        where: { userId: decoded.userId },
        create: {
          userId: decoded.userId,
          totalXP: isFirstTimeOnboarding ? 100 : 50, // 50 from signup + 50 from onboarding
          level: 1,
          aestheticScore: 0,
          streakDays: 1,
          questsCompleted: 0,
        },
        update: {
          totalXP: isFirstTimeOnboarding ? 100 : undefined,
        },
      });
    });

    // Get updated user with all relations and map to Flutter format
    const updatedUser = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ghostProfile: true,
        usageStats: true,
        subscription: true,
        streaks: {
          where: { isActive: true },
          orderBy: { count: 'desc' },
          take: 5,
        },
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'Failed to fetch updated user' },
        { status: 500 }
      );
    }

    // Map to Flutter-compatible format
    const mappedUser = {
      ...updatedUser,
      displayName: updatedUser.name || updatedUser.username,
      xp: updatedUser.ghostProfile?.totalXP || 0,
      level: updatedUser.ghostProfile?.level || 1,
      ghostType: updatedUser.ghostProfile?.ghostForm || 'baby',
      ghostMood: updatedUser.ghostProfile?.currentMood || 'happy',
      ghostColor: updatedUser.ghostProfile?.glowColor || '#8B5CF6',
      primaryGoal,
      strictnessLevel,
      productiveTime,
      feedbackStyle,
      mainStruggle,
      talkFrequency,
      voiceTriggerEnabled: true,
      offlineMode: true,
      notificationsEnabled: true,
      locationSharingEnabled: !!updatedUser.communityZone,
      lastActive: updatedUser.lastActive,
    };

    // Remove password from response
    const { password: _, ...userWithoutPassword } = mappedUser;

    return NextResponse.json({
      success: true,
      message: 'Ghost awakened successfully! 👻',
      user: userWithoutPassword,
      needsOnboarding: false, // They just completed it
    });
  } catch (error) {
    console.error('Wake questions error:', error);
    
    // More specific error messages
    if (error instanceof Error) {
      return NextResponse.json(
        { message: `Failed to process wake questions: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { message: 'Failed to process wake questions' },
      { status: 500 }
    );
  }
}

// GET - Get current wake question answers
export async function GET(request: NextRequest) {
  try {
    const decoded = getUserFromToken(request);
    if (!decoded) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ghostProfile = await db.ghostProfile.findUnique({
      where: { userId: decoded.userId },
    });

    if (!ghostProfile) {
      return NextResponse.json(
        { message: 'Ghost profile not found' },
        { status: 404 }
      );
    }

    // Extract preferences safely
    const preferences = ghostProfile.userPreferences as any || {};

    return NextResponse.json({
      success: true,
      preferences: {
        primaryGoal: preferences.primaryGoal || null,
        strictnessLevel: preferences.strictnessLevel || null,
        productiveTime: preferences.productiveTime || null,
        feedbackStyle: preferences.feedbackStyle || null,
        mainStruggle: preferences.mainStruggle || null,
        talkFrequency: preferences.talkFrequency || null,
      },
      personality: ghostProfile.personality,
      focusAreas: ghostProfile.mainFocusAreas,
      motivationStyle: ghostProfile.motivationStyle,
      hasCompletedOnboarding: ghostProfile.mainFocusAreas.length > 0,
    });
  } catch (error) {
    console.error('Get wake questions error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// Helper functions to map wake questions to ghost settings

function mapFeedbackStyleToPersonality(feedbackStyle: string): string {
  const mapping: Record<string, string> = {
    'gentle': 'chill',
    'honest': 'productive',
    'roast': 'funny',
    'silent': 'silent',
    'tough': 'coach',
  };
  return mapping[feedbackStyle.toLowerCase()] || 'chill';
}

function mapFeedbackStyleToTone(feedbackStyle: string): string {
  const mapping: Record<string, string> = {
    'gentle': 'friendly',
    'honest': 'neutral',
    'roast': 'sarcastic',
    'silent': 'formal',
    'tough': 'formal',
  };
  return mapping[feedbackStyle.toLowerCase()] || 'friendly';
}

function mapPrimaryGoalToFocusAreas(primaryGoal: string): string[] {
  const mapping: Record<string, string[]> = {
    'study': ['productivity', 'education'],
    'school': ['productivity', 'education'],
    'business': ['productivity', 'business'],
    'money': ['productivity', 'business'],
    'crypto': ['productivity', 'finance'],
    'discipline': ['productivity', 'health'],
    'focus': ['productivity', 'focus'],
    'life': ['health', 'social', 'personal'],
  };
  
  const key = primaryGoal.toLowerCase();
  
  // Check if exact match exists
  if (mapping[key]) {
    return mapping[key];
  }
  
  // Check for partial matches
  for (const [goalKey, areas] of Object.entries(mapping)) {
    if (key.includes(goalKey)) {
      return areas;
    }
  }
  
  return ['productivity'];
}

function mapStrictnessToMotivation(strictnessLevel: string): string {
  const mapping: Record<string, string> = {
    'chill': 'positive',
    'balanced': 'positive',
    'strict': 'tough_love',
  };
  return mapping[strictnessLevel.toLowerCase()] || 'positive';
}