import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

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

    // Username validation (alphanumeric, underscores, 3-20 chars)
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

    // Create user with all initial data in a transaction
    const user = await db.$transaction(async (tx) => {
      // Create user with ghost profile
      const newUser = await tx.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          isOnline: true,
          lastSeen: new Date(),
          lastActive: new Date(),
          ghostProfile: {
            create: {
              personality: 'chill',
              tone: 'friendly',
              mode: 'normal',
              totalXP: 0,
              level: 1,
              xpToNextLevel: 100,
              coins: 0,
              evolutionStage: 1,
              ghostForm: 'baby',
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
              customSlang: [],
            },
          },
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
        include: {
          ghostProfile: true,
          usageStats: true,
          leaderboardEntry: true,
        },
      });

      return newUser;
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Account created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Sign up error:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { message: 'Email or username already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}