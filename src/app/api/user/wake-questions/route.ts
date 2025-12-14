// src/app/api/user/wake-questions/route.ts
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

    // Get user
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

    // Update or create ghost profile
    const ghostProfile = await db.ghostProfile.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        personality,
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
        roomTheme: 'default',
        roomItems: [],
        currentMood: 'happy',
        // Store raw wake answers for future reference
        userPreferences: {
          primaryGoal,
          strictnessLevel,
          productiveTime,
          feedbackStyle,
          mainStruggle,
          talkFrequency,
        } as any,
      },
      update: {
        personality,
        mainFocusAreas: focusAreas,
        isMorningPerson,
        procrastinates,
        motivationStyle,
        userPreferences: {
          primaryGoal,
          strictnessLevel,
          productiveTime,
          feedbackStyle,
          mainStruggle,
          talkFrequency,
        } as any,
      },
    });

    // Award welcome XP if this is first time completing onboarding
    if (!user.ghostProfile) {
      await db.xPHistory.create({
        data: {
          userId: decoded.userId,
          amount: 50,
          reason: 'Completed onboarding! Welcome to GhostX 👻',
          category: 'system',
          syncedToServer: true,
        },
      });
    }

    // Update usage stats if they don't exist
    await db.usageStats.upsert({
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
        lastResetDate: new Date(),
      },
      update: {},
    });

    // Create initial streak
    await db.streak.upsert({
      where: {
        userId_type: {
          userId: decoded.userId,
          type: 'daily_login',
        },
      },
      create: {
        userId: decoded.userId,
        type: 'daily_login',
        count: 1,
        bestStreak: 1,
        isActive: true,
      },
      update: {},
    });

    // Get updated user with all relations
    const updatedUser = await db.user.findUnique({
      where: { id: decoded.userId },
      include: {
        ghostProfile: true,
        usageStats: true,
        subscription: true,
        streaks: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ghost awakened successfully! 👻',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Wake questions error:', error);
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

    return NextResponse.json({
      success: true,
      preferences: ghostProfile.userPreferences || {},
      personality: ghostProfile.personality,
      focusAreas: ghostProfile.mainFocusAreas,
      motivationStyle: ghostProfile.motivationStyle,
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