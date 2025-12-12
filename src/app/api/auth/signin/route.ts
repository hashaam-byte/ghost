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

    // Find user with related data
    const user = await db.user.findUnique({
      where: { email },
      include: {
        ghostProfile: true,
        usageStats: true,
        leaderboardEntry: true,
      },
    });

    // Generic error message to prevent user enumeration
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

    // Update user status and last seen in transaction
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
          lastActive: new Date(),
          lastSyncAt: new Date(),
        },
      });

      // Update ghost profile last interaction
      if (user.ghostProfile) {
        await tx.ghostProfile.update({
          where: { userId: user.id },
          data: {
            lastInteraction: new Date(),
            totalInteractions: { increment: 1 },
          },
        });
      }

      // Reset daily login streak if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const loginStreak = await tx.streak.findUnique({
        where: {
          userId_type: {
            userId: user.id,
            type: 'daily_login',
          },
        },
      });

      if (loginStreak) {
        const lastUpdate = new Date(loginStreak.lastUpdated);
        lastUpdate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff === 1) {
          // Continue streak
          await tx.streak.update({
            where: {
              userId_type: {
                userId: user.id,
                type: 'daily_login',
              },
            },
            data: {
              count: { increment: 1 },
              bestStreak: loginStreak.count + 1 > loginStreak.bestStreak 
                ? { increment: 1 }
                : loginStreak.bestStreak,
              lastUpdated: new Date(),
              isActive: true,
            },
          });
        } else if (daysDiff > 1) {
          // Streak broken, reset
          await tx.streak.update({
            where: {
              userId_type: {
                userId: user.id,
                type: 'daily_login',
              },
            },
            data: {
              count: 1,
              lastUpdated: new Date(),
              isActive: true,
            },
          });
        }
        // If daysDiff === 0, same day login, do nothing
      }
    });

    // Fetch updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: user.id },
      include: {
        ghostProfile: true,
        usageStats: true,
        leaderboardEntry: true,
        streaks: {
          where: { type: 'daily_login' },
        },
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password) and token
    const { password: _, ...userWithoutPassword } = updatedUser || user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: 'Sign in successful',
    });

  } catch (error) {
    console.error('Sign in error:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { message: 'User account error. Please contact support.' },
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