
// ===========================================
// app/api/auth/signup/route.ts - Sign Up Route
// ===========================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST_SIGNUP(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          username ? { username: username.toLowerCase() } : { id: '' },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return NextResponse.json(
          { message: 'Email already registered' },
          { status: 409 }
        );
      }
      if (existingUser.username === username?.toLowerCase()) {
        return NextResponse.json(
          { message: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate default username if not provided
    const finalUsername = username || `ghost_${Date.now().toString(36)}`;

    // Create user and related records in a transaction
    const user = await db.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          username: finalUsername.toLowerCase(),
          password: hashedPassword,
          plan: 'free',
          isGuest: false,
          isOnline: true,
          lastActive: new Date(),
          lastSyncAt: new Date(),
        },
      });

      // Create ghost profile
      const ghostProfile = await tx.ghostProfile.create({
        data: {
          userId: newUser.id,
          personality: 'chill',
          mode: 'normal',
          voicePack: 'default',
          totalXP: 0,
          level: 1,
          xpToNextLevel: 100,
          coins: 100, // Starting coins
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
          mainFocusAreas: [],
          timezone: 'Africa/Lagos',
          language: 'en',
          isMorningPerson: false,
          procrastinates: false,
          motivationStyle: 'positive',
          currentMood: 'happy',
          isSleeping: false,
          isFloating: true,
        },
      });

      // Create usage stats
      await tx.usageStats.create({
        data: {
          userId: newUser.id,
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
      });

      // Create subscription record
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          plan: 'free',
          status: 'active',
          currency: 'NGN',
        },
      });

      // Create initial streak
      await tx.streak.create({
        data: {
          userId: newUser.id,
          type: 'daily_login',
          count: 1,
          bestStreak: 1,
          isActive: true,
        },
      });

      // Award welcome XP
      await tx.xPHistory.create({
        data: {
          userId: newUser.id,
          amount: 50,
          reason: 'Welcome to GhostX! 🎉',
          category: 'system',
          syncedToServer: true,
        },
      });

      // Update ghost profile with welcome XP
      await tx.ghostProfile.update({
        where: { userId: newUser.id },
        data: { totalXP: 50 },
      });

      // Create leaderboard entry
      await tx.leaderboard.create({
        data: {
          userId: newUser.id,
          totalXP: 50,
          level: 1,
          aestheticScore: 0,
          streakDays: 1,
          questsCompleted: 0,
        },
      });

      return { ...newUser, ghostProfile };
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        plan: user.plan,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Get complete user data
    const completeUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        ghostProfile: true,
        usageStats: true,
        subscription: true,
      },
    });

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = completeUser!;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
      message: 'Account created successfully! Welcome to GhostX 👻',
    }, { status: 201 });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
