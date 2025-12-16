// app/api/auth/signin/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-this';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email OR username
    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }, // Allow login with username
        ],
      },
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

    if (!user || !user.password) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last active and streak
    await db.$transaction(async (tx) => {
      // Update user
      await tx.user.update({
        where: { id: user.id },
        data: {
          lastActive: new Date(),
          lastSeen: new Date(),
          isOnline: true,
        },
      });

      // Update or create daily login streak
      const loginStreak = await tx.streak.findFirst({
        where: {
          userId: user.id,
          type: 'daily_login',
        },
      });

      if (loginStreak) {
        const lastUpdate = new Date(loginStreak.lastUpdated);
        const now = new Date();
        const hoursSinceLastLogin = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

        // If more than 24 hours but less than 48, increment streak
        if (hoursSinceLastLogin >= 24 && hoursSinceLastLogin < 48) {
          await tx.streak.update({
            where: { id: loginStreak.id },
            data: {
              count: loginStreak.count + 1,
              bestStreak: Math.max(loginStreak.bestStreak, loginStreak.count + 1),
              lastUpdated: now,
            },
          });
        } 
        // If more than 48 hours, reset streak
        else if (hoursSinceLastLogin >= 48) {
          await tx.streak.update({
            where: { id: loginStreak.id },
            data: {
              count: 1,
              lastUpdated: now,
            },
          });
        }
        // If less than 24 hours, just update timestamp
        else {
          await tx.streak.update({
            where: { id: loginStreak.id },
            data: {
              lastUpdated: now,
            },
          });
        }
      }
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

    // Return user data (without password) with Flutter-compatible field names
    const { password: _, ...userWithoutPassword } = user;
    
    // Map database fields to Flutter model fields
    const mappedUser = {
      ...userWithoutPassword,
      displayName: userWithoutPassword.name || userWithoutPassword.username, // Map name to displayName
      xp: userWithoutPassword.ghostProfile?.totalXP || 0,
      level: userWithoutPassword.ghostProfile?.level || 1,
      ghostType: userWithoutPassword.ghostProfile?.ghostForm || 'baby',
      ghostMood: userWithoutPassword.ghostProfile?.currentMood || 'happy',
      ghostColor: userWithoutPassword.ghostProfile?.glowColor || '#8B5CF6',
      primaryGoal: userWithoutPassword.ghostProfile?.mainFocusAreas?.[0] || null,
      strictnessLevel: userWithoutPassword.ghostProfile?.motivationStyle || null,
      productiveTime: null, // You may want to store this in ghostProfile
      feedbackStyle: userWithoutPassword.ghostProfile?.tone || null,
      mainStruggle: null, // Store this in ghostProfile if needed
      talkFrequency: null, // Store this in ghostProfile if needed
      voiceTriggerEnabled: true,
      offlineMode: true,
      notificationsEnabled: true,
      locationSharingEnabled: !!userWithoutPassword.communityZone,
      lastActive: userWithoutPassword.lastActive,
    };

    // Check if user needs onboarding (no mainFocusAreas set)
    const needsOnboarding = !userWithoutPassword.ghostProfile?.mainFocusAreas || 
                           userWithoutPassword.ghostProfile.mainFocusAreas.length === 0;

    return NextResponse.json({
      success: true,
      user: mappedUser,
      token,
      needsOnboarding,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}