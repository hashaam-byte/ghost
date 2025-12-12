import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    console.log('Sign up attempt for:', email, username);

    // Validate input
    if (!email || !password || !username) {
      return NextResponse.json(
        { message: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { message: 'Username must be 3-20 characters (letters, numbers, underscores only)' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email },
          { username },
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return NextResponse.json(
        { message: `${field} already exists` },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating user with transaction...');

    // Create user with all initial data - MATCH EXACT SCHEMA FIELDS
    const user = await db.$transaction(async (tx) => {
      // Create user with ghost profile
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          isGuest: false,
          isOnline: true,
          lastSeen: new Date(),
          lastActive: new Date(),
          plan: 'free',
          isStudent: false,
          aestheticScore: 0,
          profileTheme: 'default',
          lastSyncAt: new Date(),
          offlineDataVersion: 1,
          // Create ghost profile with EXACT schema fields
          ghostProfile: {
            create: {
              personality: 'chill',
              tone: 'friendly',
              mode: 'normal',
              voicePack: 'default',
              customSlang: [],
              evolutionStage: 1,
              ghostForm: 'baby',
              totalXP: 0,
              level: 1,
              xpToNextLevel: 100,
              coins: 0,
              avatarStyle: 'basic',
              accessories: [],
              skinColor: '#FFFFFF',
              glowColor: '#A020F0',
              auraColor: 'pink',
              currentAnimation: 'float',
              personalityEmoji: '👻',
              roomTheme: 'default',
              roomItems: [],
              roomRating: 0,
              isRoomPublic: true,
              roomViews: 0,
              mainFocusAreas: ['productivity'],
              timezone: 'Africa/Lagos',
              language: 'en',
              isMorningPerson: false,
              procrastinates: false,
              motivationStyle: 'positive',
              currentMood: 'happy',
              lastInteraction: new Date(),
              isSleeping: false,
              isFloating: true,
              totalInteractions: 0,
              totalChats: 0,
              totalCommands: 0,
              questsCompleted: 0,
              streakDays: 0,
              helpfulness: 0,
              unlockedPowers: [],
            },
          },
          // Create usage stats with EXACT schema fields
          usageStats: {
            create: {
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
          },
          // Create leaderboard entry with EXACT schema fields
          leaderboardEntry: {
            create: {
              totalXP: 0,
              level: 1,
              aestheticScore: 0,
              streakDays: 0,
              questsCompleted: 0,
              rankChange: 0,
              isRising: false,
              seasonPoints: 0,
            },
          },
          // Create initial streak with EXACT schema fields
          streaks: {
            create: {
              type: 'daily_login',
              count: 1,
              bestStreak: 1,
              lastUpdated: new Date(),
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          isGuest: true,
          isOnline: true,
          lastSeen: true,
          communityZone: true,
          plan: true,
          planExpiry: true,
          isStudent: true,
          bio: true,
          aestheticScore: true,
          profileTheme: true,
          createdAt: true,
          updatedAt: true,
          ghostProfile: {
            select: {
              id: true,
              personality: true,
              tone: true,
              mode: true,
              totalXP: true,
              level: true,
              coins: true,
              evolutionStage: true,
              ghostForm: true,
              currentMood: true,
            }
          },
          usageStats: true,
          leaderboardEntry: true,
        },
      });

      console.log('User created successfully:', newUser.id);
      return newUser;
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Token generated, returning response');

    return NextResponse.json({
      user,
      token,
      message: 'Account created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Sign up error:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      // Unique constraint violation
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { message: 'Email or username already exists' },
          { status: 409 }
        );
      }

      // Unknown field error (schema mismatch)
      if (error.message.includes('Unknown field') || error.message.includes('Unknown arg')) {
        console.error('SCHEMA MISMATCH:', error.message);
        return NextResponse.json(
          { 
            message: 'Database schema error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          },
          { status: 500 }
        );
      }

      // Foreign key constraint
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json(
          { message: 'Database relationship error' },
          { status: 500 }
        );
      }

      // Return detailed error in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { 
            message: 'Sign up error',
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5).join('\n')
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}